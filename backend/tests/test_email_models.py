import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401
from app.models.user import User
from app.models.email_template import EmailTemplate
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList, email_list_contacts
from app.models.scheduled_email import ScheduledEmail


@pytest.fixture
async def db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        user = User(name="Test", email="test@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield session, user
    await engine.dispose()


async def test_email_template_crud(db):
    session, user = db
    tpl = EmailTemplate(
        name="Welcome", subject="Hello {{name}}", html_body="<h1>Hi {{name}}</h1>",
        variables=["name"], category="onboarding", user_id=user.id,
    )
    session.add(tpl)
    await session.commit()
    rows = (await session.execute(select(EmailTemplate).where(EmailTemplate.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].name == "Welcome"
    assert rows[0].variables == ["name"]


async def test_email_contact_crud(db):
    session, user = db
    contact = EmailContact(
        email="customer@example.com", name="Customer",
        tags=["vip", "newsletter"], user_id=user.id,
    )
    session.add(contact)
    await session.commit()
    rows = (await session.execute(select(EmailContact).where(EmailContact.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].status == "active"
    assert "vip" in rows[0].tags


async def test_email_list_with_contacts(db):
    session, user = db
    contact = EmailContact(email="a@b.com", name="A", user_id=user.id)
    session.add(contact)
    await session.flush()

    lst = EmailList(name="VIP List", user_id=user.id)
    session.add(lst)
    await session.flush()

    await session.execute(email_list_contacts.insert().values(list_id=lst.id, contact_id=contact.id))
    await session.commit()

    rows = (await session.execute(
        select(EmailContact.email)
        .join(email_list_contacts, EmailContact.id == email_list_contacts.c.contact_id)
        .where(email_list_contacts.c.list_id == lst.id)
    )).scalars().all()
    assert rows == ["a@b.com"]


async def test_scheduled_email(db):
    session, user = db
    tpl = EmailTemplate(name="T", subject="S", html_body="<p>B</p>", user_id=user.id)
    lst = EmailList(name="L", user_id=user.id)
    session.add_all([tpl, lst])
    await session.flush()

    sched = ScheduledEmail(
        template_id=tpl.id, list_id=lst.id,
        scheduled_at="2026-07-01T10:00:00+07:00",
        user_id=user.id,
    )
    session.add(sched)
    await session.commit()
    assert sched.status == "pending"
    assert sched.id is not None
