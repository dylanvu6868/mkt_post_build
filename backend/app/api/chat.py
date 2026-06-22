import asyncio
import base64
import io
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_session, get_session_maker
from app.core.plan_limits import get_limits, get_user_plan
from app.llm.factory import get_chat_model, provider_available
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.conversation import MessageCreate
from app.models.project import Project
from app.agents.guard import run_guard_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """Bạn là trợ lý AI Marketing chuyên nghiệp của Vitba AI. Nhiệm vụ: giúp người dùng tạo nội dung marketing chất lượng cao qua trò chuyện.

## Nguyên tắc TỐC ĐỘ LÀ TRÊN HẾT:
- Nếu người dùng đã cung cấp đủ: loại nội dung + sản phẩm/dịch vụ → GENERATE NGAY LẬP TỨC, không hỏi thêm.
- Nếu thiếu loại nội dung HOẶC sản phẩm → hỏi TỐI ĐA 1 câu rồi generate.
- Nếu người dùng nói "viết luôn", "viết ngay", "generate", "tạo ngay" → generate NGAY, không hỏi gì thêm.

## Cách kích hoạt hệ thống sinh nội dung:
Trả về khối JSON đặc biệt với ĐẦY ĐỦ thông tin thu thập được:
```generate
{"content_type": "facebook_post", "brief": "mô tả CHI TIẾT yêu cầu, bao gồm thông tin sản phẩm, USP, đặc điểm nổi bật", "marketing_goal": "mục tiêu marketing cụ thể", "industry": "ngành nghề nếu biết", "target_audience": "đối tượng khách hàng nếu biết", "tone": "giọng văn nếu biết", "cta_text": "CTA mong muốn nếu biết", "custom_structure": null}
```

### Các trường trong khối generate:
- content_type (BẮT BUỘC): loại nội dung
- brief (BẮT BUỘC): mô tả CHI TIẾT, CÀNG DÀI CÀNG TỐT — gộp tất cả thông tin người dùng cung cấp về sản phẩm, tính năng, USP, giá, ưu đãi vào đây
- marketing_goal: mục tiêu cụ thể (vd: "Tăng reach và engagement", "Chốt sale", "Thu lead")
- industry: ngành nghề (vd: "F&B", "Công nghệ", "Giáo dục", "Bất động sản")
- target_audience: đối tượng KH (vd: "Gen Z 18-25", "Chủ doanh nghiệp SME", "Mẹ bỉm sữa")
- tone: giọng văn (vd: "Chuyên nghiệp", "Thân thiện", "Hài hước", "Truyền cảm hứng")
- cta_text: CTA cụ thể nếu người dùng yêu cầu
- custom_structure: cấu trúc tùy chỉnh nếu người dùng yêu cầu dạng khác framework mặc định (để null nếu không có)

### QUAN TRỌNG về brief:
Brief phải CHỨA ĐẦY ĐỦ thông tin: tên sản phẩm, đặc điểm, USP, giá (nếu có), ưu đãi (nếu có), bối cảnh. Ví dụ ĐÚNG:
- brief: "Khóa học Digital Marketing online 3 tháng của Vitba Academy, giá 2.990.000đ (giảm 40% từ 4.990.000đ), dành cho người mới bắt đầu, cam kết việc làm, mentor 1-1, có chứng chỉ"
- KHÔNG: brief: "khóa học marketing"

Các content_type hợp lệ: facebook_post, seo_blog, email, landing_page, tiktok_script, marketing_plan

## Cách xác định content_type từ ngữ cảnh:
- "facebook", "fb", "post", "bài đăng", "fanpage" → facebook_post
- "blog", "SEO", "bài viết web" → seo_blog
- "email", "thư", "newsletter" → email
- "landing page", "trang đích" → landing_page
- "tiktok", "video ngắn", "reels", "kịch bản" → tiktok_script
- "kế hoạch", "chiến dịch", "campaign", "marketing plan" → marketing_plan

## Sau khi generate:
- Hỏi người dùng có muốn chỉnh sửa gì không (giọng điệu, CTA, hashtag, framework khác, v.v.)
- Nếu muốn chỉnh → generate lại với brief cập nhật
- Nếu người dùng muốn dùng framework khác hoặc cấu trúc riêng → generate lại với custom_structure

## Quy tắc:
- KHÔNG BAO GIỜ tự viết bài trong chat. LUÔN dùng khối ```generate``` để hệ thống Vitba Agents làm việc đó.
- Luôn giao tiếp bằng tiếng Việt, ngắn gọn, thân thiện.
- BẮT BUỘC cung cấp 4 suggestion chips cá nhân hóa theo ngữ cảnh ở cuối mỗi phản hồi bằng khối code duy nhất:
```suggestions
["Gợi ý 1", "Gợi ý 2", "Gợi ý 3", "Gợi ý 4"]
```
- TUYỆT ĐỐI KHÔNG liệt kê các lựa chọn dưới dạng danh sách đánh số (1. 2. 3.) hoặc gạch đầu dòng (- *) trong phần text phản hồi. Chỉ viết câu hỏi ngắn gọn 1-2 câu, rồi đặt khối ```suggestions``` ở cuối. Các gợi ý sẽ được hiển thị tự động ở sidebar.
"""


