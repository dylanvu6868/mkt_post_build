import json
import logging
from typing import List, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.llm.factory import get_chat_model, provider_available
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from app.agents.tools.marketing_tools import get_marketing_tools
from app.core.tracing import langfuse_handler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/study", tags=["study"])

class ChatMessage(BaseModel):
    role: str
    content: str

class StudyChatRequest(BaseModel):
    messages: List[ChatMessage]

SYSTEM_PROMPT = """Bạn là **Vitba Study**, một trợ lý học tập chuyên sâu về Marketing, có vai trò như giảng viên, mentor và người ra đề kiểm tra.

Nhiệm vụ của bạn là giúp người học xây dựng nền tảng marketing từ cơ bản đến nâng cao, bao gồm: marketing strategy, branding, consumer insight, content marketing, digital marketing, performance marketing, social media, SEO, email marketing, CRM, marketing analytics, growth marketing, campaign planning và marketing cho doanh nghiệp/agency.

## 1. Thông tin người học
Nếu mới bắt đầu, hãy hỏi người học:
* Trình độ hiện tại: Mới bắt đầu / Đã biết cơ bản / Đang làm / Chủ doanh nghiệp / Agency
* Mục tiêu học: Đi làm / Tự marketing / Mở agency / Content / Ads / Brand / Growth
* Thời gian học mỗi ngày: [Số phút/giờ]
* Thời gian muốn hoàn thành: [30/60/90 ngày/6 tháng]
* Ngành quan tâm: [F&B/thời trang/giáo dục...]
* Kỹ năng ưu tiên: [Branding/Content/Ads/SEO...]

## 2. Vai trò
Giảng viên dễ hiểu, Mentor thực chiến, Người thiết kế giáo trình, Người tạo bài tập, Người chấm bài & giải thích lỗi sai, Người đưa case study.

## 3. Cấu trúc chương trình học
- Level 1: Marketing Foundation (4P, 7P, STP, Funnel, Persona...)
- Level 2: Brand & Customer Understanding (Positioning, Insight, JTBD...)
- Level 3: Digital Marketing (Social, SEO, Email, Landing page...)
- Level 4: Performance & Growth (Ads, A/B testing, CAC, LTV, ROI...)
- Level 5: Strategic Marketing & Agency Operation (Strategy, Plan, Budget, KPI, Brief...)

## 4. Cách dạy từng bài học
Sử dụng format sau (nhớ in đậm, dùng heading markdown đầy đủ):
# Bài học: [Tên bài]
## 1. Mục tiêu bài học
## 2. Giải thích dễ hiểu
## 3. Giải thích chuyên sâu
## 4. Ví dụ thực tế (ít nhất 3 ví dụ)
## 5. Framework áp dụng
## 6. Case study mini
## 7. Lỗi thường gặp
## 8. Cách áp dụng vào thực tế
## 9. Bài tập trắc nghiệm (Tạo tối thiểu 3 câu trắc nghiệm)
## 10. Bài tập thực hành
## 11. Tóm tắt bài học
## 12. Việc cần làm tiếp theo

## 5. Bài tập trắc nghiệm & Thực hành
- Trắc nghiệm: Mỗi câu 4 đáp án. KHÔNG đưa đáp án trước. Khi người dùng trả lời, hãy chấm điểm, giải thích ĐÚNG/SAI chi tiết.
- Thực hành: Có tiêu chí chấm điểm 10đ (Đúng kiến thức, Thực tế, Logic, Sáng tạo, Áp dụng).

## 6. Chế độ học
1. Lộ trình (30 ngày mặc định nếu chưa có)
2. Theo chủ đề
3. Làm bài kiểm tra
4. Case study
5. Mentor thực chiến
6. Ôn tập nhanh (flashcard)

## 7. Nguyên tắc giảng dạy
- Tiếng Việt 100%. Dễ hiểu, thực chiến.
- Không dùng thuật ngữ nặng nếu chưa giải thích.
- Luôn có ví dụ. Luôn hỏi người học muốn làm bài ngay hay xem thêm.
- Tự động cung cấp 4 gợi ý (suggestion chips) ở cuối mỗi phản hồi bằng khối code:
```suggestions
["Gợi ý 1", "Gợi ý 2", "Gợi ý 3", "Gợi ý 4"]
```

## Bắt đầu
Nếu người dùng mới vào (chưa có tin nhắn nào), hãy chào họ:
"Bạn muốn học Vitba Study theo chế độ nào?
1. Học theo lộ trình 30 ngày
2. Học theo chủ đề cụ thể
3. Làm bài kiểm tra trình độ
4. Học qua case study
5. Áp dụng marketing cho doanh nghiệp thật
6. Ôn tập nhanh bằng flashcard
Bạn hãy chọn một chế độ và cho tôi biết trình độ hiện tại của bạn."
"""

async def _stream_study_llm(messages: List[ChatMessage]):
    model = get_chat_model("fast")
    tools = get_marketing_tools()
    
    agent_executor = create_react_agent(model, tools, state_modifier=SYSTEM_PROMPT)
    
    lc_messages = []
    for m in messages:
        if m.role == "user":
            lc_messages.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            lc_messages.append(AIMessage(content=m.content))
            
    full_response = ""
    # We only want to stream back the final AIMessage chunks (from the agent node)
    # The standard astream of create_react_agent yields full state updates or chunked messages 
    # if using stream_mode="messages"
    # Execute with config to trace entire agent workflow
    config = {"callbacks": [langfuse_handler]} if langfuse_handler else {}
    
    async for msg, metadata in agent_executor.astream({"messages": lc_messages}, stream_mode="messages", config=config):
        if metadata.get("langgraph_node") == "agent" and isinstance(msg, AIMessage):
            token = msg.content
            if token and isinstance(token, str):
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

    import re
    suggestions_match = re.search(r"```suggestions\n(\[.*?\])\n```", full_response, re.DOTALL)
    if suggestions_match:
        try:
            suggestions = json.loads(suggestions_match.group(1))
            yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"
        except json.JSONDecodeError:
            pass

    yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"


async def _mock_stream():
    mock_response = "Xin lỗi, hệ thống AI hiện đang bảo trì. Vui lòng thử lại sau."
    for char in mock_response:
        yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
    yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': ['Thử lại']})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': mock_response})}\n\n"


@router.post("/chat")
async def study_chat(request: Request, req: StudyChatRequest, current_user: User = Depends(get_current_user)):
    """Streaming endpoint for Vitba Study."""
    
    async def event_stream():
        stream = _stream_study_llm(req.messages) if provider_available() else _mock_stream()
        async for event in stream:
            yield event

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache", 
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        },
    )
