"""
Clubhouse booking service.

Handles business logic for clubhouse room bookings,
including multi-room availability checking and booking.
"""

from datetime import datetime
from typing import List, Dict
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.resource import Resource, ResourceType
from app.models.member import Member
from app.models.user import UserRole


class ClubhouseService:
    """Service for managing clubhouse room bookings."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_rooms(self) -> List[Resource]:
        """Get all clubhouse rooms."""
        result = await self.db.execute(
            select(Resource).where(
                and_(
                    Resource.type == ResourceType.ROOM,
                    Resource.is_active == True
                )
            ).order_by(Resource.name)
        )
        return list(result.scalars().all())

    async def get_room_by_id(self, room_id: UUID) -> Resource | None:
        """Get a specific room by ID."""
        result = await self.db.execute(
            select(Resource).where(
                and_(
                    Resource.id == room_id,
                    Resource.type == ResourceType.ROOM,
                    Resource.is_active == True
                )
            )
        )
        return result.scalar_one_or_none()

    async def check_room_availability(
        self,
        room_id: UUID,
        start_time: datetime,
        end_time: datetime,
        exclude_booking_id: UUID | None = None
    ) -> tuple[bool, List[Booking]]:
        """
        Check if a room is available for the given time period.

        Returns:
            (is_available, conflicting_bookings)
        """
        # Find overlapping bookings for this room (both CONFIRMED and PENDING_APPROVAL)
        query = select(Booking).where(
            and_(
                Booking.resource_id == room_id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL]),
                Booking.start_time < end_time,
                Booking.end_time > start_time
            )
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        result = await self.db.execute(query)
        conflicts = list(result.scalars().all())

        return (len(conflicts) == 0, conflicts)

    async def check_multi_room_availability(
        self,
        room_ids: List[UUID],
        start_time: datetime,
        end_time: datetime
    ) -> Dict[UUID, tuple[bool, List[Booking]]]:
        """
        Check availability for multiple rooms at once.

        Returns:
            Dictionary mapping room_id to (is_available, conflicting_bookings)
        """
        availability = {}
        for room_id in room_ids:
            is_available, conflicts = await self.check_room_availability(
                room_id, start_time, end_time
            )
            availability[room_id] = (is_available, conflicts)
        return availability

    async def create_multi_room_booking(
        self,
        member_id: UUID,
        room_ids: List[UUID],
        start_time: datetime,
        end_time: datetime,
        purpose: str,
        contact_name: str | None,
        created_by: UUID,
        user_role: UserRole | None = None
    ) -> List[Booking]:
        """
        Create bookings for multiple rooms at once.

        All rooms must be available or the entire booking fails (atomic operation).

        Args:
            member_id: Member making the booking
            room_ids: List of room resource IDs to book
            start_time: Booking start time
            end_time: Booking end time
            purpose: Purpose/description of the booking
            contact_name: Contact person name (optional)
            created_by: User creating the booking
            user_role: User role for determining approval status

        Returns:
            List of created Booking objects

        Raises:
            ValueError: If any room is unavailable or doesn't exist

        Note:
            Booking status is set based on user role:
            - ADMIN: Always CONFIRMED (auto-approved)
            - COACH: PENDING_APPROVAL (requires admin approval)
            - MEMBER: PENDING_APPROVAL (requires admin approval)
        """
        # Validate time range
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        if start_time < datetime.utcnow():
            raise ValueError("Cannot book in the past")

        # Verify all rooms exist and are active
        for room_id in room_ids:
            room = await self.get_room_by_id(room_id)
            if not room:
                raise ValueError(f"Room {room_id} not found or inactive")

        # Check availability for all rooms
        availability = await self.check_multi_room_availability(
            room_ids, start_time, end_time
        )

        # Find unavailable rooms
        unavailable_rooms = [
            room_id for room_id, (is_available, _) in availability.items()
            if not is_available
        ]

        if unavailable_rooms:
            # Get room names for error message
            room_names = []
            for room_id in unavailable_rooms:
                room = await self.get_room_by_id(room_id)
                if room:
                    room_names.append(room.name)

            raise ValueError(
                f"The following rooms are not available: {', '.join(room_names)}"
            )

        # Determine booking status based on user role.
        # Only admins are auto-approved; coaches and members need admin approval.
        if user_role == UserRole.ADMIN:
            booking_status = BookingStatus.CONFIRMED
        else:
            booking_status = BookingStatus.PENDING_APPROVAL

        # Create bookings for all rooms
        bookings = []
        for room_id in room_ids:
            booking = Booking(
                member_id=member_id,
                resource_id=room_id,
                start_time=start_time,
                end_time=end_time,
                status=booking_status,
                booking_type="SINGLE",  # Clubhouse bookings don't use party_size
                party_size=1,
                notes=purpose,  # Store purpose in notes field
                requester_name=contact_name,  # Store contact in requester_name field
                created_by=created_by
            )
            self.db.add(booking)
            bookings.append(booking)

        # Commit all bookings atomically
        await self.db.commit()

        # Refresh to get relationships
        for booking in bookings:
            await self.db.refresh(booking)

        return bookings

    async def get_member_bookings(
        self,
        member_id: UUID,
        upcoming_only: bool = False
    ) -> List[Booking]:
        """Get all clubhouse bookings for a member (confirmed and pending)."""
        query = select(Booking).where(
            and_(
                Booking.member_id == member_id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL])
            )
        ).join(Resource).where(Resource.type == ResourceType.ROOM)

        if upcoming_only:
            query = query.where(Booking.start_time >= datetime.utcnow())

        query = query.order_by(Booking.start_time)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_all_bookings(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None
    ) -> List[Booking]:
        """Get all clubhouse bookings (admin view)."""
        query = select(Booking).where(
            Booking.status == BookingStatus.CONFIRMED
        ).join(Resource).where(Resource.type == ResourceType.ROOM)

        if from_date:
            query = query.where(Booking.start_time >= from_date)
        if to_date:
            query = query.where(Booking.end_time <= to_date)

        query = query.order_by(Booking.start_time)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def cancel_booking(
        self,
        booking_id: UUID,
        cancelled_by: UUID
    ) -> Booking:
        """Cancel a clubhouse booking."""
        result = await self.db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        booking = result.scalar_one_or_none()

        if not booking:
            raise ValueError("Booking not found")

        if booking.status == BookingStatus.CANCELLED:
            raise ValueError("Booking already cancelled")

        booking.status = BookingStatus.CANCELLED
        booking.cancelled_by = cancelled_by
        booking.cancelled_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(booking)

        return booking
