"""
Member API routes.

Handles member profile operations for authenticated members.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.member import MemberUpdate, MemberResponse, MemberAnalytics
from app.services.member_service import MemberService
from app.auth.dependencies import get_current_member
from app.models.member import Member

router = APIRouter(
    prefix="/members",
    tags=["Members"],
)


@router.get(
    "/me",
    response_model=MemberResponse,
    summary="Get current member profile",
)
async def get_my_profile(
    member: Member = Depends(get_current_member)
):
    """
    Get the current authenticated member's profile.
    
    Requires an active membership (not pending or suspended).
    """
    return member


@router.patch(
    "/me",
    response_model=MemberResponse,
    summary="Update current member profile",
)
async def update_my_profile(
    updates: MemberUpdate,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Update the current member's profile.

    Only provided fields are updated.
    """
    service = MemberService(db)

    try:
        updated_member = await service.update_member_profile(
            member_id=member.id,
            full_name=updates.full_name,
            phone=updates.phone,
            qr_code=updates.qr_code,
        )
        return updated_member

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/me/analytics",
    response_model=MemberAnalytics,
    summary="Get current member analytics",
)
async def get_my_analytics(
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed analytics about the current member's booking history.

    Returns statistics about:
    - Total bookings, upcoming, completed, and cancelled
    - Bookings breakdown by facility type
    - Total hours booked
    - Membership duration
    """
    service = MemberService(db)

    try:
        analytics = await service.get_member_analytics(member.id)
        return analytics

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

