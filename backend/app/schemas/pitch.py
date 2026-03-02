"""
Pydantic schemas for pitch booking endpoints.

Defines request/response models for pitch resources and pitch bookings.
"""

from datetime import datetime, date, time
from typing import Literal, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ============================================================
# AREA SELECTION TYPE
# ============================================================

AreaSelection = Literal[
    "whole",
    "half-left",
    "half-right",
    "half-top",
    "half-bottom",
    "quarter-tl",
    "quarter-tr",
    "quarter-bl",
    "quarter-br"
]


# ============================================================
# RESOURCE SCHEMAS
# ============================================================

class PitchOut(BaseModel):
    """
    Response model for a pitch resource.

    Attributes:
        id: Unique identifier for the pitch
        name: Display name (e.g., "Main Pitch", "Minor Pitch")
        surface: Optional surface type (e.g., "Grass", "Artificial Turf")
        location: Optional location description
        type: Resource type (should be "PITCH")
        capacity: Maximum concurrent bookings
        buffer_mins: Buffer time between bookings
        is_active: Whether the pitch is available for booking
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    surface: Optional[str] = None
    location: Optional[str] = None
    type: str  # Should be "PITCH"
    capacity: int
    buffer_mins: int
    is_active: bool


# ============================================================
# AVAILABILITY SCHEMAS
# ============================================================

class AvailabilitySlotOut(BaseModel):
    """
    Single availability slot for a pitch on a specific date.

    Shows time window and booking status:
    - "free": No bookings, all areas available
    - "partial": Some areas booked but not entire pitch
    - "booked": Entire pitch unavailable (whole booked OR both halves OR all quarters)

    Attributes:
        start: Slot start time (timezone-aware)
        end: Slot end time (timezone-aware)
        status: Availability status
        available_areas: List of areas that are available for booking
        booked_areas: List of areas that are already booked
    """
    start: datetime
    end: datetime
    status: Literal["free", "partial", "booked"]
    available_areas: List[str] = []
    booked_areas: List[str] = []


class PitchAvailabilityOut(BaseModel):
    """
    Response for GET /api/pitches/{pitch_id}/availability.

    Attributes:
        pitch_id: ID of the pitch
        date: Date in YYYY-MM-DD format
        slots: List of availability slots for the date
    """
    pitch_id: UUID
    date: str  # YYYY-MM-DD format
    slots: List[AvailabilitySlotOut]


# ============================================================
# BOOKING SCHEMAS
# ============================================================

class PitchBookingIn(BaseModel):
    """
    Request body for creating a pitch booking.
    Used by POST /api/bookings/pitch.

    Attributes:
        pitch_id: UUID of the pitch to book
        start: Booking start time (timezone-aware UTC)
        end: Booking end time (timezone-aware UTC)
        title: Booking title/description (min 3 chars)
        requester_name: Name of person making the booking
        team_name: Optional team/organization name
        notes: Optional additional notes
        area: Pitch area to book (default: "whole")
        booking_type: Type of booking (SINGLE or TEAM)
        party_size: Number of people (1-20)
        member_id: Optional member_id (for admin booking on behalf)
    """
    pitch_id: UUID
    start: datetime
    end: datetime
    title: str = Field(..., min_length=3, description="Booking title (minimum 3 characters)")
    requester_name: str = Field(..., min_length=2, description="Name of person requesting booking")
    team_name: Optional[str] = Field(None, description="Optional team or organization name")
    notes: Optional[str] = Field(None, description="Optional additional notes")
    area: AreaSelection = Field(default="whole", description="Area of pitch to book")
    booking_type: Literal["SINGLE", "TEAM"] = Field(default="SINGLE", description="Booking type")
    party_size: int = Field(default=1, ge=1, le=20, description="Number of people (1-20)")
    member_id: Optional[UUID] = Field(None, description="Member ID (for admin use)")

    @field_validator('end')
    @classmethod
    def validate_end_after_start(cls, v: datetime, info) -> datetime:
        """Validate that end time is after start time."""
        if 'start' in info.data and v <= info.data['start']:
            raise ValueError('end time must be after start time')
        return v

    @field_validator('start', 'end', mode='before')
    @classmethod
    def validate_timezone_aware(cls, v) -> datetime:
        """Validate that datetime is timezone-aware."""
        # If it's already a datetime, check timezone
        if isinstance(v, datetime):
            if v.tzinfo is None:
                raise ValueError('datetime must be timezone-aware')
            return v
        # If it's a string, let Pydantic parse it (will preserve timezone)
        return v


class PitchBookingOut(BaseModel):
    """
    Response model for a pitch booking.

    Attributes:
        id: Unique booking identifier
        pitch_id: ID of the booked pitch (stored in resource_id)
        start: Booking start time
        end: Booking end time
        title: Booking title
        requester_name: Name of requester
        team_name: Optional team name
        notes: Optional notes
        area: Pitch area booked
        booking_type: Type of booking (SINGLE or TEAM)
        party_size: Number of people
        created_at: When the booking was created
        member_id: ID of member who made the booking
        status: Booking status (CONFIRMED/CANCELLED)
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    pitch_id: Optional[UUID] = None  # Mapped from resource_id
    start: datetime  # Mapped from start_time
    end: datetime    # Mapped from end_time
    title: Optional[str] = None
    requester_name: Optional[str] = None
    team_name: Optional[str] = None
    notes: Optional[str] = None
    area: Optional[str] = None
    booking_type: Literal["SINGLE", "TEAM"] = "SINGLE"
    party_size: int = 1
    created_at: datetime
    member_id: UUID
    status: Literal["CONFIRMED", "CANCELLED"]
    resource_name: Optional[str] = None  # Added for calendar display

    @classmethod
    def from_booking(cls, booking):
        """
        Create PitchBookingOut from a Booking model instance.

        Maps fields from the generic Booking model to pitch-specific schema.
        """
        # Get resource name if available
        resource_name = None
        if hasattr(booking, 'resource') and booking.resource:
            resource_name = booking.resource.name

        return cls(
            id=booking.id,
            pitch_id=booking.resource_id,
            start=booking.start_time,
            end=booking.end_time,
            title=getattr(booking, 'title', None),
            requester_name=getattr(booking, 'requester_name', None),
            team_name=getattr(booking, 'team_name', None),
            notes=getattr(booking, 'notes', None),
            area=booking.area,
            booking_type=booking.booking_type.value if hasattr(booking.booking_type, 'value') else booking.booking_type,
            party_size=booking.party_size,
            created_at=booking.created_at,
            member_id=booking.member_id,
            status=booking.status.value,
            resource_name=resource_name
        )


