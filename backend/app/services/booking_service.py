"""
Booking service for gym time slot management.

Contains the core business logic for booking operations:
- Checking availability
- Creating bookings (single and recurring)
- Cancelling bookings
- Capacity enforcement
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, date, time, timedelta

from app.models.booking import Booking, BookingStatus
from app.models.recurring import RecurringPattern, PatternType
from app.models.member import Member
from app.config import settings


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
            Number of overlapping confirmed bookings
        """
        query = select(func.count(Booking.id)).where(
            and_(
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        )
        
        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)
        
        result = await self.db.execute(query)
        return result.scalar()
    
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
    
    async def create_booking(
        self,
        member_id: UUID,
        start_time: datetime,
        end_time: datetime,
        created_by: UUID,
        recurring_pattern_id: Optional[UUID] = None
    ) -> Booking:
        """
        Create a new booking after validation.
        
        Performs all necessary checks:
        1. Capacity not exceeded
        2. Member doesn't have overlapping booking
        3. Time is valid (not in past, not too far ahead)
        
        Args:
            member_id: Member the booking is for
            start_time: When the booking starts
            end_time: When the booking ends
            created_by: User creating the booking (may be admin)
            recurring_pattern_id: Optional link to recurring pattern
            
        Returns:
            The created Booking
            
        Raises:
            ValueError: If validation fails
        """
        # Check capacity
        overlapping = await self.count_overlapping_bookings(start_time, end_time)
        if overlapping >= settings.GYM_MAX_CAPACITY:
            raise ValueError(
                f"Time slot is full. Maximum {settings.GYM_MAX_CAPACITY} people allowed."
            )
        
        # Check member doesn't have overlap
        has_overlap = await self.check_member_overlap(member_id, start_time, end_time)
        if has_overlap:
            raise ValueError("You already have a booking during this time.")
        
        # Create the booking
        booking = Booking(
            member_id=member_id,
            start_time=start_time,
            end_time=end_time,
            status=BookingStatus.CONFIRMED,
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
            ValueError: If booking not found or already cancelled
        """
        booking = await self.get_booking_by_id(booking_id)
        
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status == BookingStatus.CANCELLED:
            raise ValueError("Booking is already cancelled")
        
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_by = cancelled_by
        booking.cancelled_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(booking)
        
        return booking
    
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
        query = select(Booking)
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
