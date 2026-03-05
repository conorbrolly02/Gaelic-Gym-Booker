"""
Check available changing rooms in the database
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models.resource import Resource
from sqlalchemy import select


async def check_rooms():
    async with AsyncSessionLocal() as db:
        # Get all changing rooms
        result = await db.execute(
            select(Resource).where(Resource.name.like('%Changing%'))
        )
        rooms = result.scalars().all()

        print('Changing Rooms:')
        for room in rooms:
            print(f'  ID: {room.id}, Name: {room.name}')


if __name__ == "__main__":
    asyncio.run(check_rooms())
