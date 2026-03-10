"""
Admin API routes.

Handles administrative operations for managing members and bookings.
All routes require admin authentication.

Admin Override Capabilities:
- Create bookings for past times
- Create bookings beyond advance limit
- Bypass member overlap check
- NEVER bypass capacity limits (safety constraint)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.schemas.member import MemberWithUserResponse
from app.schemas.booking import BookingResponse, BookingCreate, AdminBookingCreate, EditBookingRequest
from app.schemas.admin import AdminUpdateMember
from app.services.member_service import MemberService
from app.services.booking_service import BookingService, BookingError, BookingErrorCode
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.member import MembershipStatus
from app.models.booking import BookingStatus
from app.models.notification import Notification, NotificationType


def booking_error_response(error: BookingError, status_code: int = 409) -> JSONResponse:
    """Create structured error response for booking errors."""
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": error.message,
            "error_code": error.code.value,
        }
    )


async def _notify(
    db: AsyncSession,
    user_id,
    notification_type: NotificationType,
    title: str,
    message: str,
    booking_id=None,
) -> None:
    """Add a notification record to the session (caller must commit)."""
    notif = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        booking_id=booking_id,
    )
    db.add(notif)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# ============================================
# Member Management
# ============================================

@router.get(
    "/members",
    response_model=dict,
    summary="List all members",
)
async def list_members(
    status: Optional[str] = Query(None, description="Filter by status: pending, active, suspended"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all members with optional filters.
    
    Admin can filter by membership status and search by name/email.
    """
    service = MemberService(db)
    
    # Convert status string to enum (accepts lowercase input)
    status_enum = None
    if status:
        try:
            status_enum = MembershipStatus(status.upper())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid status",
            )
    
    members, total = await service.list_members(
        status=status_enum,
        search=search,
        page=page,
        limit=limit,
    )
    
    # Build response with user email included
    member_list = []
    for member in members:
        member_list.append({
            "id": str(member.id),
            "user_id": str(member.user_id),
            "email": member.user.email,
            "full_name": member.full_name,
            "phone": member.phone,
            "membership_status": member.membership_status.value,
            "approved_by": str(member.approved_by) if member.approved_by else None,
            "approved_at": member.approved_at,
            "created_at": member.created_at,
            "updated_at": member.updated_at,
        })
    
    return {
        "members": member_list,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get(
    "/members/{member_id}",
    response_model=dict,
    summary="Get member details",
)
async def get_member(
    member_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific member.
    
    Includes booking statistics.
    """
    service = MemberService(db)
    
    member = await service.get_member_by_id(member_id)
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )
    
    # Get booking stats
    stats = await service.get_member_stats(member_id)
    
    return {
        "id": str(member.id),
        "user_id": str(member.user_id),
        "email": member.user.email,
        "full_name": member.full_name,
        "phone": member.phone,
        "membership_status": member.membership_status.value,
        "approved_by": str(member.approved_by) if member.approved_by else None,
        "approved_at": member.approved_at,
        "created_at": member.created_at,
        "total_bookings": stats["total_bookings"],
        "upcoming_bookings": stats["upcoming_bookings"],
    }


@router.patch(
    "/members/{member_id}/approve",
    response_model=dict,
    summary="Approve a pending member",
)
async def approve_member(
    member_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a member who is pending approval.
    
    Changes their status from 'pending' to 'active'.
    """
    service = MemberService(db)
    
    try:
        member = await service.approve_member(
            member_id=member_id,
            approved_by=admin.id,
        )

        await _notify(
            db=db,
            user_id=member.user_id,
            notification_type=NotificationType.MEMBERSHIP_APPROVED,
            title="Membership Approved",
            message="Your membership has been approved. You can now book facilities.",
        )
        await db.commit()

        return {
            "id": str(member.id),
            "membership_status": member.membership_status.value,
            "approved_by": str(member.approved_by),
            "approved_at": member.approved_at,
            "message": "Member approved successfully",
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/members/{member_id}/suspend",
    response_model=dict,
    summary="Suspend a member",
)
async def suspend_member(
    member_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Suspend an active member.
    
    Suspended members cannot log in or make bookings.
    """
    service = MemberService(db)
    
    try:
        member = await service.suspend_member(member_id)
        
        return {
            "id": str(member.id),
            "membership_status": member.membership_status.value,
            "message": "Member suspended",
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/members/{member_id}",
    response_model=dict,
    summary="Update member details (admin)",
)
async def update_member(
    member_id: UUID,
    updates: AdminUpdateMember,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin comprehensive member update.

    Allows admins to update:
    - Personal information (name, phone)
    - Email address
    - User role (MEMBER, COACH, ADMIN)
    - Membership status
    """
    service = MemberService(db)

    try:
        member = await service.admin_update_member(
            member_id=member_id,
            full_name=updates.full_name,
            phone=updates.phone,
            email=updates.email,
            role=updates.role,
            membership_status=updates.membership_status
        )

        return {
            "id": str(member.id),
            "user_id": str(member.user_id),
            "full_name": member.full_name,
            "phone": member.phone,
            "email": member.user.email,
            "role": member.user.role.value,
            "membership_status": member.membership_status.value,
            "message": "Member updated successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch(
    "/members/{member_id}/reactivate",
    response_model=dict,
    summary="Reactivate a suspended member",
)
async def reactivate_member(
    member_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Reactivate a suspended member.
    """
    service = MemberService(db)

    try:
        member = await service.reactivate_member(member_id)
        
        return {
            "id": str(member.id),
            "membership_status": member.membership_status.value,
            "message": "Member reactivated",
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============================================
# Booking Management
# ============================================

@router.get(
    "/bookings",
    response_model=dict,
    summary="List all bookings",
)
async def list_all_bookings(
    member_id: Optional[UUID] = Query(None, description="Filter by member"),
    status: Optional[str] = Query(None, description="Filter by status"),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(1000, ge=1, le=10000, description="Max number of bookings to return (default: 1000)"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all bookings across all members.
    
    Supports filtering by member, status, and date range.
    """
    service = BookingService(db)
    
    status_enum = None
    if status:
        try:
            status_enum = BookingStatus(status.upper())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid status",
            )
    
    bookings, total = await service.list_all_bookings(
        member_id=member_id,
        status=status_enum,
        from_date=from_date,
        to_date=to_date,
        page=page,
        limit=limit,
    )
    
    # Build response with member info, resource info, and creator info
    booking_list = []
    for booking in bookings:
        # Safely access nested attributes
        member_name = "Unknown"
        member_email = "Unknown"

        if booking.member:
            member_name = booking.member.full_name
            if hasattr(booking.member, 'user') and booking.member.user:
                member_email = booking.member.user.email

        # Get resource/facility name
        resource_name = "Main Gym"  # Default for legacy bookings
        if booking.resource:
            resource_name = booking.resource.name

        # Get creator name
        creator_name = "Unknown"
        if booking.creator:
            creator_name = booking.creator.email

        booking_list.append({
            "id": str(booking.id),
            "member_id": str(booking.member_id),
            "member_name": member_name,
            "member_email": member_email,
            "resource_id": str(booking.resource_id) if booking.resource_id else None,
            "resource_name": resource_name,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "status": booking.status.value,
            "booking_type": booking.booking_type.value if hasattr(booking.booking_type, 'value') else booking.booking_type,
            "party_size": booking.party_size,
            "recurring_pattern_id": str(booking.recurring_pattern_id) if booking.recurring_pattern_id else None,
            "created_by": str(booking.created_by),
            "creator_name": creator_name,
            "created_at": booking.created_at,
        })
    
    return {
        "bookings": booking_list,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post(
    "/bookings",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Create booking for a member",
    responses={
        409: {
            "description": "Booking conflict (capacity exceeded)",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Time slot is full.",
                        "error_code": "CAPACITY_EXCEEDED"
                    }
                }
            }
        }
    }
)
async def create_booking_for_member(
    booking_data: AdminBookingCreate,
    override_rules: bool = Query(
        False,
        description="Admin override: bypass time-based rules (NOT capacity)"
    ),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a booking on behalf of a member.
    
    Admin can book for any active member.
    
    Admin Override Capabilities (when override_rules=true):
    - Create bookings for past times
    - Create bookings beyond the advance booking limit
    - Bypass member overlap check (allow double-booking)
    - Bypass minimum/maximum duration limits
    
    NEVER Overridable:
    - Capacity limits (safety constraint - max 20 people)
    
    Error Response Format:
    ```json
    {
        "detail": "Human readable message",
        "error_code": "MACHINE_READABLE_CODE"
    }
    ```
    """
    member_service = MemberService(db)
    member = await member_service.get_member_by_id(booking_data.member_id)
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )
    
    if member.membership_status != MembershipStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member is not active",
        )
    
    booking_service = BookingService(db)

    try:
        booking = await booking_service.create_booking(
            member_id=booking_data.member_id,
            start_time=booking_data.start_time,
            end_time=booking_data.end_time,
            booking_type=booking_data.booking_type,
            party_size=booking_data.party_size,
            created_by=admin.id,
            admin_override=override_rules,
            creator_role=admin.role.value,
            resource_id=booking_data.resource_id if hasattr(booking_data, 'resource_id') else None,
        )
        
        return {
            "id": str(booking.id),
            "member_id": str(booking.member_id),
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "status": booking.status.value,
            "created_by": str(booking.created_by),
            "admin_override_used": override_rules,
            "message": "Booking created for member",
        }
    
    except BookingError as e:
        return booking_error_response(e, 409 if e.code == BookingErrorCode.CAPACITY_EXCEEDED else 400)


@router.patch(
    "/bookings/{booking_id}/approve",
    response_model=dict,
    summary="Approve a pending booking",
)
async def approve_booking(
    booking_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a booking that is pending approval.

    Changes status from PENDING_APPROVAL to CONFIRMED.
    """
    service = BookingService(db)

    booking = await service.get_booking_by_id(booking_id)

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    if booking.status != BookingStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is not pending approval",
        )

    booking.status = BookingStatus.CONFIRMED

    resource_name = booking.resource.name if booking.resource else "Facility"
    date_str = booking.start_time.strftime("%a, %d %b %Y at %H:%M")
    await _notify(
        db=db,
        user_id=booking.member.user_id,
        notification_type=NotificationType.BOOKING_APPROVED,
        title="Booking Approved",
        message=f"Your {resource_name} booking on {date_str} has been confirmed.",
        booking_id=booking.id,
    )

    await db.commit()
    await db.refresh(booking)

    return {
        "id": str(booking.id),
        "status": booking.status.value,
        "message": "Booking approved successfully",
    }


@router.delete(
    "/bookings/{booking_id}",
    response_model=dict,
    summary="Cancel any booking",
)
async def admin_cancel_booking(
    booking_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel any booking (admin override).

    Admin can cancel any member's booking regardless of ownership.
    This can also be used to reject pending bookings.
    """
    service = BookingService(db)

    try:
        # Load booking first to check if it's a pending approval being rejected
        existing = await service.get_booking_by_id(booking_id)
        was_pending = existing and existing.status == BookingStatus.PENDING_APPROVAL
        notif_data = None
        if was_pending and existing.member:
            resource_name = existing.resource.name if existing.resource else "Facility"
            date_str = existing.start_time.strftime("%a, %d %b %Y at %H:%M")
            notif_data = {
                "user_id": existing.member.user_id,
                "message": f"Your {resource_name} booking request for {date_str} has been declined.",
            }

        booking = await service.cancel_booking(
            booking_id=booking_id,
            cancelled_by=admin.id,
        )

        # Create rejection notification (cancel_booking already committed; use new commit)
        if notif_data:
            await _notify(
                db=db,
                user_id=notif_data["user_id"],
                notification_type=NotificationType.BOOKING_REJECTED,
                title="Booking Request Declined",
                message=notif_data["message"],
                booking_id=booking.id,
            )
            await db.commit()

        return {
            "id": str(booking.id),
            "status": booking.status.value,
            "cancelled_by": str(booking.cancelled_by),
            "cancelled_at": booking.cancelled_at,
            "message": "Booking cancelled by admin",
        }

    except BookingError as e:
        status_code = 404 if e.code == BookingErrorCode.BOOKING_NOT_FOUND else 400
        return booking_error_response(e, status_code)


@router.patch(
    "/bookings/{booking_id}",
    response_model=BookingResponse,
    summary="Edit any booking (admin)",
)
async def admin_edit_booking(
    booking_id: UUID,
    payload: EditBookingRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Edit any booking (admin override).

    Admins can edit any member's booking to change times/dates.
    This is useful for resolving conflicts or accommodating last-minute matches.
    """
    from app.services.booking_service import BookingService
    from app.services.conflict_service import ConflictService
    from app.services.policy_service import PolicyService

    service = BookingService(
        db,
        conflict_service=ConflictService(db),
        policy_service=PolicyService(),
    )

    try:
        booking = await service.edit_booking(
            booking_id=booking_id,
            edit=payload,
            actor_user=admin,
            is_admin=True,
        )
        await db.commit()
        return booking
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================
# Dashboard Statistics
# ============================================

@router.get(
    "/pending-approvals",
    response_model=dict,
    summary="Get all pending approvals",
)
async def get_pending_approvals(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all items pending approval (members and bookings).

    Returns members awaiting approval and bookings awaiting approval.
    """
    from sqlalchemy import select
    from app.models.member import Member
    from app.models.booking import Booking

    # Get pending members
    pending_members_result = await db.execute(
        select(Member).where(
            Member.membership_status == MembershipStatus.PENDING
        ).order_by(Member.created_at.asc())
    )
    pending_members = pending_members_result.scalars().all()

    # Get pending bookings
    pending_bookings_result = await db.execute(
        select(Booking).where(
            Booking.status == BookingStatus.PENDING_APPROVAL
        ).order_by(Booking.created_at.asc())
    )
    pending_bookings = pending_bookings_result.scalars().all()

    # Build response with member info
    member_list = []
    for member in pending_members:
        member_list.append({
            "id": str(member.id),
            "user_id": str(member.user_id),
            "email": member.user.email,
            "full_name": member.full_name,
            "phone": member.phone,
            "created_at": member.created_at,
        })

    # Build response with booking info
    booking_list = []
    for booking in pending_bookings:
        member_name = "Unknown"
        member_email = "Unknown"
        resource_name = "Unknown"

        if booking.member:
            member_name = booking.member.full_name
            if hasattr(booking.member, 'user') and booking.member.user:
                member_email = booking.member.user.email

        if booking.resource:
            resource_name = booking.resource.name

        booking_list.append({
            "id": str(booking.id),
            "member_id": str(booking.member_id),
            "member_name": member_name,
            "member_email": member_email,
            "resource_id": str(booking.resource_id) if booking.resource_id else None,
            "resource_name": resource_name,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "party_size": booking.party_size,
            "notes": booking.notes,
            "created_at": booking.created_at,
        })

    return {
        "pending_members": member_list,
        "pending_bookings": booking_list,
        "total_pending": len(member_list) + len(booking_list),
    }


@router.get(
    "/stats",
    response_model=dict,
    summary="Get dashboard statistics",
)
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get overview statistics for the admin dashboard.
    """
    from sqlalchemy import select, func
    from app.models.member import Member
    from app.models.booking import Booking

    # Count members by status
    total_members_result = await db.execute(select(func.count(Member.id)))
    total_members = total_members_result.scalar()

    pending_members_result = await db.execute(
        select(func.count(Member.id)).where(
            Member.membership_status == MembershipStatus.PENDING
        )
    )
    pending_members = pending_members_result.scalar()

    active_members_result = await db.execute(
        select(func.count(Member.id)).where(
            Member.membership_status == MembershipStatus.ACTIVE
        )
    )
    active_members = active_members_result.scalar()

    # Count pending bookings
    pending_bookings_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.PENDING_APPROVAL
        )
    )
    pending_bookings = pending_bookings_result.scalar()

    # Count bookings today (confirmed bookings only)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)

    bookings_today_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time >= today_start,
            Booking.start_time <= today_end,
        )
    )
    bookings_today = bookings_today_result.scalar()

    # Total pending approvals = pending members + pending bookings
    total_pending_approvals = pending_members + pending_bookings

    return {
        "total_members": total_members,
        "pending_members": pending_members,
        "pending_bookings": pending_bookings,
        "pending_approvals": total_pending_approvals,
        "active_members": active_members,
        "total_bookings_today": bookings_today,
    }


