"""
Security utilities for password hashing and JWT tokens.

This module handles the cryptographic operations for authentication:
- Password hashing with bcrypt
- JWT token creation and verification
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from jose import jwt, JWTError
import bcrypt

from app.config import settings


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        The hashed password string (includes salt)
        
    Example:
        hashed = hash_password("mySecurePassword123")
        # Returns something like: $2b$12$LQv3c1yqBWV...
    """
    # Encode password to bytes, hash it, then decode back to string
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hash.
    
    Uses constant-time comparison to prevent timing attacks.
    
    Args:
        plain_password: The password to verify
        hashed_password: The stored hash to check against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(user_id: UUID, role: str) -> str:
    """
    Create a short-lived JWT access token.
    
    Access tokens are used for authenticating API requests.
    They expire quickly (15 min default) for security.
    
    Args:
        user_id: The user's UUID
        role: The user's role (member/admin)
        
    Returns:
        Encoded JWT string
    """
    # Calculate expiration time
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    
    # Build the token payload
    payload = {
        "sub": str(user_id),  # Subject (standard JWT claim)
        "role": role,
        "type": "access",
        "exp": expire,  # Expiration (standard JWT claim)
        "iat": datetime.utcnow(),  # Issued at (standard JWT claim)
    }
    
    # Sign and encode the token
    return jwt.encode(
        payload,
        settings.SESSION_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(user_id: UUID, role: str) -> str:
    """
    Create a long-lived JWT refresh token.
    
    Refresh tokens are used to obtain new access tokens
    without requiring the user to log in again.
    They last longer (7 days default) but are only used
    to get new access tokens, not for API calls.
    
    Args:
        user_id: The user's UUID
        role: The user's role
        
    Returns:
        Encoded JWT string
    """
    expire = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(
        payload,
        settings.SESSION_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    
    Verifies the signature and checks expiration.
    Returns None if token is invalid or expired.
    
    Args:
        token: The JWT string to decode
        
    Returns:
        The decoded payload dict, or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.SESSION_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        # Token is invalid, expired, or tampered with
        return None

