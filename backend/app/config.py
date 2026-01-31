"""
Configuration settings for the Gym Booking API.

This module uses Pydantic Settings to load configuration from environment variables.
All sensitive values (database URL, secret keys) come from environment variables
for security - never hardcode secrets in source code.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Pydantic Settings automatically reads from environment variables
    matching the field names (case-insensitive).
    """
    
    # Database connection string - provided by Replit's PostgreSQL
    # Format: postgresql+asyncpg://user:password@host:port/database
    DATABASE_URL: str
    
    # Secret key for signing JWT tokens - must be kept secret!
    # Generate with: openssl rand -hex 32
    SESSION_SECRET: str
    
    # JWT token configuration
    # Access tokens expire quickly for security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    # Refresh tokens last longer for user convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Algorithm used for JWT signing
    # HS256 = HMAC with SHA-256, a symmetric signing algorithm
    JWT_ALGORITHM: str = "HS256"
    
    # Maximum number of people allowed in the gym at once
    GYM_MAX_CAPACITY: int = 20
    
    # Maximum booking duration in minutes (8 hours)
    MAX_BOOKING_DURATION_MINS: int = 480
    
    # How far in advance bookings can be made (365 days)
    MAX_BOOKING_ADVANCE_DAYS: int = 365
    
    class Config:
        # Load from .env file if it exists (useful for local development)
        env_file = ".env"
        # Be case-insensitive when matching env var names
        case_sensitive = False


# Create a singleton settings instance
# This is imported throughout the app: from app.config import settings
settings = Settings()