@router.get(
    "/analytics",
    response_model=dict,
    summary="Get aggregate booking analytics across all members",
)
async def get_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive booking analytics for all members combined.

    Returns aggregate stats similar to individual member analytics but
    across the entire system.
    """
    from sqlalchemy import select, func
    from app.models.booking import Booking
    from app.models.resource import Resource
    from sqlalchemy.orm import selectinload
    from datetime import datetime, timedelta

    now = datetime.utcnow()

    # Total bookings (all statuses)
    total_bookings_result = await db.execute(
        select(func.count(Booking.id))
    )
    total_bookings = total_bookings_result.scalar() or 0

    # Upcoming bookings (confirmed, end_time >= now)
    upcoming_bookings_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.end_time >= now
        )
    )
    upcoming_bookings = upcoming_bookings_result.scalar() or 0

    # Completed bookings (confirmed, end_time < now)
    completed_bookings_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.end_time < now
        )
    )
    completed_bookings = completed_bookings_result.scalar() or 0

    # Cancelled bookings
    cancelled_bookings_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.CANCELLED
        )
    )
    cancelled_bookings = cancelled_bookings_result.scalar() or 0

    # Get bookings by facility type (by querying resource names)
    # We'll get all bookings with resources and group by resource name patterns
    bookings_with_resources = await db.execute(
        select(Booking).options(
            selectinload(Booking.resource)
        ).where(Booking.status == BookingStatus.CONFIRMED)
    )
    all_bookings = bookings_with_resources.scalars().all()

    gym_count = 0
    pitch_count = 0
    clubhouse_count = 0
    ball_wall_count = 0

    for booking in all_bookings:
        resource_name = booking.resource.name.lower() if booking.resource else "gym"

        if "gym" in resource_name:
            gym_count += 1
        elif "main pitch" in resource_name or "minor pitch" in resource_name:
            pitch_count += 1
        elif "ball wall" in resource_name:
            ball_wall_count += 1
        elif "changing room" in resource_name or "committee" in resource_name or "kitchen" in resource_name:
            clubhouse_count += 1
        else:
            # Default to gym for legacy bookings
            gym_count += 1

    # Calculate total hours booked (confirmed bookings only)
    total_hours = 0
    for booking in all_bookings:
        duration = booking.end_time - booking.start_time
        hours = duration.total_seconds() / 3600
        total_hours += hours

    # Round to 1 decimal place
    total_hours_booked = round(total_hours, 1)

    # This week's bookings (Mon-Sun)
    today = datetime.utcnow().date()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    start_of_week_dt = datetime.combine(start_of_week, datetime.min.time())
    end_of_week_dt = start_of_week_dt + timedelta(days=7)

    this_week_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time >= start_of_week_dt,
            Booking.start_time < end_of_week_dt
        )
    )
    this_week_bookings = this_week_result.scalar() or 0

    # This month's bookings
    start_of_month = today.replace(day=1)
    start_of_month_dt = datetime.combine(start_of_month, datetime.min.time())

    this_month_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time >= start_of_month_dt
        )
    )
    this_month_bookings = this_month_result.scalar() or 0

    return {
        "total_bookings": total_bookings,
        "upcoming_bookings": upcoming_bookings,
        "completed_bookings": completed_bookings,
        "cancelled_bookings": cancelled_bookings,
        "gym_bookings": gym_count,
        "pitch_bookings": pitch_count,
        "clubhouse_bookings": clubhouse_count,
        "ball_wall_bookings": ball_wall_count,
        "total_hours_booked": total_hours_booked,
        "this_week_bookings": this_week_bookings,
        "this_month_bookings": this_month_bookings,
    }

