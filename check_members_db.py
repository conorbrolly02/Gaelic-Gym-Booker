import asyncio
import sys
sys.path.insert(0, 'backend')

from app.database import get_db_session
from sqlalchemy import select, text
from app.models.member import Member

async def check_members():
    async with get_db_session() as db:
        # Count all members
        result = await db.execute(select(Member))
        members = result.scalars().all()

        print(f"Total members in database: {len(members)}")
        print("-" * 80)

        if members:
            for member in members:
                print(f"ID: {member.id}")
                print(f"User ID: {member.user_id}")
                print(f"Full Name: {member.full_name}")
                print(f"Phone: {member.phone}")
                print(f"Status: {member.membership_status}")
                print(f"Created: {member.created_at}")
                print("-" * 80)
        else:
            print("No members found in database!")

if __name__ == "__main__":
    asyncio.run(check_members())
