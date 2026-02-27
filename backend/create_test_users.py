"""
Create test users for the gym booking system.

Creates:
1. Admin user: admin@gym.com / admin123
2. Regular member: member@gym.com / member123
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.user import User, UserRole
from app.models.member import Member, MembershipStatus
from app.auth.security import hash_password
from app.config import settings

async def create_test_users():
    """Create test admin and member users."""
    # Create database engine
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(database_url)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # Check if users already exist
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "admin@gym.com"))
        if result.scalar_one_or_none():
            print("Users already exist!")
            return

        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@gym.com",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(admin_user)
        await session.flush()

        # Create admin member profile
        admin_member = Member(
            id=uuid.uuid4(),
            user_id=admin_user.id,
            full_name="Admin User",
            phone="555-0100",
            membership_status=MembershipStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(admin_member)

        # Create regular member user
        member_user = User(
            id=uuid.uuid4(),
            email="member@gym.com",
            password_hash=hash_password("member123"),
            role=UserRole.MEMBER,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(member_user)
        await session.flush()

        # Create member profile (already approved)
        member_profile = Member(
            id=uuid.uuid4(),
            user_id=member_user.id,
            full_name="Test Member",
            phone="555-0101",
            membership_status=MembershipStatus.ACTIVE,
            approved_by=admin_user.id,
            approved_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(member_profile)

        await session.commit()

        print("✓ Test users created successfully!")
        print("\nAdmin User:")
        print("  Email: admin@gym.com")
        print("  Password: admin123")
        print("\nRegular Member:")
        print("  Email: member@gym.com")
        print("  Password: member123")
        print("\nYou can now log in with these credentials!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_users())
