"""Check users in database."""
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f'Found {len(users)} users:')
        for user in users:
            print(f'  - Email: {user.email}, Role: {user.role.value}, Active: {user.is_active}')

if __name__ == "__main__":
    asyncio.run(check_users())
