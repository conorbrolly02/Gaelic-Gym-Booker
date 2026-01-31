"""
Test Configuration and Fixtures.

Provides shared test fixtures for database sessions, test clients,
and authentication utilities.
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import get_db, Base
from app.models.user import User, UserRole
from app.models.member import Member, MembershipStatus
from app.models.booking import Booking, BookingStatus
from app.auth import create_access_token, hash_password


# Note: In-memory SQLite is used for unit tests that don't require database.
# For full integration tests, use a test PostgreSQL database:
# TEST_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/test_gym_booking"
# SQLite doesn't support PostgreSQL ARRAY type used in recurring_patterns table.
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_engine():
    """Create async test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for tests."""
    async_session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for API testing."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MEMBER,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_member(db_session: AsyncSession, test_user: User) -> Member:
    """Create a test member linked to test user."""
    member = Member(
        id=uuid4(),
        user_id=test_user.id,
        full_name="Test Member",
        phone="1234567890",
        membership_status=MembershipStatus.ACTIVE,
    )
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(member)
    return member


@pytest.fixture
async def admin_member(db_session: AsyncSession, test_admin: User) -> Member:
    """Create an admin member linked to admin user."""
    member = Member(
        id=uuid4(),
        user_id=test_admin.id,
        full_name="Admin User",
        phone="0987654321",
        membership_status=MembershipStatus.ACTIVE,
    )
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(member)
    return member


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate authentication headers for test user."""
    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(test_admin: User) -> dict:
    """Generate authentication headers for admin user."""
    token = create_access_token(data={"sub": str(test_admin.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def future_booking_times() -> tuple[datetime, datetime]:
    """Generate valid future booking times."""
    start = datetime.now(timezone.utc) + timedelta(hours=2)
    end = start + timedelta(hours=1)
    return start, end


@pytest.fixture
def past_booking_times() -> tuple[datetime, datetime]:
    """Generate past booking times (for admin override testing)."""
    start = datetime.now(timezone.utc) - timedelta(hours=2)
    end = start + timedelta(hours=1)
    return start, end
