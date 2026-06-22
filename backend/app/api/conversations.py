from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import check_conversation_limit, upgrade_message
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    result = await session.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.is_pinned), desc(Conversation.updated_at))
        .limit(limit)
        .offset(offset)
    )
    conversations = result.scalars().all()
    if not conversations:
        return []

    conv_ids = [c.id for c in conversations]

    latest_sub = (
        select(
            Message.conversation_id,
            func.max(Message.id).label("max_id"),
        )
        .where(Message.conversation_id.in_(conv_ids))
        .group_by(Message.conversation_id)
        .subquery()
    )
    last_msgs_result = await session.execute(
        select(Message.conversation_id, Message.content)
        .join(latest_sub, Message.id == latest_sub.c.max_id)
    )
    last_msg_map: dict[int, str | None] = {}
    for row in last_msgs_result:
        last_msg_map[row.conversation_id] = row.content[:100] if row.content else None

    response = []
    for conv in conversations:
        resp = ConversationResponse.model_validate(conv)
        resp.last_message = last_msg_map.get(conv.id)
        response.append(resp)

    return response


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    allowed, used, limit = await check_conversation_limit(session, current_user)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Bạn đã dùng hết {limit} cuộc trò chuyện ({used}/{limit}). "
                + upgrade_message("tạo thêm cuộc trò chuyện")
            ),
        )

    conv = Conversation(
        user_id=current_user.id,
        title=payload.title,
        folder=payload.folder,
    )
    session.add(conv)
    await session.commit()
    await session.refresh(conv)
    resp = ConversationResponse.model_validate(conv)
    resp.last_message = None
    return resp


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if payload.title is not None:
        conv.title = payload.title
    if payload.folder is not None:
        conv.folder = payload.folder
    if payload.is_pinned is not None:
        conv.is_pinned = payload.is_pinned
    await session.commit()
    await session.refresh(conv)
    return ConversationResponse.model_validate(conv)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await session.delete(conv)
    await session.commit()


@router.get("/search", response_model=list[ConversationResponse])
async def search_conversations(
    q: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Conversation)
        .where(
            Conversation.user_id == current_user.id,
            Conversation.title.ilike(f"%{q}%"),
        )
        .order_by(desc(Conversation.updated_at))
        .limit(20)
    )
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]


@router.get("/folders", response_model=list[str])
async def list_folders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Conversation.folder)
        .where(
            Conversation.user_id == current_user.id,
            Conversation.folder.isnot(None),
        )
        .distinct()
    )
    return [row for row in result.scalars().all()]


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return result.scalars().all()


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def save_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=payload.content,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return msg