def _build_system_prompt(user: User, doc_context: str = "") -> str:
    plan = get_user_plan(user)
    allowed = ", ".join(sorted(get_limits(user)["content_types"]))
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"## Giới hạn gói {plan.upper()} của người dùng hiện tại:\n"
        f"- Chỉ được dùng khối ```generate``` với content_type thuộc: {allowed}\n"
        "- Nếu người dùng yêu cầu loại nội dung KHÔNG có trong danh sách trên, "
        "KHÔNG dùng ```generate```. Hãy trả lời thân thiện: "
        '"Tính năng này cần gói Pro hoặc Max. Bạn vui lòng nâng cấp gói tại trang Pricing để sử dụng."\n'
        "- Nếu người dùng hết lượt tạo trong ngày, thông báo nâng cấp gói thay vì generate."
    )
    if doc_context:
        prompt += (
            "\n\n## Tài liệu người dùng đã tải lên:\n"
            "Dưới đây là nội dung từ tài liệu người dùng đã upload. "
            "Hãy sử dụng thông tin này để trả lời câu hỏi hoặc tạo nội dung phù hợp.\n\n"
            f"{doc_context}"
        )
    return prompt


async def _build_messages(session: AsyncSession, conversation_id: int, limit: int = 12):
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [{"role": m.role, "content": m.content} for m in messages]


async def _analyze_images(image_data: list[dict]) -> str:
    """Use a vision-capable model to describe images, fallback to metadata."""
    from PIL import Image

    if settings.openai_api_key:
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import HumanMessage as HMsg

            vision_model = ChatOpenAI(
                model="gpt-4o-mini",
                api_key=settings.openai_api_key,
                max_tokens=1024,
                timeout=30,
            )
            content_parts: list[dict] = [
                {"type": "text", "text": "Mô tả chi tiết nội dung từng ảnh bằng tiếng Việt. Nếu có chữ trong ảnh, trích xuất toàn bộ text."}
            ]
            for img in image_data:
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{img['mime']};base64,{img['b64']}"},
                })
            resp = await vision_model.ainvoke([HMsg(content=content_parts)])
            return resp.content
        except Exception as e:
            logger.warning(f"Vision analysis failed, falling back to metadata: {e}")

    descriptions = []
    for img in image_data:
        try:
            raw = base64.b64decode(img["b64"])
            pil_img = Image.open(io.BytesIO(raw))
            w, h = pil_img.size
            descriptions.append(f"Ảnh \"{img['name']}\": {w}x{h}px, định dạng {pil_img.format or img['mime']}")
        except Exception:
            descriptions.append(f"Ảnh \"{img['name']}\" (không đọc được metadata)")
    return "Người dùng gửi ảnh nhưng hệ thống không có vision model để phân tích. Thông tin ảnh:\n" + "\n".join(descriptions)


