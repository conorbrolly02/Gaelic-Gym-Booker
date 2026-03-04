"""
Pitch booking service with area-based conflict detection.

Implements business logic for:
- Pitch area conflict checking (whole, halves, quarters)
- Time slot generation with configurable parameters
- Availability calculation
- Pitch booking creation with validation
"""

from datetime import datetime, time, timedelta, date
from typing import List, Optional
from uuid import UUID
import zoneinfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.resource import Resource, ResourceType
from app.models.user import UserRole
from app.schemas.pitch import AvailabilitySlotOut, PitchBookingIn, PitchBookingOut
from app.config import settings


# ============================================================
# AREA CONFLICT LOGIC
# ============================================================

def areas_overlap(area_a: str, area_b: str) -> bool:
    """
    Check if two pitch areas conflict with each other.

    Conflict rules:
    - "whole" conflicts with everything
    - "half-left" covers quarter-tl and quarter-bl
    - "half-right" covers quarter-tr and quarter-br
    - "half-top" covers quarter-tl and quarter-tr
    - "half-bottom" covers quarter-bl and quarter-br
    - Quarters conflict with same quarter, their containing halves, and whole
    - Quarters on opposite sides do NOT conflict (e.g., quarter-tl vs quarter-br)

    Args:
        area_a: First area (whole, half-*, quarter-*)
        area_b: Second area

    Returns:
        True if areas conflict, False otherwise
    """
    # Normalize inputs
    a = area_a.lower()
    b = area_b.lower()

    # Same area always conflicts
    if a == b:
        return True

    # "whole" conflicts with everything
    if a == "whole" or b == "whole":
        return True

    # Define area relationships
    left_areas = {"half-left", "quarter-tl", "quarter-bl"}
    right_areas = {"half-right", "quarter-tr", "quarter-br"}
    top_areas = {"half-top", "quarter-tl", "quarter-tr"}
    bottom_areas = {"half-bottom", "quarter-bl", "quarter-br"}

    # Half-left vs quarters
    if a == "half-left" and b in left_areas:
        return True
    if b == "half-left" and a in left_areas:
        return True

    # Half-right vs quarters
    if a == "half-right" and b in right_areas:
        return True
    if b == "half-right" and a in right_areas:
        return True

    # Half-top vs quarters
    if a == "half-top" and b in top_areas:
        return True
    if b == "half-top" and a in top_areas:
        return True

    # Half-bottom vs quarters
    if a == "half-bottom" and b in bottom_areas:
        return True
    if b == "half-bottom" and a in bottom_areas:
        return True

    # No conflict (opposite halves or non-overlapping quarters)
    return False


def overlaps(
    a_start: datetime,
    a_end: datetime,
    b_start: datetime,
    b_end: datetime
) -> bool:
    """
    Check if two time ranges overlap.

    Uses half-open interval logic: [start, end)
    Overlaps if: a_start < b_end AND a_end > b_start

    Args:
        a_start: First range start
        a_end: First range end
        b_start: Second range start
        b_end: Second range end

    Returns:
        True if time ranges overlap

    Note:
        Handles both timezone-aware and timezone-naive datetimes by
        converting naive datetimes to UTC.
    """
    # Ensure all datetimes are timezone-aware for comparison
    # If naive, assume UTC
    if a_start.tzinfo is None:
        a_start = a_start.replace(tzinfo=zoneinfo.ZoneInfo("UTC"))
    if a_end.tzinfo is None:
        a_end = a_end.replace(tzinfo=zoneinfo.ZoneInfo("UTC"))
    if b_start.tzinfo is None:
        b_start = b_start.replace(tzinfo=zoneinfo.ZoneInfo("UTC"))
    if b_end.tzinfo is None:
        b_end = b_end.replace(tzinfo=zoneinfo.ZoneInfo("UTC"))

    return a_start < b_end and a_end > b_start


# ============================================================
# SLOT GENERATION
# ============================================================

