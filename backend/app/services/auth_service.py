import random
import secrets
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession, name: str, email: str, password: str
) -> User:
    user = User(name=name, email=email, password_hash=hash_password(password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate(
    session: AsyncSession, email: str, password: str
) -> User | None:
    user = await get_user_by_email(session, email)
    if user is None or user.password_hash is None or not verify_password(password, user.password_hash):
        return None
    return user


async def create_password_reset_code(session: AsyncSession, user_id: int) -> str:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found")

    # Generate 6-digit code
    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.now() + timedelta(minutes=15)

    user.reset_code = code
    user.reset_code_expires_at = expires_at
    await session.commit()
    await session.refresh(user)

    return code


async def verify_password_reset_code(
    session: AsyncSession, user_id: int, code: str, new_password: str
) -> bool:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return False

    # Check if code matches and not expired
    if (
        user.reset_code != code
        or user.reset_code_expires_at is None
        or datetime.now() > user.reset_code_expires_at
    ):
        return False

    # Update password and clear reset code
    user.password_hash = hash_password(new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    await session.commit()

    return True