def _resize_for_upload(file_bytes: bytes, mime: str, max_side: int = 1024) -> tuple[bytes, str]:
    """Resize image if too large, return (bytes, mime)."""
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(file_bytes))
        if max(img.size) <= max_side:
            return file_bytes, mime
        img.thumbnail((max_side, max_side), Image.LANCZOS)
        buf = io.BytesIO()
        fmt = "JPEG" if mime in ("image/jpeg", "image/gif") else "PNG"
        out_mime = "image/jpeg" if fmt == "JPEG" else "image/png"
        img.save(buf, format=fmt, quality=85)
        return buf.getvalue(), out_mime
    except Exception:
        return file_bytes, mime


async def _summarize_title(content: str) -> str:
    """Use LLM to generate a short 4-6 word title, fallback to truncation."""
    if not provider_available():
        words = content.split()
        return " ".join(words[:6]) if len(words) > 6 else content[:30]
    try:
        from langchain_core.messages import HumanMessage as HMsg, SystemMessage as SMsg
        model = get_chat_model("fast")
        resp = await model.ainvoke([
            SMsg(content="Tóm tắt tin nhắn sau thành tiêu đề ngắn gọn 4-6 từ bằng tiếng Việt. CHỈ trả về tiêu đề, không giải thích."),
            HMsg(content=content[:200]),
        ])
        title = resp.content.strip().strip('"').strip("'")
        if len(title) > 50:
            title = title[:50]
        return title or content[:30]
    except Exception:
        words = content.split()
        return " ".join(words[:6]) if len(words) > 6 else content[:30]


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