# ============================================================
# RECURRING PITCH BOOKING SCHEMAS
# ============================================================

class RecurringPitchBookingIn(BaseModel):
    """
    Request body for creating a recurring pitch booking pattern.

    Attributes:
        pitch_id: UUID of the pitch to book
        pattern_type: "daily" or "weekly"
        days_of_week: List of day numbers (0=Sunday, 6=Saturday) for weekly
        start_time: Time of day for each booking
        duration_mins: Duration of each booking in minutes
        valid_from: First date for the pattern
        valid_until: Last date for the pattern
        title: Booking title
        requester_name: Name of requester
        team_name: Optional team name
        notes: Optional notes
        area: Pitch area to book
        booking_type: SINGLE or TEAM
        party_size: Number of people (1-20)
    """
    pitch_id: UUID
    pattern_type: Literal["daily", "weekly"]
    days_of_week: List[int] = Field(default_factory=list, description="Days for weekly pattern (0=Sunday, 6=Saturday)")
    start_time: time = Field(..., description="Time of day for bookings")
    duration_mins: int = Field(..., gt=0, le=480, description="Duration in minutes (max 8 hours)")
    valid_from: date = Field(..., description="First date for pattern")
    valid_until: date = Field(..., description="Last date for pattern")
    title: str = Field(..., min_length=3, description="Booking title")
    requester_name: str = Field(..., min_length=2, description="Requester name")
    team_name: Optional[str] = None
    notes: Optional[str] = None
    area: AreaSelection = Field(default="whole", description="Area of pitch to book")
    booking_type: Literal["SINGLE", "TEAM"] = Field(default="SINGLE")
    party_size: int = Field(default=1, ge=1, le=20)

    @field_validator('pattern_type')
    @classmethod
    def validate_pattern_type(cls, v):
        """Ensure pattern_type is valid."""
        if v not in ["daily", "weekly"]:
            raise ValueError("pattern_type must be 'daily' or 'weekly'")
        return v

    @field_validator('days_of_week')
    @classmethod
    def validate_days_of_week(cls, v, info):
        """Validate days_of_week values."""
        pattern_type = info.data.get('pattern_type')
        if pattern_type == 'weekly' and len(v) == 0:
            raise ValueError("days_of_week required for weekly patterns")
        for day in v:
            if day < 0 or day > 6:
                raise ValueError("days_of_week values must be 0-6")
        return v

    @field_validator('valid_until')
    @classmethod
    def validate_date_range(cls, valid_until, info):
        """Ensure valid_until is after valid_from."""
        valid_from = info.data.get('valid_from')
        if valid_from and valid_until < valid_from:
            raise ValueError("valid_until must be after valid_from")
        return valid_until


class RecurringPitchBookingOut(BaseModel):
    """
    Response for creating a recurring pitch booking pattern.

    Attributes:
        bookings_created: Number of bookings successfully created
        conflicts_skipped: Number of bookings skipped due to conflicts
    """
    bookings_created: int
    conflicts_skipped: int
