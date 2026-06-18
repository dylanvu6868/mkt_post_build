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

SYSTEM_PROMPT = """You are a marketing AI assistant. Your job is to help users create high-quality marketing content through conversation.

## How you work:
1. When a user wants to create content, ask Socratic questions to understand their needs:
   - What type of content? (Facebook post, SEO blog, email, landing page, TikTok script)
   - What product/service is this for?
   - Who is the target audience?
   - What is the marketing goal? (awareness, engagement, conversion, retention)
   - What tone/style do they prefer?
   - Any specific points to include or avoid?

2. Ask ONE question at a time. Keep your questions short and friendly.

3. When you have enough information, confirm with the user before generating.

4. When the user confirms, respond with a special JSON block to trigger content generation:
   ```generate
   {"content_type": "facebook_post", "brief": "...", "marketing_goal": "..."}
   ```

5. You can also help with:
   - Explaining marketing concepts
   - Suggesting content strategies
   - Reviewing and improving existing content
   - Brainstorming campaign ideas

6. After each response, suggest 2-4 quick reply options for the user. Format them as a JSON block:
   ```suggestions
   ["Option 1", "Option 2", "Option 3"]
   ```

## Rules:
- Always respond in the same language the user uses
- Be concise and helpful
- Don't generate content without confirming with the user first
- If the user says "viết bài" or "write", start gathering information
- Always include suggestion chips to guide the conversation
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
        "suggestions": ["Facebook Post", "SEO Blog", "Email Marketing", "Landing Page", "TikTok Script"],
    },
    "facebook": {
        "response": "Tuyệt! Bạn muốn viết Facebook post về sản phẩm/dịch vụ gì?",
        "suggestions": ["Giới thiệu sản phẩm mới", "Khuyến mãi/Sale", "Chia sẻ kiến thức", "Event/Sự kiện"],
    },
    "blog": {
        "response": "OK! Bài blog SEO về chủ đề gì?",
        "suggestions": ["Hướng dẫn/How-to", "So sánh sản phẩm", "Xu hướng ngành", "Case study"],
    },
    "email": {
        "response": "Được! Mục đích email là gì?",
        "suggestions": ["Giới thiệu sản phẩm", "Khuyến mãi", "Follow-up", "Newsletter"],
    },
    "tiktok": {
        "response": "Cool! Video TikTok theo phong cách nào?",
        "suggestions": ["Review sản phẩm", "Behind the scenes", "Tips & tricks", "Trending challenge"],
    },
    "landing": {
        "response": "Landing page cho mục tiêu nào?",
        "suggestions": ["Thu thập lead", "Bán hàng trực tiếp", "Đăng ký dịch vụ", "Download tài liệu"],
    },
    "goal": {
        "response": "Mục tiêu marketing chính là gì?",
        "suggestions": ["Tăng nhận diện thương hiệu", "Tăng tương tác", "Tăng chuyển đổi/mua hàng", "Giữ chân khách hàng"],
    },
    "tone": {
        "response": "Bạn muốn giọng văn như thế nào?",
        "suggestions": ["Chuyên nghiệp", "Thân thiện, gần gũi", "Hài hước, sáng tạo", "Sang trọng, cao cấp"],
    },
    "audience": {
        "response": "Đối tượng khách hàng mục tiêu là ai?",
        "suggestions": ["Gen Z (18-25)", "Millennials (25-35)", "Phụ huynh", "Doanh nghiệp B2B"],
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
