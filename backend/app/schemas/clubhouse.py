"""
Clubhouse booking schemas.

Handles validation for multi-room clubhouse bookings.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class ClubhouseRoomResponse(BaseModel):
    """Response schema for a single clubhouse room resource."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    capacity: int
    buffer_mins: int
    is_active: bool


class ClubhouseBookingCreate(BaseModel):
    """
    Request body for creating a clubhouse booking.
    Supports booking multiple rooms at once.
    """
    room_ids: List[UUID] = Field(..., min_length=1, description="List of room IDs to book")
    start_time: datetime = Field(..., description="Booking start time")
    end_time: datetime = Field(..., description="Booking end time")
    purpose: str = Field(..., min_length=1, max_length=500, description="Purpose of the booking")
    contact_name: Optional[str] = Field(None, max_length=100, description="Contact person name")
    contact_phone: Optional[str] = Field(None, max_length=20, description="Contact phone number")


class ClubhouseBookingResponse(BaseModel):
    """Response schema for a clubhouse booking."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    resource_id: UUID
    resource_name: str
    start_time: datetime
    end_time: datetime
    status: str
    purpose: Optional[str] = None
    contact_name: Optional[str] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class ClubhouseBookingGroup(BaseModel):
    """
    Response schema for a multi-room booking group.
    Contains all bookings created together for multiple rooms.
    """
    booking_id: UUID  # Primary booking ID (first room)
    room_names: List[str]
    room_count: int
    start_time: datetime
    end_time: datetime
    purpose: str
    status: str
    bookings: List[ClubhouseBookingResponse]


class ClubhouseAvailabilityRequest(BaseModel):
    """Request to check availability for multiple rooms."""
    room_ids: List[UUID] = Field(..., min_length=1)
    start_time: datetime
    end_time: datetime


class RoomAvailability(BaseModel):
    """Availability status for a single room."""
    room_id: UUID
    room_name: str
    is_available: bool
    conflicting_bookings: List[ClubhouseBookingResponse] = []


class ClubhouseAvailabilityResponse(BaseModel):
    """Response for availability check."""
    all_available: bool
    rooms: List[RoomAvailability]
