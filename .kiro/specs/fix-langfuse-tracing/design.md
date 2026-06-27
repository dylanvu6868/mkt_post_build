# Design Document

## Overview

Fix 3 bug khiến Langfuse không nhận được log. Tất cả thay đổi nằm trong lớp tracing/observability. Không có thay đổi schema database hay business logic.

**Root cause:** Code dùng `langfuse_client.start_as_current_observation()` — API của SDK v3 — trong khi project pin `langfuse>=2.54.0` (SDK v2). Method này không tồn tại → AttributeError bị swallow → không có trace nào được gửi.

## Architecture

```
API Endpoint (chat/lab/generate)
    │
    ▼
trace_request() [tracing.py]          ← FIX: dùng langfuse_client.trace() (SDK v2)
    │ yields trace (có .id)
    ▼
get_langfuse_handler(trace_id)        ← MỚI: tạo per-request CallbackHandler
    │
    ▼
get_chat_model(tier, trace_id)        ← FIX: truyền trace_id xuống model
    │ model.with_config(callbacks=[handler])
    ▼
LangChain / LangGraph                 ← Auto-capture mọi LLM calls
    │
    ▼
Langfuse Dashboard                    ← Traces + child spans hiện đúng
```

## Components and Interfaces

### `tracing.py` — Module chính

**Thay đổi:**

`trace_request()` — dùng `langfuse_client.trace()` (SDK v2 API):
```python
@contextmanager
def trace_request(name, user_id=None, session_id=None, metadata=None):
    if not langfuse_client:
        yield None
        return
    trace = langfuse_client.trace(
        name=name,
        user_id=str(user_id) if user_id is not None else None,
        session_id=session_id,
        metadata=metadata or {},
    )
    yield trace  # caller dùng trace.id để link spans
```

`get_langfuse_handler(trace_id)` — function mới:
```python
def get_langfuse_handler(trace_id: str | None = None) -> CallbackHandler | None:
    """Tạo CallbackHandler với trace_id để link LangChain spans vào trace đúng."""
    if not CallbackHandler or not os.getenv("LANGFUSE_PUBLIC_KEY"):
        return None
    host = os.getenv("LANGFUSE_HOST", os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"))
    if trace_id:
        return CallbackHandler(host=host, trace_id=trace_id)
    return langfuse_handler  # fallback về global handler
```

### `factory.py` — LLM Factory

**Thay đổi:** Thêm `trace_id` param, dùng per-request handler khi có trace context:
```python
def get_chat_model(tier: str, max_tokens: int | None = None, trace_id: str | None = None) -> Any:
    # ... build model ...
    handler = get_langfuse_handler(trace_id) if trace_id else langfuse_handler
    if handler:
        chat_model = chat_model.with_config({"callbacks": [handler]})
    return chat_model
```

### `base.py` — Agent Base

**Thay đổi:** Bỏ manual Langfuse spans (dùng API sai), thêm `trace_id` param:
```python
async def generate_structured(
    tier, system, user, schema,
    trace_id: str | None = None,  # MỚI
) -> T:
    llm = get_chat_model(tier, trace_id=trace_id)  # truyền xuống
    # ... không còn start_as_current_observation ...
```

### `generation_service.py` — Background Task

**Thay đổi:** Lấy `user_id` từ state, tạo per-request handler với `trace_id`:
```python
async def run_generation_job(session_maker, job_id, initial_state):
    user_id = initial_state.get("user_id")
    with trace_request("generate.pipeline", user_id=user_id, ...) as trace:
        trace_id = trace.id if trace else None
        handler = get_langfuse_handler(trace_id)
        config = {"callbacks": [handler]} if handler else {}
        async for update in graph.astream(initial_state, config, ...):
            # ...
```

### `generate.py` — API Endpoint

**Thay đổi nhỏ:** Thêm `user_id` vào `initial_state`:
```python
initial_state = {
    "user_id": current_user.id,  # MỚI
    # ... các field khác giữ nguyên
}
```

### `main.py` — FastAPI App

**Thay đổi:** Thêm flush khi shutdown:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    if langfuse_client:
        langfuse_client.flush()
```

## Data Models

Không có thay đổi database schema.

**State flow thay đổi:**
- `GraphState` (LangGraph): không thay đổi cấu trúc, `user_id` được truyền qua `initial_state` nhưng không nhất thiết phải add vào TypedDict
- `initial_state` dict: thêm key `"user_id": int`

## Correctness Properties

### Property 1: Backward Compatibility

`get_chat_model("fast")` không có `trace_id` vẫn dùng global `langfuse_handler`, không break bất kỳ caller nào hiện tại.

**Validates: Requirements 2**

### Property 2: Thread Safety

Mỗi request tạo `CallbackHandler` riêng với `trace_id`, không có shared mutable state giữa concurrent requests.

**Validates: Requirements 3, 4**

### Property 3: Graceful Degradation

Nếu Langfuse không được cấu hình (env vars trống), mọi code path hoạt động bình thường, không raise exception.

**Validates: Requirements 1, 6**

## Error Handling

- `trace_request()` không throw exception khi Langfuse unreachable — SDK v2 buffer và retry internally
- `get_langfuse_handler()` trả None khi env vars không set — caller kiểm tra trước khi dùng
- `langfuse_client.flush()` tại shutdown — không block indefinitely, SDK có timeout mặc định

## Testing Strategy

Manual verification sau khi deploy:
1. Gọi `POST /api/lab/shield` → kiểm tra Langfuse dashboard có trace `lab.shield`
2. Gọi `POST /generate` → kiểm tra trace `generate.pipeline` có `user_id` và child spans từ LangGraph nodes
3. Gửi chat message → kiểm tra trace `chat.stream` và `chat.guard`
4. Kiểm tra không có `AttributeError: 'Langfuse' object has no attribute 'start_as_current_observation'` trong server logs

Automated: các tests hiện tại không nên bị break vì interface công khai không thay đổi.
