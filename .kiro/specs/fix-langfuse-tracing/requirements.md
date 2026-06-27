# Requirements Document

## Introduction

Langfuse hiện không hiển thị log của agent và tool. Nguyên nhân là code đang gọi API của Langfuse SDK v3 (`start_as_current_observation`) trong khi project đang dùng SDK v2 (`langfuse>=2.54.0`). Kết quả là mọi `trace_request()` call đều bị lỗi im lặng — không có trace nào được gửi lên Langfuse.

Spec này fix 3 bug cốt lõi để mọi AI call (chat, lab, generate pipeline) đều visible trong Langfuse dashboard.

## Requirements

### REQ-1: Fix `trace_request()` dùng đúng Langfuse SDK v2 API

**Mô tả:** `trace_request()` trong `tracing.py` hiện gọi `langfuse_client.start_as_current_observation()` — method này không tồn tại trong SDK v2. Cần chuyển sang `langfuse_client.trace()` là API đúng của v2.

**Acceptance criteria:**
- `trace_request()` dùng `langfuse_client.trace(name, user_id, session_id, metadata)` để tạo trace
- Hàm yield trace object (có `.id` attribute) để caller có thể link child spans
- Khi `langfuse_client` là None, yield None mà không raise exception
- Trace phải xuất hiện trong Langfuse dashboard sau khi fix

### REQ-2: Fix `generate_structured()` không dùng API sai

**Mô tả:** `base.py` hiện dùng `langfuse_client.start_as_current_observation()` để tạo generation span. Cần bỏ manual span tracking vì `langfuse_handler` (LangChain callback) đã được attach vào model trong `factory.py` và tự động capture mọi LLM call.

**Acceptance criteria:**
- Bỏ toàn bộ `start_as_current_observation` blocks trong `base.py`
- `generate_structured()` vẫn hoạt động bình thường (không break)
- LLM calls trong `generate_structured()` được capture tự động qua `langfuse_handler` callback

### REQ-3: Link LangGraph pipeline spans vào đúng trace cha

**Mô tả:** Khi `run_generation_job` tạo trace, các LangChain calls bên trong LangGraph (8 nodes: planner, research, seo, brand, fusion, copywriter, reviewer, formatter) cần được nest đúng dưới trace đó. SDK v2 `CallbackHandler` hỗ trợ `trace_id` param để linking.

**Acceptance criteria:**
- `run_generation_job` truyền `trace_id` (từ trace object) vào config của LangGraph `astream()`
- Tất cả 8 LangGraph nodes xuất hiện là child spans dưới trace `generate.pipeline`
- `user_id` từ `initial_state` được set trên trace (không để trống)

### REQ-4: Link Lab agent spans vào đúng trace cha

**Mô tả:** Khi `_run_tool` trong `lab.py` tạo trace, các LLM calls trong agent function cần được capture với trace context.

**Acceptance criteria:**
- `get_langfuse_handler(trace_id)` function được tạo trong `tracing.py`
- Lab tool LLM calls xuất hiện trong Langfuse (dù không nested trong phase này)

### REQ-5: Thêm `user_id` vào generate pipeline trace

**Mô tả:** `run_generation_job` là background task không có access trực tiếp đến `user_id`. Cần truyền `user_id` qua `initial_state` để trace có thể filter theo user trong Langfuse.

**Acceptance criteria:**
- `initial_state` trong `generate.py` bao gồm `user_id`
- `run_generation_job` đọc `user_id` từ `initial_state` và truyền vào `trace_request()`

### REQ-6: Flush Langfuse buffer khi server shutdown

**Mô tả:** Langfuse SDK v2 buffer các events trước khi gửi. Nếu server shutdown đột ngột, buffer bị mất. Cần gọi `langfuse_client.flush()` khi FastAPI shutdown.

**Acceptance criteria:**
- FastAPI lifespan event gọi `langfuse_client.flush()` khi shutdown
- Khi `langfuse_client` là None, không có lỗi

## Glossary

| Thuật ngữ | Ý nghĩa |
|---|---|
| SDK v2 | Langfuse Python SDK version 2.x (`langfuse>=2.54.0`) |
| SDK v3 | Langfuse Python SDK version 3.x (API khác, không được dùng trong project này) |
| `trace_request()` | Context manager tạo Langfuse trace cho một AI request |
| `CallbackHandler` | LangChain callback tự động capture LLM calls vào Langfuse |
| `trace_id` | ID của trace để link child spans |
| span | Một observation con dưới trace (ví dụ: một LLM call) |
