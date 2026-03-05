"""
Member schemas for request/response validation.

Define the structure of member-related API data.
"""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class MemberCreate(BaseModel):
    """
    Schema for creating a member profile.
    
    Used internally when registering a new user.
    """
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Member's full name"
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Contact phone number"
    )


class MemberUpdate(BaseModel):
    """
    Schema for updating member profile.

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
    qr_code: Optional[str] = Field(
        None,
        max_length=100000,
        description="QR code for gym access (base64 or URL)"
    )


class MemberResponse(BaseModel):
    """
    Schema for member data in responses.
    """
    id: UUID
    user_id: UUID
    full_name: str
    phone: Optional[str]
    qr_code: Optional[str]
    membership_status: str
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class MemberWithUserResponse(BaseModel):
    """
    Extended member response including user email.
    
    Used in admin endpoints where email visibility is needed.
    """
    id: UUID
    user_id: UUID
    email: str  # From related User
    full_name: str
    phone: Optional[str]
    membership_status: str
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class MemberStats(BaseModel):
    """
    Statistics about a member for admin views.
    """
    id: UUID
    full_name: str
    membership_status: str
    total_bookings: int
    upcoming_bookings: int


class MemberAnalytics(BaseModel):
    """
    Detailed analytics about a member's booking history.
    Used in the member profile page.
    """
    total_bookings: int = Field(description="Total number of bookings made")
    upcoming_bookings: int = Field(description="Number of upcoming bookings")
    completed_bookings: int = Field(description="Number of completed bookings")
    cancelled_bookings: int = Field(description="Number of cancelled bookings")

    # Bookings by facility type
    gym_bookings: int = Field(default=0, description="Number of gym bookings")
    pitch_bookings: int = Field(default=0, description="Number of pitch bookings")
    clubhouse_bookings: int = Field(default=0, description="Number of clubhouse bookings")
    ball_wall_bookings: int = Field(default=0, description="Number of ball wall bookings")

    # Time-based stats
    total_hours_booked: float = Field(default=0.0, description="Total hours booked across all facilities")

    # Membership info
    member_since: datetime = Field(description="Member registration date")
    days_as_member: int = Field(description="Number of days since registration")
