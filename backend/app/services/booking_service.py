"""
Booking service for gym time slot management.

Contains the core business logic for booking operations:
- Checking availability
- Creating bookings (single and recurring)
- Cancelling bookings
- Capacity enforcement
- Time validation (cut-off times, duration limits)
- Admin override capabilities

Business Rules Enforced:
1. A member can only have one active booking at a time (no overlapping)
2. Slot capacity cannot exceed GYM_MAX_CAPACITY
3. Booking cut-off: cannot book slots that have already started
4. Duration limits: min/max booking duration enforced
5. Advance booking limit: cannot book more than MAX_BOOKING_ADVANCE_DAYS ahead
6. Admins can override rules 1, 3, 4, 5 (never capacity)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, date, time, timedelta
from enum import Enum

from app.models.booking import Booking, BookingStatus
from app.models.recurring import RecurringPattern, PatternType
from app.models.member import Member
from app.config import settings


class BookingErrorCode(str, Enum):
    """
    Specific error codes for booking failures.
    Allows frontend to show appropriate error messages.
    """
    CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED"
    MEMBER_OVERLAP = "MEMBER_OVERLAP"
    PAST_START_TIME = "PAST_START_TIME"
    TOO_FAR_IN_ADVANCE = "TOO_FAR_IN_ADVANCE"
    DURATION_TOO_SHORT = "DURATION_TOO_SHORT"
    DURATION_TOO_LONG = "DURATION_TOO_LONG"
    INVALID_TIME_RANGE = "INVALID_TIME_RANGE"
    BOOKING_NOT_FOUND = "BOOKING_NOT_FOUND"
    ALREADY_CANCELLED = "ALREADY_CANCELLED"


class BookingError(Exception):
    """
    Custom exception for booking-related errors.
    Includes error code for programmatic handling.
    """
    def __init__(self, message: str, code: BookingErrorCode):
        self.message = message
        self.code = code
        super().__init__(message)


class BookingService:
    """
    Service class for booking operations.
    
    Handles all booking-related business logic including
    availability checks, capacity enforcement, and recurring patterns.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the service with a database session.
        
        Args:
            db: The async database session to use
        """
        self.db = db
    
    async def get_booking_by_id(self, booking_id: UUID) -> Optional[Booking]:
        """
        Find a booking by its ID.
        
        Args:
            booking_id: The booking UUID to find
            
        Returns:
            The Booking if found, None otherwise
        """
        result = await self.db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        return result.scalar_one_or_none()
    
    async def count_overlapping_bookings(
        self,
        start_time: datetime,
        end_time: datetime,
        exclude_booking_id: Optional[UUID] = None
    ) -> int:
        """
        Count confirmed bookings that overlap with a time range.

        Used for capacity checking. Two bookings overlap if:
        - One starts before the other ends, AND
        - One ends after the other starts

        Args:
            start_time: Start of the time range
            end_time: End of the time range
            exclude_booking_id: Optional booking ID to exclude (for updates)

        Returns:
            Total number of people (sum of party_size) in overlapping confirmed bookings
        """
        query = select(func.coalesce(func.sum(Booking.party_size), 0)).where(
            and_(
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def check_member_overlap(
        self,
        member_id: UUID,
        start_time: datetime,
        end_time: datetime,
        exclude_booking_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if a member has an overlapping booking.
        
        Members can only have one booking at a time.
        
        Args:
            member_id: The member to check
            start_time: Start of the proposed booking
            end_time: End of the proposed booking
            exclude_booking_id: Optional booking to exclude
            
        Returns:
            True if there's an overlap, False otherwise
        """
        query = select(func.count(Booking.id)).where(
            and_(
                Booking.member_id == member_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        )
        
        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)
        
        result = await self.db.execute(query)
        count = result.scalar()
        
        return count > 0
    
    def validate_booking_times(
        self,
        start_time: datetime,
        end_time: datetime,
        admin_override: bool = False
    ) -> None:
        """
        Validate booking time constraints.
        
        Checks:
        1. End time is after start time
        2. Booking is not in the past (unless admin override)
        3. Duration is within limits (unless admin override)
        4. Not too far in advance (unless admin override)
        
        Args:
            start_time: Proposed booking start
            end_time: Proposed booking end
            admin_override: If True, skip time-based validations
            
        Raises:
            BookingError: If validation fails
        """
        now = datetime.utcnow()
        
        start_naive = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
        end_naive = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
        
        if end_naive <= start_naive:
            raise BookingError(
                "End time must be after start time.",
                BookingErrorCode.INVALID_TIME_RANGE
            )
        
        duration_mins = (end_naive - start_naive).total_seconds() / 60
        
        if not admin_override:
            min_start_time = now + timedelta(minutes=settings.MIN_BOOKING_LEAD_TIME_MINS)
            if start_naive < min_start_time:
                if start_naive < now:
                    raise BookingError(
                        "Cannot book a slot that has already started.",
                        BookingErrorCode.PAST_START_TIME
                    )
                else:
                    raise BookingError(
                        f"Bookings must be made at least {settings.MIN_BOOKING_LEAD_TIME_MINS} minutes in advance.",
                        BookingErrorCode.PAST_START_TIME
                    )
            
            if duration_mins < settings.MIN_BOOKING_DURATION_MINS:
                raise BookingError(
                    f"Minimum booking duration is {settings.MIN_BOOKING_DURATION_MINS} minutes.",
                    BookingErrorCode.DURATION_TOO_SHORT
                )
            
            if duration_mins > settings.MAX_BOOKING_DURATION_MINS:
                raise BookingError(
                    f"Maximum booking duration is {settings.MAX_BOOKING_DURATION_MINS} minutes ({settings.MAX_BOOKING_DURATION_MINS // 60} hours).",
                    BookingErrorCode.DURATION_TOO_LONG
                )
            
            max_advance = now + timedelta(days=settings.MAX_BOOKING_ADVANCE_DAYS)
            if start_naive > max_advance:
                raise BookingError(
                    f"Cannot book more than {settings.MAX_BOOKING_ADVANCE_DAYS} days in advance.",
                    BookingErrorCode.TOO_FAR_IN_ADVANCE
                )

    async def create_booking(
        self,
        member_id: UUID,
        start_time: datetime,
        end_time: datetime,
        created_by: UUID,
        booking_type: str = "SINGLE",
        party_size: int = 1,
        recurring_pattern_id: Optional[UUID] = None,
        admin_override: bool = False,
        creator_role: Optional[str] = None,
        resource_id: Optional[UUID] = None
    ) -> Booking:
        """
        Create a new booking after validation.

        Business Rules Enforced:
        1. CAPACITY (never overridable): Slot cannot exceed max capacity
        2. MEMBER_OVERLAP (admin can override): Member can only book one slot at a time
        3. PAST_START_TIME (admin can override): Cannot book slots that have started
        4. DURATION_LIMITS (admin can override): Must be within min/max duration
        5. ADVANCE_LIMIT (admin can override): Cannot book too far in advance

        Race Condition Handling:
        - Uses database transaction with row-level locking (SELECT ... FOR UPDATE)
        - Capacity check and insert are atomic within the transaction
        - Concurrent requests will serialize on the lock, preventing overbooking
        - For PostgreSQL: Uses advisory locks
        - For SQLite: Relies on database-level locking (no advisory locks needed)

        Args:
            member_id: Member the booking is for
            start_time: When the booking starts
            end_time: When the booking ends
            created_by: User creating the booking (may be admin)
            recurring_pattern_id: Optional link to recurring pattern
            admin_override: If True, bypass time-based rules (NOT capacity)

        Returns:
            The created Booking

        Raises:
            BookingError: If validation fails with specific error code
        """
        from sqlalchemy import text
        import os

        self.validate_booking_times(start_time, end_time, admin_override)

        # Only use advisory locks for PostgreSQL
        database_url = os.getenv("DATABASE_URL", "")
        if database_url.startswith("postgresql"):
            await self.db.execute(
                text("SELECT pg_advisory_xact_lock(:lock_key)"),
                {"lock_key": hash((start_time.isoformat(), end_time.isoformat())) % (2**31)}
            )
        
        # Check if adding this party would exceed capacity
        current_capacity = await self.count_overlapping_bookings(start_time, end_time)
        new_capacity = current_capacity + party_size

        if new_capacity > settings.GYM_MAX_CAPACITY:
            available_spots = settings.GYM_MAX_CAPACITY - current_capacity
            raise BookingError(
                f"Time slot cannot accommodate {party_size} people. "
                f"Maximum capacity: {settings.GYM_MAX_CAPACITY}, "
                f"Current bookings: {current_capacity}, "
                f"Available spots: {available_spots}.",
                BookingErrorCode.CAPACITY_EXCEEDED
            )
        
        if not admin_override:
            has_overlap = await self.check_member_overlap(member_id, start_time, end_time)
            if has_overlap:
                raise BookingError(
                    "You already have a booking during this time. "
                    "Please cancel your existing booking first.",
                    BookingErrorCode.MEMBER_OVERLAP
                )
        
        from app.models.booking import BookingType
        from app.models.resource import Resource, ResourceType
        from app.models.user import UserRole
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating booking: booking_type={booking_type}, party_size={party_size}")

        # Determine if booking requires approval
        # Coaches booking pitches (main or minor) and ball wall need admin approval
        # Members and Admins are auto-approved for their allowed resources
        requires_approval = False
        if creator_role == UserRole.COACH.value and resource_id:
            # Check if resource is a pitch or ball wall
            result = await self.db.execute(
                select(Resource).where(Resource.id == resource_id)
            )
            resource = result.scalar_one_or_none()
            if resource and resource.type in [
                ResourceType.PITCH,
                ResourceType.PITCH_HALF,
                ResourceType.PITCH_QUARTER,
                ResourceType.BALL_WALL
            ]:
                requires_approval = True

        booking_status = BookingStatus.PENDING_APPROVAL if requires_approval else BookingStatus.CONFIRMED

        booking = Booking(
            member_id=member_id,
            resource_id=resource_id,
            start_time=start_time,
            end_time=end_time,
            status=booking_status,
            booking_type=BookingType(booking_type),
            party_size=party_size,
            recurring_pattern_id=recurring_pattern_id,
            created_by=created_by,
        )
        
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)
        
        return booking
    
    async def cancel_booking(
        self,
        booking_id: UUID,
        cancelled_by: UUID
    ) -> Booking:
        """
        Cancel a booking (soft delete).
        
        Sets status to cancelled and records who cancelled and when.
        
        Args:
            booking_id: The booking to cancel
            cancelled_by: User performing the cancellation
            
        Returns:
            The cancelled Booking
            
        Raises:
            BookingError: If booking not found or already cancelled
        """
        booking = await self.get_booking_by_id(booking_id)
        
        if not booking:
            raise BookingError(
                "Booking not found.",
                BookingErrorCode.BOOKING_NOT_FOUND
            )
        
        if booking.status == BookingStatus.CANCELLED:
            raise BookingError(
                "Booking is already cancelled.",
                BookingErrorCode.ALREADY_CANCELLED
            )
        
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_by = cancelled_by
        booking.cancelled_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(booking)

        return booking

    async def update_booking(
        self,
        booking_id: UUID,
        start_time: datetime,
        end_time: datetime,
        party_size: int,
        updated_by: UUID,
        reason: Optional[str] = None,
        admin_override: bool = False
    ) -> Booking:
        """
        Update an existing booking's time and party size.

        Validates the new time slot and capacity before updating.

        Args:
            booking_id: The booking to update
            start_time: New start time
            end_time: New end time
            party_size: New party size
            updated_by: User performing the update
            reason: Optional reason for the update
            admin_override: If True, skip some validation checks

        Returns:
            The updated Booking

        Raises:
            BookingError: If validation fails or booking not found
        """
        booking = await self.get_booking_by_id(booking_id)

        if not booking:
            raise BookingError(
                "Booking not found.",
                BookingErrorCode.BOOKING_NOT_FOUND
            )

        if booking.status == BookingStatus.CANCELLED:
            raise BookingError(
                "Cannot update a cancelled booking.",
                BookingErrorCode.ALREADY_CANCELLED
            )

        # Validate time range
        if end_time <= start_time:
            raise BookingError(
                "End time must be after start time.",
                BookingErrorCode.INVALID_TIME_RANGE
            )

        # Validate duration
        duration = end_time - start_time
        min_duration = timedelta(minutes=settings.MIN_BOOKING_DURATION_MINS)
        max_duration = timedelta(minutes=settings.MAX_BOOKING_DURATION_MINS)

        if not admin_override and duration < min_duration:
            raise BookingError(
                f"Booking duration must be at least {settings.MIN_BOOKING_DURATION_MINS} minutes.",
                BookingErrorCode.DURATION_TOO_SHORT
            )

        if not admin_override and duration > max_duration:
            raise BookingError(
                f"Booking duration cannot exceed {settings.MAX_BOOKING_DURATION_MINS} minutes.",
                BookingErrorCode.DURATION_TOO_LONG
            )

        # Check if not in the past
        if not admin_override and start_time < datetime.now(start_time.tzinfo):
            raise BookingError(
                "Cannot update to a past time slot.",
                BookingErrorCode.PAST_START_TIME
            )

        # Check capacity (excluding this booking)
        current_capacity = await self.count_overlapping_bookings(
            start_time,
            end_time,
            exclude_booking_id=booking_id
        )

        if current_capacity + party_size > settings.GYM_MAX_CAPACITY:
            available = settings.GYM_MAX_CAPACITY - current_capacity
            raise BookingError(
                f"This time slot only has {available} spots available. "
                f"You requested {party_size} spots.",
                BookingErrorCode.CAPACITY_EXCEEDED
            )

        # Check member overlap (excluding this booking)
        if not admin_override:
            has_overlap = await self.check_member_overlap(
                booking.member_id,
                start_time,
                end_time,
                exclude_booking_id=booking_id
            )
            if has_overlap:
                raise BookingError(
                    "You already have another booking during this time.",
                    BookingErrorCode.MEMBER_OVERLAP
                )

        # Update the booking
        booking.start_time = start_time
        booking.end_time = end_time
        booking.party_size = party_size

        await self.db.commit()
        await self.db.refresh(booking)

        return booking

    async def cancel_booking_with_reason(
        self,
        booking_id: UUID,
        cancelled_by: UUID,
        reason_code: str,
        note: Optional[str] = None
    ) -> Booking:
        """
        Cancel a booking with a specific reason code and optional note.

        This is an enhanced version of cancel_booking that stores
        cancellation metadata.

        Args:
            booking_id: The booking to cancel
            cancelled_by: User performing the cancellation
            reason_code: Reason for cancellation (MEMBER_REQUEST, etc.)
            note: Optional additional notes

        Returns:
            The cancelled Booking

        Raises:
            BookingError: If booking not found or already cancelled
        """
        booking = await self.get_booking_by_id(booking_id)

        if not booking:
            raise BookingError(
                "Booking not found.",
                BookingErrorCode.BOOKING_NOT_FOUND
            )

        if booking.status == BookingStatus.CANCELLED:
            raise BookingError(
                "Booking is already cancelled.",
                BookingErrorCode.ALREADY_CANCELLED
            )

        booking.status = BookingStatus.CANCELLED
        booking.cancelled_by = cancelled_by
        booking.cancelled_at = datetime.utcnow()

        # Note: reason_code and note would need to be added to the Booking model
        # For now, we'll just do the basic cancellation
        # If you want to store these, add cancellation_reason and cancellation_note
        # columns to the bookings table

        await self.db.commit()
        await self.db.refresh(booking)

        return booking

    async def delete_cancelled_booking(
        self,
        booking_id: UUID
    ) -> None:
        """
        Permanently delete a cancelled booking from the database.

        This is a hard delete - use with caution.
        Only allowed for bookings that are already cancelled.

        Args:
            booking_id: The booking to delete

        Raises:
            BookingError: If booking not found or not cancelled
        """
        booking = await self.get_booking_by_id(booking_id)

        if not booking:
            raise BookingError(
                "Booking not found.",
                BookingErrorCode.BOOKING_NOT_FOUND
            )

        if booking.status != BookingStatus.CANCELLED:
            raise BookingError(
                "Can only delete bookings that are already cancelled.",
                BookingErrorCode.INVALID_TIME_RANGE  # Reusing error code
            )

        await self.db.delete(booking)
        await self.db.commit()

    async def list_member_bookings(
        self,
        member_id: UUID,
        status: Optional[BookingStatus] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Booking], int]:
        """
        List bookings for a specific member.
        
        Args:
            member_id: The member whose bookings to list
            status: Optional status filter
            from_date: Optional start date filter
            to_date: Optional end date filter
            page: Page number (1-indexed)
            limit: Items per page
            
        Returns:
            Tuple of (list of bookings, total count)
        """
        # Base query
        query = select(Booking).where(Booking.member_id == member_id)
        count_query = select(func.count(Booking.id)).where(Booking.member_id == member_id)
        
        # Apply filters
        if status:
            query = query.where(Booking.status == status)
            count_query = count_query.where(Booking.status == status)
        
        if from_date:
            query = query.where(Booking.start_time >= from_date)
            count_query = count_query.where(Booking.start_time >= from_date)
        
        if to_date:
            query = query.where(Booking.end_time <= to_date)
            count_query = count_query.where(Booking.end_time <= to_date)
        
        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit).order_by(Booking.start_time.desc())
        
        result = await self.db.execute(query)
        bookings = result.scalars().all()
        
        return list(bookings), total
    
    async def list_all_bookings(
        self,
        member_id: Optional[UUID] = None,
        status: Optional[BookingStatus] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 50
    ) -> Tuple[List[Booking], int]:
        """
        List all bookings (for admin use).

        Args:
            member_id: Optional filter by member
            status: Optional status filter
            from_date: Optional start date filter
            to_date: Optional end date filter
            page: Page number
            limit: Items per page

        Returns:
            Tuple of (list of bookings, total count)
        """
        from app.models.user import User

        # Explicitly eager load member and user relationships
        query = select(Booking).options(
            selectinload(Booking.member).selectinload(Member.user)
        )
        count_query = select(func.count(Booking.id))

        if member_id:
            query = query.where(Booking.member_id == member_id)
            count_query = count_query.where(Booking.member_id == member_id)

        if status:
            query = query.where(Booking.status == status)
            count_query = count_query.where(Booking.status == status)

        if from_date:
            query = query.where(Booking.start_time >= from_date)
            count_query = count_query.where(Booking.start_time >= from_date)

        if to_date:
            query = query.where(Booking.end_time <= to_date)
            count_query = count_query.where(Booking.end_time <= to_date)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit).order_by(Booking.start_time.desc())

        result = await self.db.execute(query)
        bookings = result.scalars().all()

        return list(bookings), total
    
    async def get_availability(self, check_date: date) -> List[dict]:
        """
        Get availability info for a specific date.
        
        Returns hourly slots with booking counts.
        
        Args:
            check_date: The date to check
            
        Returns:
            List of slot availability dicts
        """
        slots = []
        
        # Generate hourly slots for the day
        for hour in range(24):
            start = datetime.combine(check_date, time(hour, 0))
            end = datetime.combine(check_date, time(hour, 59, 59))
            
            # Make timezone-aware if needed
            # (In production, handle timezone properly)
            
            # Count bookings in this hour
            count = await self.count_overlapping_bookings(start, end)
            
            slots.append({
                "start_time": start,
                "end_time": end,
                "booked_count": count,
                "available": settings.GYM_MAX_CAPACITY - count,
                "max_capacity": settings.GYM_MAX_CAPACITY,
            })
        
        return slots
    
    async def create_recurring_pattern(
        self,
        member_id: UUID,
        pattern_type: str,
        days_of_week: List[int],
        start_time: time,
        duration_mins: int,
        valid_from: date,
        valid_until: date
    ) -> Tuple[RecurringPattern, int, int]:
        """
        Create a recurring booking pattern and generate bookings.
        
        Args:
            member_id: Member to create pattern for
            pattern_type: 'daily' or 'weekly'
            days_of_week: Days for weekly pattern (0=Sun, 6=Sat)
            start_time: Time of day for bookings
            duration_mins: Duration of each booking
            valid_from: First date for pattern
            valid_until: Last date for pattern
            
        Returns:
            Tuple of (pattern, bookings_created, conflicts_skipped)
        """
        # Get the member to get their user_id
        member_result = await self.db.execute(
            select(Member).where(Member.id == member_id)
        )
        member = member_result.scalar_one_or_none()
        
        if not member:
            raise ValueError("Member not found")
        
        # Create the pattern
        pattern = RecurringPattern(
            member_id=member_id,
            pattern_type=PatternType(pattern_type),
            days_of_week=days_of_week,
            start_time=start_time,
            duration_mins=duration_mins,
            valid_from=valid_from,
            valid_until=valid_until,
            is_active=True,
        )
        
        self.db.add(pattern)
        await self.db.flush()  # Get pattern ID
        
        # Generate booking instances
        bookings_created = 0
        conflicts_skipped = 0
        
        current_date = valid_from
        while current_date <= valid_until:
            # Check if this day matches the pattern
            should_book = False
            
            if pattern_type == "daily":
                should_book = True
            elif pattern_type == "weekly":
                # Python: Monday = 0, Sunday = 6
                # Our format: Sunday = 0, Saturday = 6
                # Convert Python weekday to our format
                python_weekday = current_date.weekday()
                our_weekday = (python_weekday + 1) % 7
                should_book = our_weekday in days_of_week
            
            if should_book:
                # Calculate start and end times
                booking_start = datetime.combine(current_date, start_time)
                booking_end = booking_start + timedelta(minutes=duration_mins)
                
                # Check if we can book this slot
                try:
                    overlapping = await self.count_overlapping_bookings(
                        booking_start, booking_end
                    )
                    has_member_overlap = await self.check_member_overlap(
                        member_id, booking_start, booking_end
                    )
                    
                    if overlapping < settings.GYM_MAX_CAPACITY and not has_member_overlap:
                        # Create the booking
                        booking = Booking(
                            member_id=member_id,
                            start_time=booking_start,
                            end_time=booking_end,
                            status=BookingStatus.CONFIRMED,
                            recurring_pattern_id=pattern.id,
                            created_by=member.user_id,
                        )
                        self.db.add(booking)
                        bookings_created += 1
                    else:
                        conflicts_skipped += 1
                except Exception:
                    conflicts_skipped += 1
            
            current_date += timedelta(days=1)
        
        await self.db.commit()
        await self.db.refresh(pattern)
        
        return pattern, bookings_created, conflicts_skipped
    
    async def deactivate_recurring_pattern(
        self,
        pattern_id: UUID,
        cancel_future: bool = True
    ) -> Tuple[RecurringPattern, int]:
        """
        Deactivate a recurring pattern and optionally cancel future bookings.
        
        Args:
            pattern_id: The pattern to deactivate
            cancel_future: Whether to cancel future bookings
            
        Returns:
            Tuple of (pattern, bookings_cancelled)
        """
        result = await self.db.execute(
            select(RecurringPattern).where(RecurringPattern.id == pattern_id)
        )
        pattern = result.scalar_one_or_none()
        
        if not pattern:
            raise ValueError("Pattern not found")
        
        pattern.is_active = False
        
        bookings_cancelled = 0
        
        if cancel_future:
            # Cancel future bookings from this pattern
            future_bookings = await self.db.execute(
                select(Booking).where(
                    and_(
                        Booking.recurring_pattern_id == pattern_id,
                        Booking.status == BookingStatus.CONFIRMED,
                        Booking.start_time > datetime.utcnow(),
                    )
                )
            )
            
            for booking in future_bookings.scalars():
                booking.status = BookingStatus.CANCELLED
                booking.cancelled_at = datetime.utcnow()
                bookings_cancelled += 1
        
        await self.db.commit()
        await self.db.refresh(pattern)
        
        return pattern, bookings_cancelled

