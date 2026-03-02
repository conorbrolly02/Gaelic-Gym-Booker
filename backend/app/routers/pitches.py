"""
Pitch resource router.

Handles endpoints for:
- Listing available pitches
- Checking pitch availability by date
- Creating pitch bookings
"""

from datetime import date, time
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_member, require_admin
from app.models.resource import Resource, ResourceType
from app.models.member import Member
from app.models.user import User
from app.schemas.pitch import (
    PitchOut,
    PitchAvailabilityOut,
    PitchBookingIn,
    PitchBookingOut,
    AvailabilitySlotOut,
    RecurringPitchBookingIn,
    RecurringPitchBookingOut
)
from app.services.pitch_booking import PitchBookingService
from app.config import settings


router = APIRouter(prefix="/pitches", tags=["pitches"])


# ============================================================
# PITCH LISTING
# ============================================================

@router.get(
    "",
    response_model=List[PitchOut],
    summary="List all pitches"
)
async def list_pitches(
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Get list of all active pitch resources.

    Returns pitch details including:
    - ID
    - Name (e.g., "Main Pitch", "Minor Pitch")
    - Capacity
    - Buffer time between bookings
    """
    result = await db.execute(
        select(Resource)
        .where(Resource.type == ResourceType.PITCH)
        .where(Resource.is_active == True)
        .order_by(Resource.name)
    )
    pitches = result.scalars().all()

    return pitches


# ============================================================
# PITCH AVAILABILITY
# ============================================================

@router.get(
    "/{pitch_id}/availability",
    response_model=PitchAvailabilityOut,
    summary="Check pitch availability"
)
async def get_pitch_availability(
    pitch_id: UUID,
    date_param: str = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Get availability for a specific pitch on a given date.

    Returns time slots with status:
    - "free": No bookings, all areas available
    - "partial": Some areas booked but not entire pitch
    - "booked": Entire pitch unavailable (whole booked OR both halves OR all quarters)

    Query parameters:
    - date: Target date in YYYY-MM-DD format (e.g., "2026-02-25")

    Configuration (from env or defaults):
    - PITCH_SLOT_MINUTES: Duration of each slot (default 60)
    - PITCH_OPEN_TIME: Opening time (default 17:00)
    - PITCH_CLOSE_TIME: Closing time (default 22:00)
    - TIMEZONE: Timezone for slot generation (default Europe/London)
    """
    # Parse date
    try:
        target_date = date.fromisoformat(date_param)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )

    # Verify pitch/ball wall exists (support both resource types)
    result = await db.execute(
        select(Resource)
        .where(Resource.id == pitch_id)
        .where(Resource.type.in_([ResourceType.PITCH, ResourceType.BALL_WALL]))
        .where(Resource.is_active == True)
    )
    pitch = result.scalar_one_or_none()

    if not pitch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pitch {pitch_id} not found or inactive"
        )

    # Get configuration (use env vars if available, otherwise defaults)
    slot_minutes = getattr(settings, "PITCH_SLOT_MINUTES", 60)
    open_time_str = getattr(settings, "PITCH_OPEN_TIME", "17:00")
    close_time_str = getattr(settings, "PITCH_CLOSE_TIME", "22:00")
    timezone_str = getattr(settings, "TIMEZONE", "Europe/London")

    # Parse times
    open_hour, open_min = map(int, open_time_str.split(":"))
    close_hour, close_min = map(int, close_time_str.split(":"))
    open_time_obj = time(open_hour, open_min)
    close_time_obj = time(close_hour, close_min)

    # Get availability
    service = PitchBookingService(db)
    slots = await service.get_pitch_availability(
        pitch_id=pitch_id,
        target_date=target_date,
        slot_minutes=slot_minutes,
        timezone_str=timezone_str,
        open_time=open_time_obj,
        close_time=close_time_obj
    )

    return PitchAvailabilityOut(
        pitch_id=pitch_id,
        date=date_param,
        slots=slots
    )


# ============================================================
# PITCH BOOKING CREATION
# ============================================================