async def _process_chat_upload(
    file_bytes: bytes,
    filename: str,
    project_id: int,
    document_id: int,
    conversation_id: int,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    """Background task: ingest file into Qdrant with conversation_id metadata."""
    import tempfile
    from pathlib import Path
    from app.rag.extract import extract_text
    from app.rag.chunk import chunk_text
    from app.rag.embeddings import embed_texts, sparse_embed_texts
    from app.rag.qdrant_store import upsert_chunks_with_conv
    from app.core.config import settings

    try:
        suffix = Path(filename).suffix.lower()
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            tmp_path = Path(tmp.name)

        try:
            text = await asyncio.to_thread(extract_text, tmp_path)
            if text.strip():
                chunks = chunk_text(text, chunk_size=settings.rag_chunk_size, overlap=settings.rag_chunk_overlap)
                if chunks:
                    vectors = await asyncio.to_thread(embed_texts, chunks)
                    sparse_vecs = await asyncio.to_thread(sparse_embed_texts, chunks)
                    await asyncio.to_thread(
                        upsert_chunks_with_conv, project_id, document_id, conversation_id,
                        chunks, vectors, sparse_vecs,
                    )
        finally:
            tmp_path.unlink(missing_ok=True)

        status = "ready"
    except Exception as e:
        logger.error(f"Failed to process chat file: {e}")
        status = "failed"

    async with session_maker() as s:
        from app.models.document import Document
        doc = await s.get(Document, document_id)
        if doc:
            doc.status = status
            await s.commit()


@router.post("/{conversation_id}/upload")
async def upload_chat_file(
    conversation_id: int,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    session_maker: async_sessionmaker[AsyncSession] = Depends(get_session_maker),
):
    """Upload file to be used in chat context."""
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await session.execute(select(Project).where(Project.user_id == current_user.id).limit(1))
    project = result.scalar_one_or_none()

    if not project:
        project = Project(name="Default Chat Project", user_id=current_user.id)
        session.add(project)
        await session.commit()
        await session.refresh(project)

    from app.services import document_service

    file_bytes = await file.read()
    filename = file.filename or "unknown"

    doc = await document_service.create_document(session, project.id, filename)
    doc.status = "processing"
    await session.commit()

    background_tasks.add_task(
        _process_chat_upload,
        file_bytes, filename, project.id, doc.id, conversation_id, session_maker,
    )

    return {"document_id": doc.id, "status": "processing", "conversation_id": conversation_id}


@router.get("/{conversation_id}/upload/{document_id}/status")
async def check_upload_status(
    conversation_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    from app.models.document import Document

    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    doc = await session.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"document_id": doc.id, "status": doc.status}


_pending_images: dict[int, list[dict]] = {}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/{conversation_id}/upload-image")
async def upload_image(
    conversation_id: int,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await session.get(Conversation, conversation_id)
    if conv is None or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    mime = file.content_type or "image/jpeg"
    if mime not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Ảnh quá lớn (tối đa 5MB)")

    file_bytes, mime = await asyncio.to_thread(_resize_for_upload, file_bytes, mime)
    b64 = base64.b64encode(file_bytes).decode("utf-8")

    if conversation_id not in _pending_images:
        _pending_images[conversation_id] = []
    _pending_images[conversation_id].append({"b64": b64, "mime": mime, "name": file.filename or "image"})

    return {"status": "ok", "filename": file.filename}


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

    needs_title = conv.title == "New conversation"
    if needs_title:
        conv.title = " ".join(payload.content.split()[:6])[:30]

    await session.commit()

    # Guard Agent Check
    if provider_available():
        guard_result = await run_guard_agent(payload.content)
        if not guard_result.is_safe:
            # Save AI rejection message
            async with session_maker() as save_session:
                ai_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=guard_result.reason,
                )
                save_session.add(ai_msg)
                await save_session.commit()

            async def rejected_stream():
                yield f"data: {json.dumps({'type': 'token', 'content': guard_result.reason})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'content': guard_result.reason})}\n\n"

            return StreamingResponse(
                rejected_stream(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            )

    image_data = _pending_images.pop(conversation_id, None)

    image_description = ""
    if image_data:
        try:
            image_description = await _analyze_images(image_data)
        except Exception as e:
            logger.warning(f"Image analysis failed: {e}")
            image_description = "Không thể phân tích ảnh."

    doc_context = ""
    try:
        from app.rag.embeddings import embed_query, sparse_embed_query
        from app.rag.qdrant_store import retrieve_by_conversation, retrieve
        query_vec = await asyncio.to_thread(embed_query, payload.content)
        query_sparse = await asyncio.to_thread(sparse_embed_query, payload.content)
        chunks = await asyncio.to_thread(
            retrieve_by_conversation, conversation_id, query_vec,
            query_sparse=query_sparse, query_text=payload.content,
        )
        proj_result = await session.execute(select(Project).where(Project.user_id == current_user.id).limit(1))
        proj = proj_result.scalar_one_or_none()
        if proj:
            project_chunks = await asyncio.to_thread(
                retrieve, proj.id, query_vec,
                query_sparse=query_sparse, query_text=payload.content,
            )
            for c in project_chunks:
                if c not in chunks:
                    chunks.append(c)
        if chunks:
            doc_context = "\n---\n".join(chunks)
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")

    history = await _build_messages(session, conversation_id)

    system_prompt = _build_system_prompt(current_user, doc_context)
    if image_description:
        system_prompt += (
            "\n\n## Nội dung ảnh đính kèm (đã được phân tích):\n"
            f"{image_description}\n\n"
            "Hãy sử dụng thông tin ảnh ở trên để trả lời hoặc tạo nội dung marketing phù hợp."
        )

    chat_messages = [{"role": "system", "content": system_prompt}] + history

    async def event_stream():
        full_response = ""
        stream = (
            _stream_llm(chat_messages)
            if provider_available()
            else _mock_stream(chat_messages)
        )
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
            if needs_title:
                try:
                    smart_title = await _summarize_title(payload.content)
                    c = await save_session.get(Conversation, conversation_id)
                    if c:
                        c.title = smart_title
                except Exception:
                    pass
            await save_session.commit()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
