import asyncio
import logging
from typing import Any

from sqlalchemy import select

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.graph.build import build_graph, PREMIUM_PLANS
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.services import history_service
from app.core.tracing import get_langfuse_handler, trace_request, current_trace_id

_RESULT_KEYS = (
    "draft",
    "final",
    "formatted_final",
)


async def create_job(
    session: AsyncSession,
    project_id: int,
    content_type: str,
    brief: str,
    marketing_goal: str,
) -> GenerationJob:
    job = GenerationJob(
        project_id=project_id, content_type=content_type, status="queued"
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    logger.info("Job created job_id=%s project_id=%s content_type=%s", job.id, project_id, content_type)
    return job


async def get_job_for_user(
    session: AsyncSession, job_id: int, user_id: int
) -> GenerationJob | None:
    result = await session.execute(
        select(GenerationJob)
        .join(Project, GenerationJob.project_id == Project.id)
        .where(GenerationJob.id == job_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def _set_step(
    session_maker: async_sessionmaker[AsyncSession], job_id: int, step: str
) -> None:
    """Best-effort progress update. Must never fail the generation job —
    this only feeds the UI's "current step" indicator, not the actual
    pipeline output."""
    try:
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.current_step = step
                await session.commit()
    except Exception as exc:
        logger.warning("Step update failed job_id=%s step=%s error=%s", job_id, step, exc)


async def run_generation_job(
    session_maker: async_sessionmaker[AsyncSession],
    job_id: int,
    initial_state: dict[str, Any],
) -> None:
    """Background entrypoint: run the graph, stream progress, persist result."""
    graph = build_graph()
    user_id = initial_state.get("user_id")  # NEW: read user_id from state

    async with session_maker() as session:
        job = await session.get(GenerationJob, job_id)
        if job is None:
            return
        job.status = "running"
        await session.commit()

    logger.info("Generation started job_id=%s", job_id)
    state: dict[str, Any] = dict(initial_state)
    try:
        with trace_request(
            "generate.pipeline",
            user_id=user_id,
            metadata={"job_id": job_id, "content_type": initial_state.get("content_type")},
        ) as trace:
            # trace_request already sets current_trace_id ContextVar
            # No need to set it again here

            # Timeout 300s cho toàn bộ pipeline generation
            _tid = current_trace_id.get()
            _handler = get_langfuse_handler(_tid) if _tid else None
            _config = {"callbacks": [_handler]} if _handler else {}
            stream = graph.astream(initial_state, _config, stream_mode="updates")
            try:
                async with asyncio.timeout(300):
                    async for update in stream:
                        for node, delta in update.items():
                            for key, value in (delta or {}).items():
                                if key == "errors":
                                    state.setdefault("errors", [])
                                    state["errors"].extend(value)
                                else:
                                    state[key] = value
                            logger.info("Agent step completed job_id=%s step=%s", job_id, node)
                            await _set_step(session_maker, job_id, node)
            except asyncio.TimeoutError:
                logger.error("Generation timed out after 300s job_id=%s", job_id)
                async with session_maker() as session:
                    job = await session.get(GenerationJob, job_id)
                    if job is not None:
                        job.status = "error"
                        job.error = "Quá trình tạo nội dung mất quá nhiều thời gian. Vui lòng thử lại."
                        await session.commit()
                return

            result = {key: state.get(key) for key in _RESULT_KEYS}
            async with session_maker() as session:
                job = await session.get(GenerationJob, job_id)
                if job is not None:
                    job.status = "done"
                    job.result_json = result
                    await session.commit()

                review = state.get("review") or {}
                score = review.get("score")
                await history_service.save_to_history(
                    session,
                    initial_state["project_id"],
                    initial_state["content_type"],
                    initial_state["brief"],
                    result,
                    score=score,
                )
            logger.info("Generation completed job_id=%s score=%s", job_id, score)
            # REST API posts synchronously — no flush needed
    except Exception as exc:  # noqa: BLE001 — any agent/LLM failure marks the job errored
        logger.error("Generation failed job_id=%s error=%s", job_id, exc)
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "error"
                job.error = "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại sau ít phút."
                await session.commit()


async def _inject_brand_rag(state: dict[str, Any]) -> dict[str, Any]:
    """Best-effort brand-doc RAG lookup, folded into a synthetic fused_output
    so copywriter()'s existing fused_output handling picks it up unmodified."""
    from app.agents.brand import brand

    brand_delta = await brand(state)
    brand_output = brand_delta.get("brand_output") or {}
    chunks = brand_output.get("relevant_context") or []
    if chunks:
        state["fused_output"] = {"unified_brief": "\n".join(chunks)}
    return state


async def run_quick_generation(
    session_maker: async_sessionmaker[AsyncSession],
    job_id: int,
    initial_state: dict[str, Any],
) -> tuple[dict | None, str | None]:
    """Synchronous 1-2 LLM-call generation for non-SEO-blog content types.
    Returns (result, error) -- exactly one is non-None."""
    from app.agents.copywriter import copywriter
    from app.agents.reviewer import reviewer
    from app.agents.landing_page_coder import landing_page_coder
    from app.agents.marketing_planner_rag import marketing_planner_rag

    state = dict(initial_state)
    user_plan = state.get("user_plan", "free")
    content_type = state.get("content_type")

    try:
        async with asyncio.timeout(45):
            if content_type == "landing_page":
                delta = await landing_page_coder(state)
            elif content_type == "marketing_plan":
                delta = await marketing_planner_rag(state)
            else:
                state = await _inject_brand_rag(state)
                delta = await copywriter(state)
                state.update(delta)
                if user_plan in PREMIUM_PLANS:
                    review_delta = await reviewer(state)
                    state.update(review_delta)
                    delta = state
    except Exception as exc:
        logger.error("Quick generation failed job_id=%s error=%s", job_id, exc)
        message = (
            "Quá trình tạo nội dung mất quá nhiều thời gian. Vui lòng thử lại."
            if isinstance(exc, asyncio.TimeoutError)
            else "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại sau ít phút."
        )
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "error"
                job.error = message
                await session.commit()
        return None, message

    result = {key: delta.get(key) for key in _RESULT_KEYS}
    async with session_maker() as session:
        job = await session.get(GenerationJob, job_id)
        if job is not None:
            job.status = "done"
            job.result_json = result
            await session.commit()
        score = (delta.get("review") or {}).get("score")
        await history_service.save_to_history(
            session, state["project_id"], content_type, state["brief"], result, score=score
        )
    return result, None
