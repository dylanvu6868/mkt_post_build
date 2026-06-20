import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.core.plan_limits import get_limits, get_user_plan
from app.llm.factory import get_chat_model, provider_available
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.conversation import MessageCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """Bạn là một trợ lý AI Marketing chuyên nghiệp. Nhiệm vụ của bạn là giúp người dùng tạo nội dung marketing chất lượng cao thông qua trò chuyện.

## Nguyên tắc TỐC ĐỘ LÀ TRÊN HẾT:
- Nếu người dùng đã cung cấp đủ: loại nội dung + sản phẩm/dịch vụ → GENERATE NGAY LẬP TỨC, không hỏi thêm.
- Nếu thiếu loại nội dung HOẶC sản phẩm → hỏi TỐI ĐA 1 câu rồi generate.
- Nếu người dùng nói "viết luôn", "viết ngay", "generate", "tạo ngay" → generate NGAY, không hỏi gì thêm.

## Cách kích hoạt hệ thống sinh nội dung:
Trả về khối JSON đặc biệt:
```generate
{"content_type": "facebook_post", "brief": "mô tả ngắn gọn yêu cầu", "marketing_goal": "mục tiêu marketing"}
```

Các content_type hợp lệ: facebook_post, seo_blog, email, landing_page, tiktok_script, marketing_plan

## Cách xác định content_type từ ngữ cảnh:
- "facebook", "fb", "post", "bài đăng", "fanpage" → facebook_post
- "blog", "SEO", "bài viết web" → seo_blog
- "email", "thư", "newsletter" → email
- "landing page", "trang đích" → landing_page
- "tiktok", "video ngắn", "reels", "kịch bản" → tiktok_script
- "kế hoạch", "chiến dịch", "campaign", "marketing plan" → marketing_plan

## Sau khi generate:
- Hỏi người dùng có muốn chỉnh sửa gì không (giọng điệu, CTA, hashtag, v.v.)
- Nếu muốn chỉnh → generate lại với brief cập nhật

## Quy tắc:
- KHÔNG BAO GIỜ tự viết bài trong chat. LUÔN dùng khối ```generate``` để hệ thống AI agents làm việc đó.
- Luôn giao tiếp bằng tiếng Việt, ngắn gọn, thân thiện.
- BẮT BUỘC cung cấp 4 suggestion chips cá nhân hóa theo ngữ cảnh ở cuối mỗi phản hồi:
```suggestions
["Gợi ý 1", "Gợi ý 2", "Gợi ý 3", "Gợi ý 4"]
```
"""


def _build_system_prompt(user: User) -> str:
    plan = get_user_plan(user)
    allowed = ", ".join(sorted(get_limits(user)["content_types"]))
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"## Giới hạn gói {plan.upper()} của người dùng hiện tại:\n"
        f"- Chỉ được dùng khối ```generate``` với content_type thuộc: {allowed}\n"
        "- Nếu người dùng yêu cầu loại nội dung KHÔNG có trong danh sách trên, "
        "KHÔNG dùng ```generate```. Hãy trả lời thân thiện: "
        '"Tính năng này cần gói Pro hoặc Max. Bạn vui lòng nâng cấp gói tại trang Pricing để sử dụng."\n'
        "- Nếu người dùng hết lượt tạo trong ngày, thông báo nâng cấp gói thay vì generate."
    )


async def _build_messages(session: AsyncSession, conversation_id: int, limit: int = 12):
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [{"role": m.role, "content": m.content} for m in messages]


async def _stream_llm(chat_messages: list[dict]):
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    model = get_chat_model("fast")
    lc_messages = []
    for m in chat_messages:
        if m["role"] == "system":
            lc_messages.append(SystemMessage(content=m["content"]))
        elif m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        else:
            lc_messages.append(AIMessage(content=m["content"]))

    full_response = ""
    async for chunk in model.astream(lc_messages):
        token = chunk.content
        if token:
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


