"""
Facility Request model for special facility usage requests.

Facility requests allow members to request use of facilities for special purposes
(e.g., events, training sessions, equipment needs) that require admin approval.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from app.models.types import GUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class FacilityRequestStatus(str, enum.Enum):
    """
    Enum defining facility request statuses.

    - PENDING: Request awaiting admin review
    - APPROVED: Request has been approved
    - REJECTED: Request has been rejected
    - CANCELLED: Request was cancelled by the user

    Note: Values must match the PostgreSQL enum values (uppercase)
    """
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class FacilityRequest(Base):
    """
    Facility Request model for special facility usage requests.

    Represents a member's request to use facilities for a special purpose
    that requires administrative approval (e.g., hosting events, special
    training sessions, equipment requests).

    Attributes:
        id: Unique request identifier
        member_id: Member making the request
        facility_type: Type/name of facility being requested
        description: Detailed description of the request
        requested_equipment: Optional list of equipment needed
        start_date: Requested start date/time
        end_date: Requested end date/time
        purpose: Purpose/reason for the request
        status: Current status (pending, approved, rejected, cancelled)
        created_by: User who created the request
        approved_by: Admin who approved/rejected (if applicable)
        approved_at: When it was approved/rejected
        rejection_reason: Reason for rejection (if applicable)
        created_at: When the request was created
        updated_at: When the request was last modified

    Relationships:
        member: The member making the request
        creator: User who created the request
        approver: Admin who approved/rejected the request
    """
    __tablename__ = "facility_requests"

    id = Column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique facility request identifier"
    )

    # Member making the request
    member_id = Column(
        GUID,
        ForeignKey("members.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Member making the request"
    )

    # Request details
    facility_type = Column(
        String(255),
        nullable=False,
        comment="Type/name of facility requested (e.g., 'Main Hall', 'Training Room', 'Equipment')"
    )

    description = Column(
        Text,
        nullable=False,
        comment="Detailed description of what is being requested"
    )

    requested_equipment = Column(
        Text,
        nullable=True,
        comment="Optional list of specific equipment or resources needed"
    )

    start_date = Column(
        DateTime,
        nullable=False,
        index=True,
        comment="Requested start date and time"
    )

    end_date = Column(
        DateTime,
        nullable=False,
        comment="Requested end date and time"
    )

    purpose = Column(
        Text,
        nullable=False,
        comment="Purpose or reason for the facility request"
    )

    # Status tracking
    status = Column(
        SQLEnum(
            FacilityRequestStatus,
            name="facility_request_status",
            create_constraint=True,
            validate_strings=True
        ),
        nullable=False,
        default=FacilityRequestStatus.PENDING,
        index=True,
        comment="Current status of the request"
    )

    # Audit fields
    created_by = Column(
        GUID,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="User who created the request"
    )

    approved_by = Column(
        GUID,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin who approved or rejected the request"
    )

    approved_at = Column(
        DateTime,
        nullable=True,
        comment="When the request was approved or rejected"
    )

    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Reason provided if request was rejected"
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        comment="When the request was created"
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="When the request was last modified"
    )

    # Relationships
    member = relationship("Member", foreign_keys=[member_id], back_populates="facility_requests")
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
