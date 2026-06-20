"""Admin utility: set a user's plan.

Usage:
    python update_plan.py <email> <plan>

Reads DATABASE_URL from the environment / .env — never hardcode credentials.
"""
import asyncio
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv()

VALID_PLANS = {"free", "lite", "pro", "max"}


async def update_plan(email: str, plan: str) -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is not set (define it in .env or the environment)")

    engine = create_async_engine(database_url, echo=True)
    try:
        async with engine.begin() as conn:
            result = await conn.execute(
                text("UPDATE users SET plan = :plan WHERE email = :email"),
                {"plan": plan, "email": email},
            )
            print(f"Rows updated: {result.rowcount}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python update_plan.py <email> <plan>")
    _, email_arg, plan_arg = sys.argv
    if plan_arg not in VALID_PLANS:
        raise SystemExit(f"Invalid plan '{plan_arg}'. Choose one of: {', '.join(sorted(VALID_PLANS))}")
    asyncio.run(update_plan(email_arg, plan_arg))
