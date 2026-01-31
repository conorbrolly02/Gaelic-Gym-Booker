"""
Database connection and session management.

This module sets up the async SQLAlchemy engine and provides
a dependency for getting database sessions in API endpoints.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# Convert the DATABASE_URL to use asyncpg driver
# Replit provides: postgresql://user:pass@host:port/db?sslmode=require
# We need: postgresql+asyncpg://user:pass@host:port/db (without sslmode for asyncpg)
database_url = settings.DATABASE_URL

# Replace driver prefix
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode parameter as asyncpg uses ssl=True/False instead
# Parse and remove sslmode from query string
if "?" in database_url:
    base_url, query_string = database_url.split("?", 1)
    params = query_string.split("&")
    filtered_params = [p for p in params if not p.startswith("sslmode=")]
    if filtered_params:
        database_url = base_url + "?" + "&".join(filtered_params)
    else:
        database_url = base_url

# Create the async database engine
# pool_pre_ping: Checks connection health before using from pool
# echo: Set to True to log all SQL queries (useful for debugging)
engine = create_async_engine(
    database_url,
    pool_pre_ping=True,
    echo=False,  # Set to True to see SQL queries in logs
)

# Session factory for creating database sessions
# expire_on_commit=False: Don't expire objects after commit
#   (allows us to use objects after the session closes)
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for all SQLAlchemy models
# All models inherit from this to get ORM functionality
Base = declarative_base()


async def get_db():
    """
    Dependency that provides a database session to API endpoints.
    
    Usage in a route:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    
    The session is automatically closed after the request completes,
    even if an exception occurs (thanks to try/finally).
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """
    Initialize the database by creating all tables.
    
    This is called on application startup. In production,
    you'd typically use Alembic migrations instead.
    """
    async with engine.begin() as conn:
        # Import all models so they're registered with Base
        from app.models import user, member, booking, recurring
        # Create all tables that don't exist yet
        await conn.run_sync(Base.metadata.create_all)