def generate_slots(
    target_date: date,
    slot_minutes: int,
    timezone_str: str,
    open_time: time,
    close_time: time
) -> List[tuple[datetime, datetime]]:
    """
    Generate contiguous time slots for a given date in local time,
    then convert to UTC for storage.

    Args:
        target_date: Date to generate slots for
        slot_minutes: Duration of each slot (e.g., 60)
        timezone_str: Timezone name (e.g., "Europe/London")
        open_time: Opening time in local time (e.g., time(6, 0))
        close_time: Closing time in local time (e.g., time(0, 0) for midnight)

    Returns:
        List of (start_utc, end_utc) tuples

    Note:
        If close_time is 00:00, it's interpreted as midnight at the END of the day
        (i.e., the next day at 00:00).
    """
    tz = zoneinfo.ZoneInfo(timezone_str)

    # Create local start datetime
    local_start = datetime.combine(target_date, open_time, tzinfo=tz)

    # Handle close_time
    # If close_time is 00:00 and it's <= open_time, it means midnight of next day
    if close_time <= open_time and close_time == time(0, 0):
        # Midnight of next day
        local_end = datetime.combine(target_date + timedelta(days=1), close_time, tzinfo=tz)
    else:
        local_end = datetime.combine(target_date, close_time, tzinfo=tz)

    slots = []
    current = local_start

    while current + timedelta(minutes=slot_minutes) <= local_end:
        slot_start = current
        slot_end = current + timedelta(minutes=slot_minutes)

        # Convert to UTC for storage
        slots.append((
            slot_start.astimezone(zoneinfo.ZoneInfo("UTC")),
            slot_end.astimezone(zoneinfo.ZoneInfo("UTC"))
        ))

        current = slot_end

    return slots


# ============================================================
# PITCH BOOKING SERVICE
# ============================================================

