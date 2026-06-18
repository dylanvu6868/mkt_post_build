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

## Rules:
- Always respond in the same language the user uses
- Be concise and helpful
- Don't generate content without confirming with the user first
- If the user says "viết bài" or "write", start gathering information
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

    yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"


async def _mock_stream(chat_messages: list[dict]):
    last_user_msg = ""
    for m in reversed(chat_messages):
        if m["role"] == "user":
            last_user_msg = m["content"]
            break

    mock_response = (
        "Chào bạn! Tôi là AI Marketing Assistant. "
        "Bạn muốn tạo loại content nào? "
        "(Facebook post, SEO blog, Email, Landing page, TikTok script)"
    )

    lower = last_user_msg.lower()
    if any(kw in lower for kw in ["facebook", "fb"]):
        mock_response = "Tuyệt! Bạn muốn viết Facebook post về sản phẩm/dịch vụ gì?"
    elif any(kw in lower for kw in ["blog", "seo"]):
        mock_response = "OK! Chủ đề bài blog SEO là gì? Và đối tượng độc giả là ai?"
    elif any(kw in lower for kw in ["email"]):
        mock_response = "Được! Email này gửi cho ai? Và mục đích là gì (giới thiệu, khuyến mãi, follow-up)?"
    elif any(kw in lower for kw in ["tiktok", "video"]):
        mock_response = "Cool! Video TikTok về chủ đề gì? Thời lượng bao lâu?"
    elif any(kw in lower for kw in ["landing", "page"]):
        mock_response = "Landing page cho sản phẩm/dịch vụ nào? Mục tiêu chính là gì?"

    for char in mock_response:
        yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
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
