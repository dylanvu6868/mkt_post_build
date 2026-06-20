import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def update_plan():
    engine = create_async_engine('postgresql+asyncpg://postgres.utodpwkcosyqgeselwrx:Vuhaiduong2004%40@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?ssl=require', echo=True)
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE users SET plan = 'max' WHERE email = 'buihue123@gmail.com'"))
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(update_plan())
