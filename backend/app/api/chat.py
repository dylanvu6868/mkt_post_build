import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.llm.factory import get_chat_model, provider_available
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.conversation import MessageCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """Bạn là một trợ lý AI Marketing chuyên nghiệp. Nhiệm vụ của bạn là giúp người dùng tạo nội dung marketing chất lượng cao thông qua trò chuyện.

## Cách thức hoạt động:
1. Khi người dùng muốn tạo nội dung, hãy đặt câu hỏi (Socratic) để hiểu rõ nhu cầu của họ:
   - Loại nội dung là gì? (Facebook post, SEO blog, email, landing page, TikTok script)
   - Sản phẩm/dịch vụ là gì?
   - Đối tượng khách hàng mục tiêu là ai?
   - Mục tiêu marketing là gì? (nhận diện thương hiệu, tương tác, chuyển đổi, giữ chân khách hàng)
   - Giọng điệu (tone/style) mong muốn là gì?
   - Có điểm gì cụ thể cần thêm vào hay tránh không?

2. Đặt MỘT câu hỏi mỗi lần. Giữ cho câu hỏi ngắn gọn, chuyên nghiệp và thân thiện.

3. Khi bạn đã thu thập đủ thông tin, hãy xác nhận lại với người dùng trước khi tiến hành viết.

4. Khi người dùng đồng ý viết HOẶC yêu cầu viết lại/chỉnh sửa bài, hãy trả về một khối JSON đặc biệt để kích hoạt hệ thống tự động sinh nội dung:
   ```generate
   {"content_type": "facebook_post", "brief": "...", "marketing_goal": "..."}
   ```

5. Trách nhiệm cốt lõi của bạn:
   - Đưa ra định hướng chiến lược.
   - Gợi ý những cấu trúc, cách thức tối ưu nhất cho nội dung.
   - KHÔNG BAO GIỜ tự viết hoặc tự sửa bài trực tiếp trong khung chat. Phải luôn dùng khối `generate` để hệ thống làm việc đó.

6. BẮT BUỘC SAU MỖI CÂU TRẢ LỜI: Bạn PHẢI gợi ý CHÍNH XÁC 4 lựa chọn (suggestions) cho người dùng để họ có thể bấm chọn ngay. 
   - QUAN TRỌNG: 4 lựa chọn này KHÔNG ĐƯỢC LÀ CÁC MẪU CÓ SẴN HAY CHUNG CHUNG. Chúng phải được tùy biến, cá nhân hóa linh hoạt và tối ưu dựa vào ĐÚNG ngữ cảnh, sản phẩm và nội dung mà người dùng vừa nhập.
   - Ví dụ: Nếu người dùng nói bán "Trà sữa", bạn không gợi ý "Viết bài Facebook" chung chung, mà phải gợi ý "Facebook Post: Bắt trend trà sữa mùa hè", "Tiktok Video: Review menu mới", "Giọng điệu: GenZ hài hước", v.v.
   - Định dạng chúng trong một khối JSON như sau:
   ```suggestions
   ["Gợi ý cá nhân hóa 1", "Gợi ý cá nhân hóa 2", "Gợi ý cá nhân hóa 3", "Gợi ý cá nhân hóa 4"]
   ```

## Quy tắc (Rules):
- Luôn luôn giao tiếp bằng tiếng Việt chuyên nghiệp.
- Ngắn gọn, súc tích và hữu ích.
- KHÔNG BAO GIỜ tự viết bài khi chưa xác nhận xong với người dùng.
- Bắt buộc luôn cung cấp 4 suggestion chips (bằng JSON) ở cuối mỗi phản hồi để định hướng cuộc hội thoại.
"""


async def _build_messages(session: AsyncSession, conversation_id: int, limit: int = 20):
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
    chat_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

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
