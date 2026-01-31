"""
Booking API routes for gym members.

Handles booking operations for authenticated members:
- Viewing own bookings
- Creating new bookings
- Cancelling bookings
- Checking availability
- Managing recurring bookings
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, date
from uuid import UUID

from app.database import get_db
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    PaginatedBookingsResponse,
    AvailabilityResponse,
)
from app.schemas.recurring import (
    RecurringPatternCreate,
    RecurringPatternResponse,
    RecurringPatternCreateResponse,
)
from app.services.booking_service import BookingService
from app.auth.dependencies import get_current_member
from app.models.member import Member
from app.models.booking import BookingStatus

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"],
)


@router.get(
    "",
    response_model=PaginatedBookingsResponse,
    summary="List your bookings",
)
async def list_my_bookings(
    status: Optional[str] = Query(None, description="Filter by status: confirmed or cancelled"),
    from_date: Optional[datetime] = Query(None, description="Filter bookings starting from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter bookings ending before this date"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    List the current member's bookings.
    
    Supports filtering by status and date range, with pagination.
    """
    service = BookingService(db)
    
    # Convert status string to enum if provided (accepts lowercase input)
    status_enum = None
    if status:
        try:
            status_enum = BookingStatus(status.upper())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid status. Use 'confirmed' or 'cancelled'",
            )
    
    bookings, total = await service.list_member_bookings(
        member_id=member.id,
        status=status_enum,
        from_date=from_date,
        to_date=to_date,
        page=page,
        limit=limit,
    )
    
    return {
        "bookings": bookings,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get(
    "/availability",
    response_model=AvailabilityResponse,
    summary="Check slot availability",
)
async def check_availability(
    check_date: date = Query(..., description="Date to check (YYYY-MM-DD)"),
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Get availability information for a specific date.
    
    Returns hourly slots with current booking counts and available spots.
    """
    service = BookingService(db)
    
    slots = await service.get_availability(check_date)
    
    return {
        "date": check_date.isoformat(),
        "slots": slots,
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=BookingResponse,
    summary="Create a new booking",
)
async def create_booking(
    booking_data: BookingCreate,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new gym booking.
    
    Validates:
    - Time slot has capacity
    - Member doesn't have overlapping booking
    - Booking is not in the past
    - Duration doesn't exceed maximum
    """
    service = BookingService(db)
    
    try:
        booking = await service.create_booking(
            member_id=member.id,
            start_time=booking_data.start_time,
            end_time=booking_data.end_time,
            created_by=member.user_id,
        )
        return booking
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Get a specific booking",
)
async def get_booking(
    booking_id: UUID,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Get details of a specific booking.
    
    Members can only view their own bookings.
    """
    service = BookingService(db)
    
    booking = await service.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    
    # Check ownership
    if booking.member_id != member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your booking",
        )
    
    return booking


@router.delete(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Cancel a booking",
)
async def cancel_booking(
    booking_id: UUID,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel one of your bookings.
    
    Soft deletes the booking (status becomes 'cancelled').
    """
    service = BookingService(db)
    
    # First check it exists and belongs to this member
    booking = await service.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    
    if booking.member_id != member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your booking",
        )
    
    try:
        cancelled = await service.cancel_booking(
            booking_id=booking_id,
            cancelled_by=member.user_id,
        )
        return cancelled
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/recurring",
    status_code=status.HTTP_201_CREATED,
    response_model=RecurringPatternCreateResponse,
    summary="Create a recurring booking pattern",
)
async def create_recurring_booking(
    pattern_data: RecurringPatternCreate,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a recurring booking pattern.
    
    Generates individual booking instances based on the pattern.
    Conflicts (capacity/overlap) are skipped but counted.
    """
    service = BookingService(db)
    
    # Validate weekly patterns have days specified (case-insensitive check)
    if pattern_data.pattern_type.lower() == "weekly" and not pattern_data.days_of_week:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Weekly patterns require days_of_week",
        )
    
    try:
        pattern, created, skipped = await service.create_recurring_pattern(
            member_id=member.id,
            pattern_type=pattern_data.pattern_type.upper(),
            days_of_week=pattern_data.days_of_week,
            start_time=pattern_data.start_time,
            duration_mins=pattern_data.duration_mins,
            valid_from=pattern_data.valid_from,
            valid_until=pattern_data.valid_until,
        )
        
        return {
            "pattern": pattern,
            "bookings_created": created,
            "conflicts_skipped": skipped,
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/recurring/patterns",
    response_model=list[RecurringPatternResponse],
    summary="List your recurring patterns",
)
async def list_recurring_patterns(
    active: Optional[bool] = Query(None, description="Filter by active status"),
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    List the current member's recurring booking patterns.
    """
    from sqlalchemy import select
    from app.models.recurring import RecurringPattern
    
    query = select(RecurringPattern).where(
        RecurringPattern.member_id == member.id
    )
    
    if active is not None:
        query = query.where(RecurringPattern.is_active == active)
    
    result = await db.execute(query)
    patterns = result.scalars().all()
    
    return patterns


@router.delete(
    "/recurring/{pattern_id}",
    response_model=dict,
    summary="Deactivate a recurring pattern",
)
async def deactivate_recurring_pattern(
    pattern_id: UUID,
    cancel_future: bool = Query(True, description="Cancel future bookings from this pattern"),
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Deactivate a recurring pattern.
    
    Optionally cancels all future bookings generated by this pattern.
    """
    from sqlalchemy import select
    from app.models.recurring import RecurringPattern
    
    # Verify ownership
    result = await db.execute(
        select(RecurringPattern).where(RecurringPattern.id == pattern_id)
    )
    pattern = result.scalar_one_or_none()
    
    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pattern not found",
        )
    
    if pattern.member_id != member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your pattern",
        )
    
    service = BookingService(db)
    
    try:
        updated_pattern, cancelled = await service.deactivate_recurring_pattern(
            pattern_id=pattern_id,
            cancel_future=cancel_future,
        )
        
        return {
            "pattern_id": str(pattern_id),
            "deactivated": True,
            "bookings_cancelled": cancelled,
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