@router.post(
    "/bookings",
    response_model=PitchBookingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create pitch booking"
)
async def create_pitch_booking(
    booking_data: PitchBookingIn,
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Create a new pitch booking with area specification.

    Request body:
    - pitch_id: UUID of the pitch to book
    - start_time: Booking start (UTC datetime)
    - end_time: Booking end (UTC datetime)
    - area: One of: "whole", "half-left", "half-right",
            "quarter-tl", "quarter-tr", "quarter-bl", "quarter-br"

    Conflict rules:
    - "whole" conflicts with any other booking
    - "half-left" conflicts with quarter-tl and quarter-bl
    - "half-right" conflicts with quarter-tr and quarter-br
    - Quarters conflict with same quarter, their containing half, and whole
    - Quarters on opposite half do NOT conflict

    Returns:
    - 201 Created with booking details on success
    - 409 Conflict if area/time conflicts with existing booking
    - 400 Bad Request for validation errors
    """
    service = PitchBookingService(db)

    try:
        booking = await service.create_pitch_booking(
            data=booking_data,
            created_by_user_id=member.user_id,
            member_id_override=member.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

    return PitchBookingOut.from_booking(booking)


# ============================================================
# ADMIN: CREATE PITCH BOOKING FOR MEMBER
# ============================================================

@router.post(
    "/bookings/admin",
    response_model=PitchBookingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create pitch booking for member"
)
async def admin_create_pitch_booking(
    booking_data: PitchBookingIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Admin endpoint to create a pitch booking on behalf of any member.

    Requires:
    - Admin role
    - member_id in request body

    Returns:
    - 201 Created with booking details
    - 403 Forbidden if not admin
    - 409 Conflict if area/time conflicts
    """
    if not booking_data.member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="member_id is required for admin bookings"
        )

    service = PitchBookingService(db)

    try:
        booking = await service.create_pitch_booking(
            data=booking_data,
            created_by_user_id=admin.id,
            member_id_override=booking_data.member_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

    return PitchBookingOut.from_booking(booking)


# ============================================================
# RECURRING PITCH BOOKINGS
# ============================================================

@router.post(
    "/bookings/recurring",
    response_model=RecurringPitchBookingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create recurring pitch booking"
)
async def create_recurring_pitch_booking(
    booking_data: RecurringPitchBookingIn,
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Create a recurring pitch booking pattern.

    Generates multiple bookings based on the pattern:
    - Daily: Creates bookings for each day in the date range
    - Weekly: Creates bookings for specified days of the week

    Returns:
    - bookings_created: Number of successful bookings
    - conflicts_skipped: Number of bookings skipped due to conflicts

    Note: Bookings that conflict with existing bookings are skipped,
    not rejected. This allows partial pattern creation.
    """
    from datetime import timedelta, datetime, timezone as tz

    # Verify pitch exists
    result = await db.execute(
        select(Resource)
        .where(Resource.id == booking_data.pitch_id)
        .where(Resource.is_active == True)
    )
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pitch {booking_data.pitch_id} not found"
        )

    service = PitchBookingService(db)
    bookings_created = 0
    conflicts_skipped = 0

    # Generate dates based on pattern
    current_date = booking_data.valid_from
    while current_date <= booking_data.valid_until:
        # Check if this date should have a booking
        should_book = False
        if booking_data.pattern_type == "daily":
            should_book = True
        elif booking_data.pattern_type == "weekly":
            # 0=Sunday, 1=Monday, ..., 6=Saturday
            day_of_week = (current_date.weekday() + 1) % 7  # Convert Python's 0=Monday to 0=Sunday
            should_book = day_of_week in booking_data.days_of_week

        if should_book:
            # Create booking for this date
            start_datetime = datetime.combine(current_date, booking_data.start_time)
            # Make timezone aware (UTC)
            start_datetime = start_datetime.replace(tzinfo=tz.utc)
            end_datetime = start_datetime + timedelta(minutes=booking_data.duration_mins)

            # Create booking data
            pitch_booking_data = PitchBookingIn(
                pitch_id=booking_data.pitch_id,
                start=start_datetime,
                end=end_datetime,
                title=booking_data.title,
                requester_name=booking_data.requester_name,
                team_name=booking_data.team_name,
                notes=booking_data.notes,
                area=booking_data.area,
                booking_type=booking_data.booking_type,
                party_size=booking_data.party_size
            )

            try:
                await service.create_pitch_booking(
                    data=pitch_booking_data,
                    created_by_user_id=member.user_id,
                    member_id_override=member.id
                )
                bookings_created += 1
            except ValueError:
                # Conflict detected, skip this booking
                conflicts_skipped += 1

        current_date += timedelta(days=1)

    await db.commit()

    return RecurringPitchBookingOut(
        bookings_created=bookings_created,
        conflicts_skipped=conflicts_skipped
    )
