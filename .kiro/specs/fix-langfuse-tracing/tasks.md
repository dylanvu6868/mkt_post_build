# Implementation Plan: Fix Langfuse Tracing

## Overview

6 tasks tuần tự fix các bug Langfuse từ gốc ra ngoài. Task 1-2 là core fix, Task 3-6 là integration.

## Tasks

- [x] 1. Fix `tracing.py` — Dùng đúng Langfuse SDK v2 API và thêm `get_langfuse_handler()`
  - Thay `trace_request()`: bỏ `langfuse_client.start_as_current_observation()`, thay bằng `langfuse_client.trace(name, user_id, session_id, metadata)` trả về trace object
  - `trace_request()` yield trace object (có `.id`) thay vì yield kết quả của context manager
  - Thêm function `get_langfuse_handler(trace_id: str | None = None) -> CallbackHandler | None`: nếu có `trace_id` tạo `CallbackHandler(host=host, trace_id=trace_id)`, nếu không fallback về global `langfuse_handler`
  - File: `backend/app/core/tracing.py`

- [x] 2. Fix `base.py` — Bỏ manual Langfuse spans, thêm `trace_id` param vào `generate_structured()`
  - Xóa toàn bộ 2 `if langfuse_client:` blocks với `start_as_current_observation` (primary và fallback)
  - Thêm param `trace_id: str | None = None` vào signature của `generate_structured()`
  - Truyền `trace_id=trace_id` xuống `get_chat_model(tier, trace_id=trace_id)`
  - File: `backend/app/agents/base.py`
  - Phụ thuộc: Task 1

- [x] 3. Fix `factory.py` — Thêm `trace_id` param vào `get_chat_model()`
  - Thêm param `trace_id: str | None = None` vào `get_chat_model()`
  - Import `get_langfuse_handler` từ `tracing.py`
  - Thay `if langfuse_handler:` bằng: `handler = get_langfuse_handler(trace_id) if trace_id else langfuse_handler`
  - Dùng `handler` thay vì `langfuse_handler` trực tiếp
  - File: `backend/app/llm/factory.py`
  - Phụ thuộc: Task 1

- [x] 4. Fix `generation_service.py` — Truyền `user_id` vào trace và `trace_id` vào LangGraph config
  - Đọc `user_id = initial_state.get("user_id")` trước khi gọi `trace_request()`
  - Thêm `user_id=user_id` vào `trace_request()` call
  - Sau khi vào context: `trace_id = trace.id if trace else None`
  - Import `get_langfuse_handler` từ `tracing.py`
  - Tạo `handler = get_langfuse_handler(trace_id)` và `config = {"callbacks": [handler]} if handler else {}`
  - Truyền `config` vào `graph.astream(initial_state, config, stream_mode="updates")`
  - File: `backend/app/services/generation_service.py`
  - Phụ thuộc: Task 1

- [x] 5. Fix `generate.py` — Thêm `user_id` vào `initial_state`
  - Thêm `"user_id": current_user.id` vào dict `initial_state` trong `start_generation()`
  - File: `backend/app/api/generate.py`
  - Phụ thuộc: Task 4

- [x] 6. Thêm Langfuse flush khi FastAPI shutdown trong `main.py`
  - Đọc `main.py` để hiểu app setup hiện tại (có `lifespan` chưa, hay dùng `on_event`)
  - Nếu đã có `lifespan`: thêm `if langfuse_client: langfuse_client.flush()` vào phần after `yield`
  - Nếu chưa có `lifespan`: chuyển sang pattern `@asynccontextmanager async def lifespan(app)` với flush sau `yield`, pass `lifespan=lifespan` vào `FastAPI()`
  - Import `langfuse_client` từ `app.core.tracing`
  - File: `backend/app/main.py`
  - Phụ thuộc: Task 1

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4", "6"] },
    { "wave": 3, "tasks": ["5"] }
  ]
}
```

Task 1 phải hoàn thành trước. Tasks 2, 3, 4, 6 độc lập với nhau — chạy song song ở wave 2. Task 5 phụ thuộc Task 4.

## Notes

- **Không nâng cấp langfuse lên v3** — giữ nguyên `langfuse>=2.54.0` trong requirements.txt
- **Lab agents (22 functions)**: không thay đổi signature — sẽ được capture qua global `langfuse_handler`, không nested dưới trace trong phase này
- **Backward compat**: `get_chat_model("fast")` không có `trace_id` vẫn hoạt động như cũ
- **Thread safety**: mỗi request tạo `CallbackHandler` riêng với `trace_id` — an toàn concurrent
