from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional, Literal, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# EXISTING/CORE REQUEST MODELS
# ============================================================

class BookingCreate(BaseModel):
    """
    Request body for creating a single booking.
    Used by POST /bookings.
    """
    start_time: datetime
    end_time: datetime
    booking_type: Literal["SINGLE", "TEAM"] = "SINGLE"
    party_size: int = Field(ge=1, le=20)


class AdminBookingCreate(BookingCreate):
    """
    Request body for admin creating a booking for a member.
    Used by POST /admin/bookings.
    Extends BookingCreate with member_id field.
    """
    member_id: UUID


# ============================================================
# NEW REQUEST MODELS (for edit + cancel + series features)
# ============================================================

class EditScope(str, enum.Enum):
    """Which part of a recurring series an edit should apply to."""
    THIS = "THIS"
    FUTURE = "FUTURE"
    SERIES = "SERIES"


class EditBookingRequest(BaseModel):
    """
    Request body for editing a booking.
    Used by PATCH /bookings/{id}.
    Supports:
    - optimistic locking (version)
    - partial updates
    - series-aware edits (scope)
    """
    version: int                              # ← REQUIRED for optimistic locking
    resource_id: Optional[UUID] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    party_size: Optional[int] = Field(default=None, ge=1, le=20)
    scope: EditScope = EditScope.THIS
    reason: Optional[str] = None              # free text audit note


class CancelBookingRequest(BaseModel):
    """
    Request body for cancelling a booking.
    Used by POST /bookings/{id}/cancel.
    """
    reason_code: Optional[str] = None         # ← maps to backend CancelReason enum
    note: Optional[str] = None                # ← stored in booking + audit log


# ============================================================
# RESPONSE MODELS
# ============================================================

class BookingResponse(BaseModel):
    """
    Response shape for a booking entity.
    Mirrors server ORM fields.
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    resource_id: Optional[UUID] = None        # filled once resources model is live
    start_time: datetime
    end_time: datetime
    status: Literal["CONFIRMED", "CANCELLED"]
    booking_type: Literal["SINGLE", "TEAM"]
    party_size: int

    recurring_pattern_id: Optional[UUID] = None
    created_by: UUID
    cancelled_by: Optional[UUID] = None
    cancelled_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    # Optional fields added in advanced booking features
    override_reason: Optional[str] = None
    cancel_reason: Optional[str] = None
    cancel_note: Optional[str] = None
    version: Optional[int] = None            # ← supports optimistic locking

    # Populated from relationships for enhanced display
    resource_name: Optional[str] = None       # Name of facility (Gym, Main Pitch, etc.)
    creator_name: Optional[str] = None        # Name of user who created booking

    @classmethod
    def from_booking(cls, booking):
        """Create BookingResponse from Booking model with enriched data."""
        data = {
            "id": booking.id,
            "member_id": booking.member_id,
            "resource_id": booking.resource_id,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "status": booking.status.value if hasattr(booking.status, 'value') else booking.status,
            "booking_type": booking.booking_type.value if hasattr(booking.booking_type, 'value') else booking.booking_type,
            "party_size": booking.party_size,
            "recurring_pattern_id": booking.recurring_pattern_id,
            "created_by": booking.created_by,
            "cancelled_by": booking.cancelled_by,
            "cancelled_at": booking.cancelled_at,
            "created_at": booking.created_at,
            "updated_at": booking.updated_at,
            # Enrich with resource name if available
            "resource_name": booking.resource.name if booking.resource else "Main Gym",
            # Enrich with creator name if available
            "creator_name": booking.creator.email if booking.creator else None,
        }
        return cls(**data)


class PaginatedBookingsResponse(BaseModel):
    """
    Response for GET /bookings (with pagination).
    """
    bookings: List[BookingResponse]
    total: int
    page: int
    limit: int


# ============================================================
# AVAILABILITY MODELS
# ============================================================

class AvailabilitySlot(BaseModel):
    """
    One slot entry in the availability response.
    """
    start_time: datetime
    end_time: datetime
    booked: int = 0
    available: int = 0


class AvailabilityResponse(BaseModel):
    """
    Response for GET /bookings/availability.
    """
    date: str
    slots: List[AvailabilitySlot]