SUGGESTION_FLOWS: dict[str, dict] = {
    "start": {
        "response": "Chào bạn! Tôi là AI Marketing Assistant. Bạn muốn tạo loại content nào?",
        "suggestions": ["Facebook Post", "SEO Blog", "Landing Page", "Marketing Plan"],
    },
    "facebook": {
        "response": "Tuyệt! Bạn muốn viết Facebook post về sản phẩm/dịch vụ gì?",
        "suggestions": ["Giới thiệu sản phẩm mới", "Khuyến mãi/Sale", "Chia sẻ kiến thức ngành", "Minigame/Tương tác"],
    },
    "blog": {
        "response": "OK! Bài blog SEO về chủ đề gì?",
        "suggestions": ["Hướng dẫn chi tiết (How-to)", "Đánh giá/So sánh sản phẩm", "Xu hướng ngành nghề", "Phân tích Case study"],
    },
    "email": {
        "response": "Được! Mục đích email là gì?",
        "suggestions": ["Chào mừng người dùng mới", "Kích hoạt lại khách hàng cũ", "Báo giá/Giới thiệu dịch vụ", "Newsletter định kỳ"],
    },
    "tiktok": {
        "response": "Cool! Video TikTok theo phong cách nào?",
        "suggestions": ["Review chân thực", "Kể chuyện (Storytelling)", "Chia sẻ mẹo vặt", "Bắt trend/Thử thách"],
    },
    "landing": {
        "response": "Landing page cho mục tiêu nào?",
        "suggestions": ["Thu thập data khách hàng", "Bán hàng chốt sale", "Đăng ký khóa học/dịch vụ", "Tải tài liệu/Ebook"],
    },
    "marketing_plan": {
        "response": "Bạn muốn lập Kế hoạch Marketing cho mảng nào?",
        "suggestions": ["Kế hoạch Launching sản phẩm mới", "Kế hoạch Branding tổng thể", "Kế hoạch Social Media 3 tháng", "Kế hoạch Performance Marketing"],
    },
    "goal": {
        "response": "Mục tiêu marketing chính là gì?",
        "suggestions": ["Tăng cường nhận diện", "Kích thích bình luận/chia sẻ", "Tạo chuyển đổi mua hàng", "Nuôi dưỡng khách hàng tiềm năng"],
    },
    "tone": {
        "response": "Bạn muốn giọng văn như thế nào?",
        "suggestions": ["Chuyên nghiệp & Đáng tin cậy", "Thân thiện & Đồng cảm", "Hài hước & Bắt trend", "Truyền cảm hứng & Mạnh mẽ"],
    },
    "audience": {
        "response": "Đối tượng khách hàng mục tiêu là ai?",
        "suggestions": ["Gen Z năng động (18-25)", "Người đi làm (25-35)", "Phụ huynh có con nhỏ", "Chủ doanh nghiệp (B2B)"],
    },
}


def _detect_flow(chat_messages: list[dict]) -> str:
    msg_count = sum(1 for m in chat_messages if m["role"] == "user")
    if msg_count <= 1:
        return "start"

    last_user = ""
    for m in reversed(chat_messages):
        if m["role"] == "user":
            last_user = m["content"].lower()
            break

    if any(kw in last_user for kw in ["facebook", "fb"]):
        return "facebook"
    if any(kw in last_user for kw in ["blog", "seo"]):
        return "blog"
    if any(kw in last_user for kw in ["email"]):
        return "email"
    if any(kw in last_user for kw in ["tiktok", "video"]):
        return "tiktok"
    if any(kw in last_user for kw in ["landing", "page"]):
        return "landing"
    if any(kw in last_user for kw in ["marketing plan", "kế hoạch", "plan"]):
        return "marketing_plan"

    if msg_count == 3:
        return "goal"
    if msg_count == 4:
        return "audience"
    if msg_count == 5:
        return "tone"

    return "start"


async def _mock_stream(chat_messages: list[dict]):
    flow_key = _detect_flow(chat_messages)
    flow = SUGGESTION_FLOWS.get(flow_key, SUGGESTION_FLOWS["start"])
    mock_response = flow["response"]

    for char in mock_response:
        yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
    yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': flow['suggestions']})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': mock_response})}\n\n"


@router.post("/{conversation_id}/send")
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    session_maker: async_sessionmaker[AsyncSession] = Depends(get_session_maker),
):
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=payload.content,
    )
    session.add(user_msg)

    if conv.title == "New conversation":
        conv.title = payload.content[:50]

    await session.commit()

    history = await _build_messages(session, conversation_id)
    chat_messages = [{"role": "system", "content": _build_system_prompt(current_user)}] + history

    async def event_stream():
        full_response = ""
        stream = _stream_llm(chat_messages) if provider_available() else _mock_stream(chat_messages)
        async for event in stream:
            if '"type": "done"' in event or '"type":"done"' in event:
                data = json.loads(event.replace("data: ", "").strip())
                full_response = data["content"]
            yield event

        async with session_maker() as save_session:
            ai_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
            )
            save_session.add(ai_msg)
            await save_session.commit()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
