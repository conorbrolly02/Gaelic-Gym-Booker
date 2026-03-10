"""
Database connection and session management.

This module sets up the async SQLAlchemy engine and provides
a dependency for getting database sessions in API endpoints.
"""

from __future__ import annotations

from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings


# -------------------------------------------------------------------
# Build async database URL
# - Convert postgres "postgresql://" -> "postgresql+asyncpg://"
# - Remove ?sslmode=... because asyncpg uses SSL differently
# - Leave SQLite URLs as-is (e.g., sqlite+aiosqlite:///./gym_booking.db)
# -------------------------------------------------------------------
raw_url = settings.DATABASE_URL

def _normalize_db_url(url: str) -> str:
    # If PostgreSQL, switch to asyncpg driver
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Remove sslmode from query string safely
    parsed = urlparse(url)
    if parsed.query:
        params = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() != "sslmode"]
        new_query = urlencode(params)
        url = urlunparse(parsed._replace(query=new_query))

    return url

database_url = _normalize_db_url(raw_url)


# -------------------------------------------------------------------
# Create the async SQLAlchemy engine
# -------------------------------------------------------------------
engine_args = {
    
        "pool_pre_ping": True,
        "echo": True,  # <— temporarily True to see SQL in consol
}

# NOTE: With async SQLite (sqlite+aiosqlite), no need for check_same_thread
engine = create_async_engine(database_url, **engine_args)


# -------------------------------------------------------------------
# Async session factory
# -------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# -------------------------------------------------------------------
# Declarative base for all models
# -------------------------------------------------------------------
Base = declarative_base()


# -------------------------------------------------------------------
# DB session dependency for FastAPI routes
# -------------------------------------------------------------------
async def get_db():
    """
    Provide a database session to API endpoints.

    Usage:
        async def route(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# -------------------------------------------------------------------
# Optional initializer (dev/local). In production use Alembic.
# Ensures ALL models are imported so metadata includes new tables.
# -------------------------------------------------------------------
async def init_db():
    """
    Initialize the database by creating all tables that don't exist.
    Prefer Alembic migrations in production.
    """
    async with engine.begin() as conn:
        # IMPORTANT: import every model module so tables are registered on Base.metadata
        from app.models import user, member, booking, recurring
        from app.models import resource, blackout, audit, recurring_exception  # NEW models
        from app.models import notification  # notification table

        # Create tables (no-op for existing tables)
        await conn.run_sync(Base.metadata.create_all)
