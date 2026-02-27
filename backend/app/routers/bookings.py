"""
Booking API routes for gym members.

Handles booking operations for authenticated members:
- Viewing own bookings
- Creating new bookings
- Cancelling bookings
- Checking availability
- Managing recurring bookings

Error Responses:
All booking errors return structured JSON with:
- detail: Human-readable error message
- error_code: Machine-readable code for frontend handling
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
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
    EditBookingRequest,           # ← NEW
    CancelBookingRequest          # ← NEW
)
from app.schemas.recurring import (
    RecurringPatternCreate,
    RecurringPatternResponse,
    RecurringPatternCreateResponse,
)
from app.services.booking_service import BookingService, BookingError, BookingErrorCode
from app.services.conflict_service import ConflictService     # ← NEW
from app.services.policy_service import PolicyService         # ← NEW
from app.auth.dependencies import get_current_member
from app.models.member import Member
from app.models.booking import BookingStatus


def booking_error_response(error: BookingError, status_code: int = 409) -> JSONResponse:
    """
    Create a structured error response for booking errors.
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": error.message,
            "error_code": error.code.value,
        }
    )


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"],
)


# ------------------------------------------------------------
# LIST BOOKINGS
# ------------------------------------------------------------
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
    service = BookingService(db)
    
    # Convert string → enum
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

    # Enrich bookings with resource and creator information
    enriched_bookings = [BookingResponse.from_booking(b) for b in bookings]

    return {
        "bookings": enriched_bookings,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ------------------------------------------------------------
# CHECK AVAILABILITY
# ------------------------------------------------------------
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
    service = BookingService(db)
    slots = await service.get_availability(check_date)
    
    return {
        "date": check_date.isoformat(),
        "slots": slots,
    }


# ------------------------------------------------------------
# CREATE BOOKING
# ------------------------------------------------------------
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
    service = BookingService(db)

    try:
        booking = await service.create_booking(
            member_id=member.id,
            start_time=booking_data.start_time,
            end_time=booking_data.end_time,
            booking_type=booking_data.booking_type,
            party_size=booking_data.party_size,
            created_by=member.user_id,
            admin_override=False,
        )
        return booking
    
    except BookingError as e:
        status_map = {
            BookingErrorCode.CAPACITY_EXCEEDED: 409,
            BookingErrorCode.MEMBER_OVERLAP: 409,
            BookingErrorCode.PAST_START_TIME: 400,
            BookingErrorCode.TOO_FAR_IN_ADVANCE: 400,
            BookingErrorCode.DURATION_TOO_SHORT: 400,
            BookingErrorCode.DURATION_TOO_LONG: 400,
            BookingErrorCode.INVALID_TIME_RANGE: 400,
        }
        return booking_error_response(e, status_map.get(e.code, 409))


# ------------------------------------------------------------
# GET A BOOKING
# ------------------------------------------------------------
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
    service = BookingService(db)
    booking = await service.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.member_id != member.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    
    return booking


# ------------------------------------------------------------
# NEW: CANCEL BOOKING WITH REASON (POST)
# ------------------------------------------------------------
@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a booking (with reason and cutoff rules)",
)
async def cancel_booking_new(
    booking_id: UUID,
    payload: CancelBookingRequest,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    service = BookingService(
        db,
        conflict_service=ConflictService(db),
        policy_service=PolicyService(),
    )

    try:
        booking = await service.cancel_booking(
            booking_id=booking_id,
            payload=payload,
            actor_user=member.user,
            is_admin=False,
        )
        await db.commit()
        return booking
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------
# NEW: EDIT BOOKING (PATCH)
# ------------------------------------------------------------
@router.patch(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Edit an existing booking",
)
async def edit_booking(
    booking_id: UUID,
    payload: EditBookingRequest,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    service = BookingService(
        db,
        conflict_service=ConflictService(db),
        policy_service=PolicyService(),
    )

    try:
        booking = await service.edit_booking(
            booking_id=booking_id,
            edit=payload,
            actor_user=member.user,
            is_admin=False,
        )
        await db.commit()
        return booking
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------
# NEW: DELETE CANCELLED BOOKING ONLY
# ------------------------------------------------------------
@router.delete(
    "/{booking_id}",
    summary="Delete a cancelled booking",
)
async def delete_cancelled_booking(
    booking_id: UUID,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    service = BookingService(
        db,
        conflict_service=ConflictService(db),
        policy_service=PolicyService(),
    )

    try:
        ok = await service.delete_cancelled(
            booking_id=booking_id,
            actor_user=member.user,
            is_admin=False,
        )
        await db.commit()
        return {"deleted": ok}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------
# CREATE RECURRING PATTERN
# ------------------------------------------------------------
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
    service = BookingService(db)

    if pattern_data.pattern_type.lower() == "weekly" and not pattern_data.days_of_week:
        raise HTTPException(status_code=400, detail="Weekly patterns require days_of_week")
    
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
        return {"pattern": pattern, "bookings_created": created, "conflicts_skipped": skipped}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------
# LIST RECURRING PATTERNS
# ------------------------------------------------------------
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
    from sqlalchemy import select
    from app.models.recurring import RecurringPattern
    
    q = select(RecurringPattern).where(RecurringPattern.member_id == member.id)
    if active is not None:
        q = q.where(RecurringPattern.is_active == active)
    
    result = await db.execute(q)
    return result.scalars().all()


# ------------------------------------------------------------
# DEACTIVATE RECURRING PATTERN
# ------------------------------------------------------------
@router.delete(
    "/recurring/{pattern_id}",
    response_model=dict,
    summary="Deactivate a recurring pattern",
)
async def deactivate_recurring_pattern(
    pattern_id: UUID,
    cancel_future: bool = Query(True, description="Cancel future bookings"),
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.models.recurring import RecurringPattern
    
    result = await db.execute(select(RecurringPattern).where(RecurringPattern.id == pattern_id))
    pattern = result.scalar_one_or_none()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    if pattern.member_id != member.id:
        raise HTTPException(status_code=403, detail="Not your pattern")
    
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
        raise HTTPException(status_code=400, detail=str(e))