"""Check what users exist in the database."""
import asyncio
import sys
sys.path.insert(0, 'backend')

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.member import Member

async def check_users():
    async with AsyncSessionLocal() as session:
        # Get all users
        result = await session.execute(select(User))
        users = result.scalars().all()

        print(f"\nFound {len(users)} users in database:")
        print("-" * 80)

        for user in users:
            print(f"\nEmail: {user.email}")
            print(f"Role: {user.role.value}")
            print(f"Active: {user.is_active}")
            print(f"ID: {user.id}")

            # Get associated member
            member_result = await session.execute(
                select(Member).where(Member.user_id == user.id)
            )
            member = member_result.scalar_one_or_none()

            if member:
                print(f"Member Name: {member.first_name} {member.last_name}")
                print(f"Member Status: {member.status.value}")

        print("\n" + "-" * 80)

if __name__ == "__main__":
    asyncio.run(check_users())
