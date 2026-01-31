"""
Authentication schemas for request/response validation.

These Pydantic models define the structure of auth-related
API requests and responses with automatic validation.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserCreate(BaseModel):
    """
    Schema for user registration requests.
    
    Validates that:
    - email is a valid email format
    - password meets minimum length
    - full_name is provided
    """
    email: EmailStr = Field(
        ...,  # Required field
        description="User's email address for login",
        examples=["member@example.com"]
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password (min 8 characters)",
        examples=["securePassword123"]
    )
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Member's full name",
        examples=["John O'Brien"]
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Optional phone number",
        examples=["+353 87 123 4567"]
    )


class UserLogin(BaseModel):
    """
    Schema for login requests.
    
    Only requires email and password.
    """
    email: EmailStr = Field(
        ...,
        description="Registered email address"
    )
    password: str = Field(
        ...,
        description="Account password"
    )


class UserResponse(BaseModel):
    """
    Schema for user data in responses.
    
    Never includes password_hash for security.
    Uses model_config to allow ORM model conversion.
    """
    id: UUID
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    model_config = {
        # Allow creating from SQLAlchemy models
        "from_attributes": True
    }


class TokenData(BaseModel):
    """
    Schema for JWT token payload data.
    
    Extracted from the JWT during authentication.
    """
    user_id: UUID
    role: str
    token_type: str = "access"  # "access" or "refresh"


class AuthResponse(BaseModel):
    """
    Schema for successful login/registration responses.
    """
    message: str
    user: UserResponse
    
    model_config = {
        "from_attributes": True
    }


class MessageResponse(BaseModel):
    """
    Simple message response for operations like logout.
    """
    message: str
