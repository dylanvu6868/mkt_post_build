from app.models.generation_job import GenerationJob
from app.services.generation_service import (
    create_job,
    get_job_for_user,
    run_generation_job,
)


def _initial_state(brief="eco-friendly water bottles"):
    return {
        "project_id": 1,
        "content_type": "facebook_post",
        "brief": brief,
        "marketing_goal": "awareness",
        "brand_profile": {},
        "provider_available": False,
        "errors": [],
    }


async def test_run_generation_job_completes_and_stores_result(session_maker):
    async with session_maker() as session:
        job = await create_job(
            session,
            project_id=1,
            content_type="facebook_post",
            brief="eco-friendly water bottles",
            marketing_goal="awareness",
        )
        job_id = job.id
        assert job.status == "queued"

    await run_generation_job(session_maker, job_id, _initial_state())

    async with session_maker() as session:
        done = await session.get(GenerationJob, job_id)
        assert done.status == "done"
        assert done.current_step == "reviewer"  # last node streamed
        assert done.result_json["final"]["hook"]
        assert 0 <= done.result_json["review"]["score"] <= 100


async def test_run_generation_job_records_error_on_failure(session_maker):
    async with session_maker() as session:
        job = await create_job(
            session,
            project_id=1,
            content_type="facebook_post",
            brief="x",
            marketing_goal="",
        )
        job_id = job.id

    # A state missing the required "brief" key makes the agents raise → job errors.
    bad_state = {"provider_available": False, "errors": []}
    await run_generation_job(session_maker, job_id, bad_state)

    async with session_maker() as session:
        failed = await session.get(GenerationJob, job_id)
        assert failed.status == "error"
        assert failed.error


async def test_get_job_for_user_enforces_ownership(session_maker):
    from app.models.project import Project
    from app.models.user import User

    async with session_maker() as session:
        owner = User(name="O", email="o@example.com", password_hash="x")
        other = User(name="X", email="x@example.com", password_hash="x")
        session.add_all([owner, other])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(other)
        project = Project(user_id=owner.id, name="P")
        session.add(project)
        await session.commit()
        await session.refresh(project)
        job = await create_job(
            session, project.id, "facebook_post", "brief", ""
        )
        job_id, owner_id, other_id = job.id, owner.id, other.id

    async with session_maker() as session:
        assert (await get_job_for_user(session, job_id, owner_id)) is not None
        assert (await get_job_for_user(session, job_id, other_id)) is None
