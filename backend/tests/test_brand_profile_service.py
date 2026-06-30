from app.services.brand_profile_service import load_brand_profile, format_brand_voice


async def test_load_brand_profile_returns_empty_for_unowned_project(session_maker):
    from app.models.project import Project
    from app.models.user import User

    async with session_maker() as session:
        owner = User(name="O", email="o2@example.com", password_hash="x")
        other = User(name="X", email="x2@example.com", password_hash="x")
        session.add_all([owner, other])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(other)
        project = Project(user_id=owner.id, name="P")
        session.add(project)
        await session.commit()
        await session.refresh(project)
        project_id, other_id = project.id, other.id

    async with session_maker() as session:
        result = await load_brand_profile(session, project_id, other_id)
        assert result == {}


async def test_load_brand_profile_returns_fields_when_present(session_maker):
    from app.models.project import Project
    from app.models.user import User
    from app.models.brand_profile import BrandProfile

    async with session_maker() as session:
        owner = User(name="O3", email="o3@example.com", password_hash="x")
        session.add(owner)
        await session.commit()
        await session.refresh(owner)
        project = Project(user_id=owner.id, name="P3")
        session.add(project)
        await session.commit()
        await session.refresh(project)
        profile = BrandProfile(
            project_id=project.id,
            brand_name="EcoBottle",
            tone="friendly",
            writing_style="conversational",
            preferred_words=["sustainable"],
            forbidden_words=["cheap"],
        )
        session.add(profile)
        await session.commit()
        project_id, owner_id = project.id, owner.id

    async with session_maker() as session:
        result = await load_brand_profile(session, project_id, owner_id)
        assert result["brand_name"] == "EcoBottle"
        assert result["preferred_words"] == ["sustainable"]


def test_format_brand_voice_empty_dict_returns_empty_string():
    assert format_brand_voice({}) == ""


def test_format_brand_voice_formats_present_fields():
    text = format_brand_voice({"brand_name": "EcoBottle", "tone": "friendly"})
    assert "EcoBottle" in text
    assert "friendly" in text
