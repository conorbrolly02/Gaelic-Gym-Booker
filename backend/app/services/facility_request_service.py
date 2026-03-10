"""
Service layer for facility request business logic.

This service handles all facility request operations including creation,
approval, rejection, and cancellation, along with sending email notifications.
"""

import logging
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.facility_request import FacilityRequest, FacilityRequestStatus
from app.models.member import Member
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class FacilityRequestService:
    """Service for managing facility requests."""

    def __init__(self, db: AsyncSession):
        """Initialize the service with a database session."""
        self.db = db

    async def create_request(
        self,
        member_id: UUID,
        facility_type: str,
        description: str,
        start_date: datetime,
        end_date: datetime,
        purpose: str,
        created_by: UUID,
        requested_equipment: Optional[str] = None,
    ) -> FacilityRequest:
        """
        Create a new facility request.

        Args:
            member_id: ID of the member making the request
            facility_type: Type/name of facility being requested
            description: Detailed description of the request
            start_date: Requested start date/time
            end_date: Requested end date/time
            purpose: Purpose/reason for the request
            created_by: ID of the user creating the request
            requested_equipment: Optional equipment needed

        Returns:
            The created FacilityRequest instance

        Raises:
            ValueError: If validation fails
        """
        # Validate dates
        if end_date <= start_date:
            raise ValueError("End date must be after start date")

        if start_date < datetime.utcnow():
            raise ValueError("Start date cannot be in the past")

        # Get member details for email notification
        result = await self.db.execute(
            select(Member)
            .options(selectinload(Member.user))
            .where(Member.id == member_id)
        )
        member = result.scalar_one_or_none()

        if not member:
            raise ValueError("Member not found")

        # Create the facility request
        facility_request = FacilityRequest(
            member_id=member_id,
            facility_type=facility_type,
            description=description,
            requested_equipment=requested_equipment,
            start_date=start_date,
            end_date=end_date,
            purpose=purpose,
            status=FacilityRequestStatus.PENDING,
            created_by=created_by,
        )

        self.db.add(facility_request)
        await self.db.commit()
        await self.db.refresh(facility_request)

        logger.info(f"Facility request created: {facility_request.id} by member {member_id}")

        # Send email notification to the user
        await email_service.send_facility_request_submitted(
            user_email=member.user.email,
            user_name=member.full_name,
            facility_type=facility_type,
            start_date=start_date,
            end_date=end_date,
            purpose=purpose,
        )

        # Notify admins of the new request
        await email_service.notify_admins_new_facility_request(
            user_name=member.full_name,
            facility_type=facility_type,
            start_date=start_date,
            end_date=end_date,
            purpose=purpose,
        )

        # Create in-app notification for the user
        notification = Notification(
            user_id=member.user_id,
            type=NotificationType.FACILITY_REQUEST_SUBMITTED,
            title="Facility Request Submitted",
            message=f"Your request for {facility_type} has been submitted and is awaiting approval.",
        )
        self.db.add(notification)
        await self.db.commit()

        return facility_request

    async def get_request_by_id(
        self,
        request_id: UUID,
        load_relationships: bool = True
    ) -> Optional[FacilityRequest]:
        """
        Get a facility request by ID.

        Args:
            request_id: The request ID
            load_relationships: Whether to eager load member and approver

        Returns:
            The FacilityRequest instance or None if not found
        """
        query = select(FacilityRequest).where(FacilityRequest.id == request_id)

        if load_relationships:
            query = query.options(
                selectinload(FacilityRequest.member),
                selectinload(FacilityRequest.approver)
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_member_requests(
        self,
        member_id: UUID,
        status: Optional[FacilityRequestStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[FacilityRequest], int]:
        """
        Get all facility requests for a specific member.

        Args:
            member_id: The member ID
            status: Optional status filter
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            Tuple of (list of requests, total count)
        """
        # Build query
        query = select(FacilityRequest).where(FacilityRequest.member_id == member_id)

        if status:
            query = query.where(FacilityRequest.status == status)

        # Get total count
        count_query = select(func.count()).select_from(FacilityRequest).where(
            FacilityRequest.member_id == member_id
        )
        if status:
            count_query = count_query.where(FacilityRequest.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.order_by(FacilityRequest.created_at.desc()).offset(skip).limit(limit)
        query = query.options(selectinload(FacilityRequest.approver))

        result = await self.db.execute(query)
        requests = result.scalars().all()

        return list(requests), total

    async def get_all_requests(
        self,
        status: Optional[FacilityRequestStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[FacilityRequest], int]:
        """
        Get all facility requests (admin only).

        Args:
            status: Optional status filter
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            Tuple of (list of requests, total count)
        """
        # Build query
        query = select(FacilityRequest)

        if status:
            query = query.where(FacilityRequest.status == status)

        # Get total count
        count_query = select(func.count()).select_from(FacilityRequest)
        if status:
            count_query = count_query.where(FacilityRequest.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = (
            query
            .order_by(FacilityRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
            .options(
                selectinload(FacilityRequest.member),
                selectinload(FacilityRequest.approver)
            )
        )

        result = await self.db.execute(query)
        requests = result.scalars().all()

        return list(requests), total

    async def approve_request(
        self,
        request_id: UUID,
        approved_by: UUID,
    ) -> FacilityRequest:
        """
        Approve a facility request.

        Args:
            request_id: ID of the request to approve
            approved_by: ID of the admin approving the request

        Returns:
            The updated FacilityRequest instance

        Raises:
            ValueError: If request not found or cannot be approved
        """
        # Get the request with relationships
        facility_request = await self.get_request_by_id(request_id, load_relationships=True)

        if not facility_request:
            raise ValueError("Facility request not found")

        if facility_request.status != FacilityRequestStatus.PENDING:
            raise ValueError(f"Cannot approve request with status: {facility_request.status}")

        # Get approver details
        result = await self.db.execute(
            select(User).where(User.id == approved_by)
        )
        approver = result.scalar_one_or_none()

        if not approver:
            raise ValueError("Approver not found")

        # Update the request
        facility_request.status = FacilityRequestStatus.APPROVED
        facility_request.approved_by = approved_by
        facility_request.approved_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(facility_request)

        logger.info(f"Facility request {request_id} approved by {approved_by}")

        # Send email notification to the user
        await email_service.send_facility_request_approved(
            user_email=facility_request.member.user.email,
            user_name=facility_request.member.full_name,
            facility_type=facility_request.facility_type,
            start_date=facility_request.start_date,
            end_date=facility_request.end_date,
            approved_by_name=approver.member.full_name if approver.member else approver.email,
        )

        # Create in-app notification
        notification = Notification(
            user_id=facility_request.member.user_id,
            type=NotificationType.FACILITY_REQUEST_APPROVED,
            title="Facility Request Approved",
            message=f"Your request for {facility_request.facility_type} has been approved!",
        )
        self.db.add(notification)
        await self.db.commit()

        return facility_request

    async def reject_request(
        self,
        request_id: UUID,
        rejected_by: UUID,
        reason: str,
    ) -> FacilityRequest:
        """
        Reject a facility request.

        Args:
            request_id: ID of the request to reject
            rejected_by: ID of the admin rejecting the request
            reason: Reason for rejection

        Returns:
            The updated FacilityRequest instance

        Raises:
            ValueError: If request not found or cannot be rejected
        """
        # Get the request with relationships
        facility_request = await self.get_request_by_id(request_id, load_relationships=True)

        if not facility_request:
            raise ValueError("Facility request not found")

        if facility_request.status != FacilityRequestStatus.PENDING:
            raise ValueError(f"Cannot reject request with status: {facility_request.status}")

        # Get rejecter details
        result = await self.db.execute(
            select(User).where(User.id == rejected_by)
        )
        rejecter = result.scalar_one_or_none()

        if not rejecter:
            raise ValueError("Rejecter not found")

        # Update the request
        facility_request.status = FacilityRequestStatus.REJECTED
        facility_request.approved_by = rejected_by  # Store who rejected it
        facility_request.approved_at = datetime.utcnow()
        facility_request.rejection_reason = reason

        await self.db.commit()
        await self.db.refresh(facility_request)

        logger.info(f"Facility request {request_id} rejected by {rejected_by}")

        # Send email notification to the user
        await email_service.send_facility_request_rejected(
            user_email=facility_request.member.user.email,
            user_name=facility_request.member.full_name,
            facility_type=facility_request.facility_type,
            start_date=facility_request.start_date,
            end_date=facility_request.end_date,
            rejected_by_name=rejecter.member.full_name if rejecter.member else rejecter.email,
            reason=reason,
        )

        # Create in-app notification
        notification = Notification(
            user_id=facility_request.member.user_id,
            type=NotificationType.FACILITY_REQUEST_REJECTED,
            title="Facility Request Update",
            message=f"Your request for {facility_request.facility_type} was not approved. Reason: {reason}",
        )
        self.db.add(notification)
        await self.db.commit()

        return facility_request

    async def cancel_request(
        self,
        request_id: UUID,
        member_id: UUID,
    ) -> FacilityRequest:
        """
        Cancel a facility request (by the member who created it).

        Args:
            request_id: ID of the request to cancel
            member_id: ID of the member cancelling (for authorization)

        Returns:
            The updated FacilityRequest instance

        Raises:
            ValueError: If request not found or cannot be cancelled
        """
        facility_request = await self.get_request_by_id(request_id)

        if not facility_request:
            raise ValueError("Facility request not found")

        if facility_request.member_id != member_id:
            raise ValueError("You can only cancel your own requests")

        if facility_request.status in [FacilityRequestStatus.CANCELLED, FacilityRequestStatus.REJECTED]:
            raise ValueError(f"Cannot cancel request with status: {facility_request.status}")

        # Update the request
        facility_request.status = FacilityRequestStatus.CANCELLED

        await self.db.commit()
        await self.db.refresh(facility_request)

        logger.info(f"Facility request {request_id} cancelled by member {member_id}")

        return facility_request

    async def get_statistics(self) -> dict:
        """
        Get statistics about facility requests (admin dashboard).

        Returns:
            Dictionary with statistics
        """
        # Total requests
        total_result = await self.db.execute(
            select(func.count()).select_from(FacilityRequest)
        )
        total = total_result.scalar()

        # Count by status
        pending_result = await self.db.execute(
            select(func.count()).select_from(FacilityRequest)
            .where(FacilityRequest.status == FacilityRequestStatus.PENDING)
        )
        pending = pending_result.scalar()

        approved_result = await self.db.execute(
            select(func.count()).select_from(FacilityRequest)
            .where(FacilityRequest.status == FacilityRequestStatus.APPROVED)
        )
        approved = approved_result.scalar()

        rejected_result = await self.db.execute(
            select(func.count()).select_from(FacilityRequest)
            .where(FacilityRequest.status == FacilityRequestStatus.REJECTED)
        )
        rejected = rejected_result.scalar()

        cancelled_result = await self.db.execute(
            select(func.count()).select_from(FacilityRequest)
            .where(FacilityRequest.status == FacilityRequestStatus.CANCELLED)
        )
        cancelled = cancelled_result.scalar()

        return {
            "total_requests": total,
            "pending_requests": pending,
            "approved_requests": approved,
            "rejected_requests": rejected,
            "cancelled_requests": cancelled,
        }