class PitchBookingService:
    """Service for pitch booking operations with area-based conflict detection."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _area_conflicts_with_any(self, area: str, booked_areas: List[str]) -> bool:
        """Check if an area conflicts with any in a list of booked areas."""
        return any(areas_overlap(area, booked) for booked in booked_areas)

    async def get_pitch_availability(
        self,
        pitch_id: UUID,
        target_date: date,
        slot_minutes: int = 60,
        timezone_str: str = "Europe/London",
        open_time: time = time(17, 0),
        close_time: time = time(22, 0)
    ) -> List[AvailabilitySlotOut]:
        """
        Calculate availability for a pitch on a specific date.

        For each time slot, determines status:
        - "booked": Entire slot is unavailable (whole booked OR both halves OR all quarters)
        - "partial": Some areas booked but not fully covered
        - "free": No bookings

        Args:
            pitch_id: UUID of the pitch resource
            target_date: Date to check
            slot_minutes: Slot duration (default from env or 60)
            timezone_str: Timezone (default from env or "Europe/London")
            open_time: Opening time (default from env or 17:00)
            close_time: Closing time (default from env or 22:00)

        Returns:
            List of availability slots with status
        """
        # Generate time slots
        slots_list = generate_slots(
            target_date,
            slot_minutes,
            timezone_str,
            open_time,
            close_time
        )

        # Fetch all confirmed bookings for this pitch on the target date
        # Convert date to UTC range
        tz = zoneinfo.ZoneInfo(timezone_str)
        local_start = datetime.combine(target_date, time.min, tzinfo=tz)
        local_end = datetime.combine(target_date, time.max, tzinfo=tz)
        utc_start = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
        utc_end = local_end.astimezone(zoneinfo.ZoneInfo("UTC"))

        result = await self.db.execute(
            select(Booking)
            .where(Booking.resource_id == pitch_id)
            .where(Booking.status == BookingStatus.CONFIRMED)
            .where(Booking.start_time < utc_end)
            .where(Booking.end_time > utc_start)
        )
        bookings = result.scalars().all()

        # Determine status for each slot
        availability_slots = []

        for slot_start, slot_end in slots_list:
            overlapping = [
                b for b in bookings
                if overlaps(slot_start, slot_end, b.start_time, b.end_time)
            ]

            # All possible areas
            all_areas = [
                "whole", "half-left", "half-right", "half-top", "half-bottom",
                "quarter-tl", "quarter-tr", "quarter-bl", "quarter-br"
            ]

            if not overlapping:
                status = "free"
                booked_areas_list = []
                available_areas_list = all_areas
            else:
                # Extract booked areas
                booked_areas_set = {b.area for b in overlapping if b.area}

                # Determine if fully booked
                has_whole = "whole" in booked_areas_set
                has_both_halves = "half-left" in booked_areas_set and "half-right" in booked_areas_set
                all_quarters = {
                    "quarter-tl", "quarter-tr", "quarter-bl", "quarter-br"
                }
                has_all_quarters = all_quarters.issubset(booked_areas_set)

                if has_whole or has_both_halves or has_all_quarters:
                    status = "booked"
                    available_areas_list = []
                else:
                    status = "partial"
                    # Calculate which areas are still available
                    available_areas_list = []
                    for area in all_areas:
                        if not self._area_conflicts_with_any(area, list(booked_areas_set)):
                            available_areas_list.append(area)

                booked_areas_list = sorted(booked_areas_set)

            availability_slots.append(
                AvailabilitySlotOut(
                    start=slot_start,
                    end=slot_end,
                    status=status,
                    available_areas=available_areas_list,
                    booked_areas=booked_areas_list
                )
            )

        return availability_slots

    async def create_pitch_booking(
        self,
        data: PitchBookingIn,
        created_by_user_id: UUID,
        member_id_override: Optional[UUID] = None,
        user_role: Optional[UserRole] = None
    ) -> Booking:
        """
        Create a new pitch booking with area conflict validation.

        Args:
            data: Booking request data
            created_by_user_id: UUID of user creating the booking
            member_id_override: Optional member_id (for admin booking on behalf)
            user_role: User role for determining approval status

        Returns:
            Created Booking instance

        Raises:
            ValueError: If pitch not found, area conflicts, or other validation fails

        Note:
            Booking status is set based on user role:
            - ADMIN: Always CONFIRMED
            - COACH: PENDING_APPROVAL for pitches and ball wall
            - MEMBER: CONFIRMED for allowed resources
        """
        # 1. Validate pitch/ball wall exists and is active
        result = await self.db.execute(
            select(Resource)
            .where(Resource.id == data.pitch_id)
            .where(Resource.type.in_([ResourceType.PITCH, ResourceType.BALL_WALL]))
            .where(Resource.is_active == True)
        )
        pitch = result.scalar_one_or_none()

        if not pitch:
            raise ValueError(f"Pitch {data.pitch_id} not found or not active")

        # 2. Determine member_id
        final_member_id = member_id_override or data.member_id
        if not final_member_id:
            raise ValueError("member_id is required")

        # 3. Validate time range
        if data.start >= data.end:
            raise ValueError("start must be before end")

        # Use timezone-aware UTC now
        now_utc = datetime.now(zoneinfo.ZoneInfo("UTC"))
        if data.start < now_utc:
            raise ValueError("Cannot book in the past")

        # 4. Check for area conflicts
        result = await self.db.execute(
            select(Booking)
            .where(Booking.resource_id == data.pitch_id)
            .where(Booking.status == BookingStatus.CONFIRMED)
            .where(Booking.start_time < data.end)
            .where(Booking.end_time > data.start)
        )
        conflicting_bookings = result.scalars().all()

        for booking in conflicting_bookings:
            if booking.area and areas_overlap(data.area, booking.area):
                raise ValueError(
                    f"Area '{data.area}' conflicts with existing booking "
                    f"(area: {booking.area}, time: {booking.start_time} - {booking.end_time})"
                )

        # 5. Determine booking status based on user role
        # Coaches need approval for pitches and ball wall
        # Admins are auto-approved
        # Members should not reach this for pitches (UI restriction)
        if user_role == UserRole.COACH:
            booking_status = BookingStatus.PENDING_APPROVAL
        else:
            # Admin or no role specified (defaults to confirmed)
            booking_status = BookingStatus.CONFIRMED

        # 6. Create booking
        new_booking = Booking(
            member_id=final_member_id,
            resource_id=data.pitch_id,
            start_time=data.start,
            end_time=data.end,
            status=booking_status,
            booking_type=data.booking_type,
            party_size=data.party_size,
            area=data.area,
            title=data.title,
            requester_name=data.requester_name,
            team_name=data.team_name,
            notes=data.notes,
            created_by=created_by_user_id
        )

        self.db.add(new_booking)
        await self.db.commit()
        await self.db.refresh(new_booking)

        return new_booking
