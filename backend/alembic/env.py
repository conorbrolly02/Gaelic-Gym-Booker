"""
Alembic migration environment configuration.

This file configures how Alembic connects to the database
and runs migrations. It imports our models to enable autogeneration.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the parent directory to the path so we can import our app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our models and database config
from app.database import Base
from app.models import User, Member, Booking, RecurringPattern

# This is the Alembic Config object
config = context.config

# Get the database URL from environment variable
database_url = os.getenv("DATABASE_URL", "")
if database_url:
    # Alembic uses synchronous connections, so use psycopg2 driver
    if database_url.startswith("postgresql://"):
        # Keep as is for sync driver
        pass
    config.set_main_option("sqlalchemy.url", database_url)

# Set up Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for autogenerate support
# This allows Alembic to detect changes in our models
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    
    This generates SQL scripts without connecting to the database.
    Useful for generating migration SQL to run manually.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    
    Connects to the database and applies migrations directly.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
