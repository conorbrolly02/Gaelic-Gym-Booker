"""
Booking schemas for request/response validation.

Define the structure of booking-related API data.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from app.config import settings


class BookingCreate(BaseModel):
    """
    Schema for creating a new booking.
    
    Validates that:
    - end_time is after start_time
    - duration doesn't exceed maximum
    - booking isn't too far in the future
    """
    start_time: datetime = Field(
        ...,
        description="When the booking starts"
    )
    end_time: datetime = Field(
        ...,
        description="When the booking ends"
    )
    
    @field_validator("end_time")
    @classmethod
    def validate_end_after_start(cls, end_time, info):
        """Ensure end_time is after start_time."""
        start_time = info.data.get("start_time")
        if start_time and end_time <= start_time:
            raise ValueError("end_time must be after start_time")
        return end_time
    
    @field_validator("end_time")
    @classmethod
    def validate_duration(cls, end_time, info):
        """Ensure booking doesn't exceed maximum duration."""
        start_time = info.data.get("start_time")
        if start_time:
            duration = end_time - start_time
            max_duration = timedelta(minutes=settings.MAX_BOOKING_DURATION_MINS)
            if duration > max_duration:
                raise ValueError(
                    f"Booking duration cannot exceed {settings.MAX_BOOKING_DURATION_MINS} minutes"
                )
        return end_time
    
    @field_validator("start_time")
    @classmethod
    def validate_not_in_past(cls, start_time):
        """Ensure booking isn't in the past."""
        if start_time < datetime.now(start_time.tzinfo):
            raise ValueError("Cannot book time slots in the past")
        return start_time
    
    @field_validator("start_time")
    @classmethod
    def validate_advance_limit(cls, start_time):
        """Ensure booking isn't too far in advance."""
        max_advance = datetime.now(start_time.tzinfo) + timedelta(
            days=settings.MAX_BOOKING_ADVANCE_DAYS
        )
        if start_time > max_advance:
            raise ValueError(
                f"Cannot book more than {settings.MAX_BOOKING_ADVANCE_DAYS} days in advance"
            )
        return start_time


class AdminBookingCreate(BaseModel):
    """
    Schema for admin creating a booking on behalf of a member.
    
    Includes member_id since admin is booking for someone else.
    """
    member_id: UUID = Field(
        ...,
        description="Member to create booking for"
    )
    start_time: datetime = Field(
        ...,
        description="When the booking starts"
    )
    end_time: datetime = Field(
        ...,
        description="When the booking ends"
    )


class BookingResponse(BaseModel):
    """
    Schema for booking data in responses.
    """
    id: UUID
    member_id: UUID
    start_time: datetime
    end_time: datetime
    status: str
    recurring_pattern_id: Optional[UUID]
    created_by: UUID
    cancelled_by: Optional[UUID]
    cancelled_at: Optional[datetime]
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class BookingWithMemberResponse(BaseModel):
    """
    Extended booking response with member details.
    
    Used in admin views where member info is needed.
    """
    id: UUID
    member_id: UUID
    member_name: str
    member_email: str
    start_time: datetime
    end_time: datetime
    status: str
    recurring_pattern_id: Optional[UUID]
    created_by: UUID
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class SlotAvailability(BaseModel):
    """
    Availability info for a specific time slot.
    """
    start_time: datetime
    end_time: datetime
    booked_count: int
    available: int
    max_capacity: int = settings.GYM_MAX_CAPACITY


class AvailabilityResponse(BaseModel):
    """
    Response for availability check endpoint.
    """
    date: str
    slots: List[SlotAvailability]


class PaginatedBookingsResponse(BaseModel):
    """
    Paginated list of bookings.
    """
    bookings: List[BookingResponse]
    total: int
    page: int
    limit: int
