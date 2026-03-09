"""
Test Configuration and Fixtures.

Provides shared test fixtures for database sessions, test clients,
and authentication utilities.

Uses the existing PostgreSQL database with proper session handling.
"""

import pytest
import os
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
from app.auth.security import create_access_token, hash_password


# Use actual PostgreSQL database for tests
TEST_DATABASE_URL = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")


@pytest.fixture(scope="function")
async def async_engine():
    """Create async test database engine using existing PostgreSQL database."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )
    yield engine
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create async database session for tests.
    
    Uses standard session that commits and cleans up test data.
    """
    async_session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    session = async_session_factory()
    try:
        yield session
    finally:
        await session.rollback()
        await session.close()


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
    """Create a test user with active status."""
    user = User(
        id=uuid4(),
        email=f"test_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MEMBER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        id=uuid4(),
        email=f"admin_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_member(db_session: AsyncSession, test_user: User) -> Member:
    """Create a test member linked to test user with ACTIVE status."""
    member = Member(
        id=uuid4(),
        user_id=test_user.id,
        full_name="Test Member",
        phone="1234567890",
        membership_status=MembershipStatus.ACTIVE,
    )
    db_session.add(member)
    await db_session.flush()
    await db_session.refresh(member)
    
    # Attach member to user for convenience
    test_user.member = member
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
    await db_session.flush()
    await db_session.refresh(member)
    
    # Attach member to admin for convenience
    test_admin.member = member
    return member


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate authentication headers for test user."""
    token = create_access_token(test_user.id, test_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(test_admin: User) -> dict:
    """Generate authentication headers for admin user."""
    token = create_access_token(test_admin.id, test_admin.role.value)
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
