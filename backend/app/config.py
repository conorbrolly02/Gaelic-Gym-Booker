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
    
    # Minimum lead time for bookings in minutes (0 = can book up to start time)
    # Set to 0 to allow last-minute bookings, or higher to require advance notice
    MIN_BOOKING_LEAD_TIME_MINS: int = 0
    
    # Minimum booking duration in minutes
    MIN_BOOKING_DURATION_MINS: int = 30

    # Pitch booking configuration
    # Duration of each time slot in minutes
    PITCH_SLOT_MINUTES: int = 60
    # Opening time for pitches (24-hour format HH:MM) - 6am
    PITCH_OPEN_TIME: str = "06:00"
    # Closing time for pitches (24-hour format HH:MM) - midnight (00:00 next day)
    PITCH_CLOSE_TIME: str = "00:00"
    # Timezone for pitch booking times
    TIMEZONE: str = "Europe/London"

    # Gym booking configuration
    # Duration of each time slot in minutes
    GYM_SLOT_MINUTES: int = 90
    # Opening time for gym (24-hour format HH:MM) - midnight
    GYM_OPEN_TIME: str = "00:00"
    # Closing time for gym (24-hour format HH:MM) - midnight next day (24 hours)
    GYM_CLOSE_TIME: str = "00:00"

    # Email configuration (SMTP)
    # SMTP server hostname (e.g., smtp.gmail.com, smtp-mail.outlook.com)
    SMTP_HOST: Optional[str] = None
    # SMTP server port (587 for TLS, 465 for SSL, 25 for unencrypted)
    SMTP_PORT: int = 587
    # Email address to authenticate with SMTP server
    SMTP_USERNAME: Optional[str] = None
    # Password or app-specific password for SMTP authentication
    SMTP_PASSWORD: Optional[str] = None
    # Email address that appears in the "From" field
    SMTP_FROM_EMAIL: Optional[str] = None
    # Display name that appears in the "From" field
    SMTP_FROM_NAME: str = "Gaelic Gym Booker"
    # Enable/disable TLS encryption (recommended for port 587)
    SMTP_USE_TLS: bool = True
    # Enable/disable SSL encryption (for port 465)
    SMTP_USE_SSL: bool = False
    # Admin email addresses (comma-separated) for notifications
    ADMIN_EMAILS: str = ""

    class Config:
        # Load from .env file if it exists (useful for local development)
        env_file = ".env"
        # Be case-insensitive when matching env var names
        case_sensitive = False


# Create a singleton settings instance
# This is imported throughout the app: from app.config import settings
settings = Settings()

