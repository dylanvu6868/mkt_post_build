from unittest.mock import patch

from app.models.generation_job import GenerationJob
from app.services.generation_service import (
    create_job,
    get_job_for_user,
    run_generation_job,
    run_quick_generation,
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


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_run_generation_job_completes_and_stores_result(
    mock_embed, mock_retrieve, session_maker
):
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
        assert done.current_step == "copywriter"
        assert done.result_json["draft"]["hook"]


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_run_generation_job_records_error_on_failure(
    mock_embed, mock_retrieve, session_maker
):
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


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_run_quick_generation_facebook_post_free_plan_skips_reviewer(
    mock_embed, mock_retrieve, session_maker
):
    async with session_maker() as session:
        job = await create_job(session, 1, "facebook_post", "eco bottles", "awareness")
        job_id = job.id

    state = _initial_state()
    state["user_plan"] = "free"
    result, error = await run_quick_generation(session_maker, job_id, state)

    assert error is None
    assert result["draft"]["hook"]
    assert "review" not in (result.get("final") or {})

    async with session_maker() as session:
        done = await session.get(GenerationJob, job_id)
        assert done.status == "done"
        assert done.result_json["draft"]["hook"]


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_run_quick_generation_premium_plan_runs_reviewer(
    mock_embed, mock_retrieve, session_maker
):
    async with session_maker() as session:
        job = await create_job(session, 1, "facebook_post", "eco bottles", "awareness")
        job_id = job.id

    state = _initial_state()
    state["user_plan"] = "pro"
    result, error = await run_quick_generation(session_maker, job_id, state)

    assert error is None
    async with session_maker() as session:
        done = await session.get(GenerationJob, job_id)
        assert done.status == "done"


async def test_run_quick_generation_landing_page_uses_landing_coder(session_maker):
    async with session_maker() as session:
        job = await create_job(session, 1, "landing_page", "eco bottles", "")
        job_id = job.id

    state = _initial_state()
    state["content_type"] = "landing_page"
    state["user_plan"] = "free"
    with patch(
        "app.agents.landing_page_coder.landing_page_coder",
        return_value={"final": {"body": "<html>x</html>"}, "formatted_final": {"body": "<html>x</html>"}},
    ):
        result, error = await run_quick_generation(session_maker, job_id, state)

    assert error is None
    assert result["final"]["body"] == "<html>x</html>"


async def test_run_quick_generation_handles_exception_with_friendly_message(session_maker):
    async with session_maker() as session:
        job = await create_job(session, 1, "facebook_post", "eco bottles", "awareness")
        job_id = job.id

    state = _initial_state()
    state["user_plan"] = "free"
    with patch("app.agents.copywriter.copywriter", side_effect=RuntimeError("boom")):
        result, error = await run_quick_generation(session_maker, job_id, state)

    assert result is None
    assert error == "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại sau ít phút."
    assert "boom" not in error

    async with session_maker() as session:
        failed = await session.get(GenerationJob, job_id)
        assert failed.status == "error"
        assert failed.error == error


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
