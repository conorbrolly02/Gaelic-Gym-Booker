"""
Facility Request API routes.

Handles facility request operations for members and admins:
- Members can create, view, and cancel their own facility requests
- Admins can view all requests and approve/reject them
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
import math

from app.database import get_db
from app.schemas.facility_request import (
    FacilityRequestCreate,
    FacilityRequestResponse,
    FacilityRequestApprove,
    FacilityRequestReject,
    FacilityRequestListResponse,
    FacilityRequestStatsResponse,
)
from app.services.facility_request_service import FacilityRequestService
from app.auth.dependencies import require_admin, get_current_user
from app.models.user import User
from app.models.member import MembershipStatus
from app.models.facility_request import FacilityRequestStatus


router = APIRouter(
    prefix="/facility-requests",
    tags=["Facility Requests"],
)


# ============================================
# Member Routes
# ============================================

@router.post(
    "",
    response_model=FacilityRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new facility request",
)
async def create_facility_request(
    request_data: FacilityRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new facility request.

    The request will be in PENDING status and require admin approval.
    Email notifications will be sent to the user and admins.
    """
    # Check that user has a member profile and is active
    if not user.member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member profile not found"
        )

    if user.member.membership_status != MembershipStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Membership status is {user.member.membership_status.value}. Active membership required."
        )

    service = FacilityRequestService(db)

    try:
        facility_request = await service.create_request(
            member_id=user.member.id,
            facility_type=request_data.facility_type,
            description=request_data.description,
            start_date=request_data.start_date,
            end_date=request_data.end_date,
            purpose=request_data.purpose,
            created_by=user.id,
            requested_equipment=request_data.requested_equipment,
        )
        return facility_request
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "",
    response_model=FacilityRequestListResponse,
    summary="Get my facility requests",
)
async def get_my_facility_requests(
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by status: pending, approved, rejected, cancelled"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all facility requests for the current user.

    Returns paginated list of requests with optional status filtering.
    """
    if not user.member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member profile not found"
        )

    service = FacilityRequestService(db)

    # Convert status string to enum
    status_enum = None
    if status_filter:
        try:
            status_enum = FacilityRequestStatus(status_filter.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: pending, approved, rejected, cancelled"
            )

    # Calculate pagination
    skip = (page - 1) * page_size

    # Get requests
    requests, total = await service.get_member_requests(
        member_id=user.member.id,
        status=status_enum,
        skip=skip,
        limit=page_size,
    )

    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return FacilityRequestListResponse(
        requests=requests,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{request_id}",
    response_model=FacilityRequestResponse,
    summary="Get a specific facility request",
)
async def get_facility_request(
    request_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific facility request.

    Users can only view their own requests (unless they're an admin).
    """
    if not user.member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member profile not found"
        )

    service = FacilityRequestService(db)

    facility_request = await service.get_request_by_id(request_id)

    if not facility_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility request not found"
        )

    # Check authorization: user must own the request or be an admin
    if facility_request.member_id != user.member.id and user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own facility requests"
        )

    return facility_request


@router.delete(
    "/{request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel a facility request",
)
async def cancel_facility_request(
    request_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a facility request.

    Users can only cancel their own pending or approved requests.
    """
    if not user.member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member profile not found"
        )

    service = FacilityRequestService(db)

    try:
        await service.cancel_request(
            request_id=request_id,
            member_id=user.member.id,
        )
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================
# Admin Routes
# ============================================

admin_router = APIRouter(
    prefix="/admin/facility-requests",
    tags=["Admin - Facility Requests"],
)


@admin_router.get(
    "",
    response_model=FacilityRequestListResponse,
    summary="Get all facility requests (admin)",
)
async def admin_get_all_facility_requests(
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by status: pending, approved, rejected, cancelled"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all facility requests (admin only).

    Returns paginated list of all requests with optional status filtering.
    """
    service = FacilityRequestService(db)

    # Convert status string to enum
    status_enum = None
    if status_filter:
        try:
            status_enum = FacilityRequestStatus(status_filter.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: pending, approved, rejected, cancelled"
            )

    # Calculate pagination
    skip = (page - 1) * page_size

    # Get requests
    requests, total = await service.get_all_requests(
        status=status_enum,
        skip=skip,
        limit=page_size,
    )

    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return FacilityRequestListResponse(
        requests=requests,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@admin_router.get(
    "/stats",
    response_model=FacilityRequestStatsResponse,
    summary="Get facility request statistics (admin)",
)
async def admin_get_facility_request_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get statistics about facility requests (admin only).

    Returns counts of requests by status for admin dashboard.
    """
    service = FacilityRequestService(db)
    stats = await service.get_statistics()
    return stats


@admin_router.patch(
    "/{request_id}/approve",
    response_model=FacilityRequestResponse,
    summary="Approve a facility request (admin)",
)
async def admin_approve_facility_request(
    request_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a facility request (admin only).

    Changes status to APPROVED and sends email notification to the requester.
    """
    service = FacilityRequestService(db)

    try:
        facility_request = await service.approve_request(
            request_id=request_id,
            approved_by=admin.id,
        )
        return facility_request
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@admin_router.patch(
    "/{request_id}/reject",
    response_model=FacilityRequestResponse,
    summary="Reject a facility request (admin)",
)
async def admin_reject_facility_request(
    request_id: UUID,
    rejection_data: FacilityRequestReject,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject a facility request (admin only).

    Changes status to REJECTED and sends email notification to the requester
    with the provided reason.
    """
    service = FacilityRequestService(db)

    try:
        facility_request = await service.reject_request(
            request_id=request_id,
            rejected_by=admin.id,
            reason=rejection_data.rejection_reason,
        )
        return facility_request
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
