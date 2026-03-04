"""
Clubhouse booking router.

Endpoints for booking clubhouse rooms (Committee Room, Kitchen, Changing Rooms, etc.).
"""

from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_member
from app.models.member import Member
from app.models.booking import Booking
from app.services.clubhouse_service import ClubhouseService
from app.schemas.clubhouse import (
    ClubhouseRoomResponse,
    ClubhouseBookingCreate,
    ClubhouseBookingResponse,
    ClubhouseAvailabilityRequest,
    ClubhouseAvailabilityResponse,
    RoomAvailability,
)


router = APIRouter(prefix="/clubhouse", tags=["Clubhouse Bookings"])


@router.get(
    "/rooms",
    response_model=List[ClubhouseRoomResponse],
    summary="List all clubhouse rooms"
)
async def list_rooms(
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Get list of all available clubhouse rooms.

    Returns rooms like:
    - Committee Room
    - Kitchen
    - Changing Room 1-4
    - Referee Changing Room
    - Room 2
    """
    service = ClubhouseService(db)
    rooms = await service.get_all_rooms()
    return [
        ClubhouseRoomResponse(
            id=room.id,
            name=room.name,
            capacity=room.capacity,
            buffer_mins=room.buffer_mins,
            is_active=room.is_active
        )
        for room in rooms
    ]


@router.post(
    "/availability",
    response_model=ClubhouseAvailabilityResponse,
    summary="Check availability for multiple rooms"
)
async def check_availability(
    request: ClubhouseAvailabilityRequest,
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Check if multiple rooms are available for the given time period.

    Returns availability status for each room, including any conflicting bookings.
    """
    service = ClubhouseService(db)

    # Check availability for all requested rooms
    availability_map = await service.check_multi_room_availability(
        room_ids=request.room_ids,
        start_time=request.start_time,
        end_time=request.end_time
    )

    # Build response
    rooms_availability = []
    all_available = True

    for room_id in request.room_ids:
        room = await service.get_room_by_id(room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room {room_id} not found"
            )

        is_available, conflicts = availability_map[room_id]
        if not is_available:
            all_available = False

        rooms_availability.append(
            RoomAvailability(
                room_id=room.id,
                room_name=room.name,
                is_available=is_available,
                conflicting_bookings=[
                    _booking_to_response(booking) for booking in conflicts
                ]
            )
        )

    return ClubhouseAvailabilityResponse(
        all_available=all_available,
        rooms=rooms_availability
    )


@router.post(
    "/bookings",
    response_model=List[ClubhouseBookingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create multi-room booking"
)
async def create_booking(
    booking_data: ClubhouseBookingCreate,
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Create a booking for one or more clubhouse rooms.

    All rooms must be available or the entire booking fails.
    Returns a list of created bookings (one per room).
    """
    service = ClubhouseService(db)

    try:
        bookings = await service.create_multi_room_booking(
            member_id=member.id,
            room_ids=booking_data.room_ids,
            start_time=booking_data.start_time,
            end_time=booking_data.end_time,
            purpose=booking_data.purpose,
            contact_name=booking_data.contact_name,
            created_by=member.user_id
        )

        return [_booking_to_response(booking) for booking in bookings]

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/bookings",
    response_model=List[ClubhouseBookingResponse],
    summary="Get member's clubhouse bookings"
)
async def get_my_bookings(
    upcoming_only: bool = Query(False, description="Only upcoming bookings"),
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """Get all clubhouse bookings for the current member."""
    service = ClubhouseService(db)
    bookings = await service.get_member_bookings(
        member_id=member.id,
        upcoming_only=upcoming_only
    )
    return [_booking_to_response(booking) for booking in bookings]


@router.get(
    "/bookings/all",
    response_model=List[ClubhouseBookingResponse],
    summary="Get all clubhouse bookings (schedule view)"
)
async def get_all_bookings(
    from_date: datetime | None = Query(None, description="Filter from this date"),
    to_date: datetime | None = Query(None, description="Filter to this date"),
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """
    Get all clubhouse bookings for the schedule view.

    Available to all members for viewing the schedule.
    """
    service = ClubhouseService(db)
    bookings = await service.get_all_bookings(
        from_date=from_date,
        to_date=to_date
    )
    return [_booking_to_response(booking) for booking in bookings]


@router.delete(
    "/bookings/{booking_id}",
    response_model=ClubhouseBookingResponse,
    summary="Cancel a clubhouse booking"
)
async def cancel_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """Cancel a clubhouse booking."""
    service = ClubhouseService(db)

    try:
        booking = await service.cancel_booking(
            booking_id=booking_id,
            cancelled_by=member.user_id
        )
        return _booking_to_response(booking)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Helper function to convert Booking to response
def _booking_to_response(booking: Booking) -> ClubhouseBookingResponse:
    """Convert Booking model to ClubhouseBookingResponse."""
    return ClubhouseBookingResponse(
        id=booking.id,
        member_id=booking.member_id,
        resource_id=booking.resource_id,
        resource_name=booking.resource.name if booking.resource else "Unknown Room",
        start_time=booking.start_time,
        end_time=booking.end_time,
        status=booking.status.value if hasattr(booking.status, 'value') else booking.status,
        purpose=booking.notes,  # Purpose stored in notes field
        contact_name=booking.requester_name,  # Contact stored in requester_name field
        created_by=booking.created_by,
        created_at=booking.created_at,
        updated_at=booking.updated_at
    )
