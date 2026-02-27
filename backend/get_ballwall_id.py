import asyncio
from app.database import AsyncSessionLocal
from app.models.resource import Resource
from sqlalchemy import select

async def get_ballwall():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Resource).where(Resource.name.like('%Ball Wall%'))
        )
        resources = result.scalars().all()
        for r in resources:
            print(f'{r.name}: {r.id}')

if __name__ == "__main__":
    asyncio.run(get_ballwall())
