import logging
from typing import Any

from sqlalchemy import select

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.graph.build import build_graph
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.services import history_service
from app.core.tracing import get_langfuse_handler, trace_request

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
    async with session_maker() as session:
        job = await session.get(GenerationJob, job_id)
        if job is not None:
            job.current_step = step
            await session.commit()


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

    import asyncio
    logger.info("Generation started job_id=%s", job_id)
    state: dict[str, Any] = dict(initial_state)
    try:
        with trace_request(
            "generate.pipeline",
            user_id=user_id,
            metadata={"job_id": job_id, "content_type": initial_state.get("content_type")},
        ) as trace:
            trace_id = trace  # REST API trace_id string
            # Propagate trace_id vào ContextVar để tất cả agent calls đều ghi nhận
            from app.agents.base import current_trace_id
            current_trace_id.set(trace_id)

            # Timeout 300s cho toàn bộ pipeline generation
            stream = graph.astream(initial_state, {}, stream_mode="updates")
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
                        job.error = "Pipeline timed out after 300 seconds"
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
            # Flush Langfuse buffer ngay sau generation để trace xuất hiện
            from app.core.tracing import langfuse_client
            if langfuse_client:
                langfuse_client.flush()
    except Exception as exc:  # noqa: BLE001 — any agent/LLM failure marks the job errored
        logger.error("Generation failed job_id=%s error=%s", job_id, exc)
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "error"
                job.error = str(exc)
                await session.commit()
