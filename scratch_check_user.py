import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath('backend'))
load_dotenv('.env')

from app.core.db import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as session:
        result = await session.execute(text("SELECT email, password_hash, oauth_provider FROM users WHERE email='dvu784796@gmail.com'"))
        print(result.mappings().all())

asyncio.run(main())
