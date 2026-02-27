"""
Admin schemas for managing members and users.

Defines request/response schemas for admin operations.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class AdminUpdateMember(BaseModel):
    """
    Schema for admin updating member details.

    Admins can update:
    - Personal information (name, phone, email)
    - User role (MEMBER, COACH, ADMIN)
    - Membership status

    All fields are optional - only provided fields are updated.
    """
    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Updated full name"
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Updated phone number"
    )
    email: Optional[EmailStr] = Field(
        None,
        description="Updated email address"
    )
    role: Optional[str] = Field(
        None,
        description="User role: MEMBER, COACH, or ADMIN"
    )
    membership_status: Optional[str] = Field(
        None,
        description="Membership status: PENDING, ACTIVE, SUSPENDED, or CANCELLED"
    )
