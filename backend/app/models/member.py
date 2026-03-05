"""
Member model for gym membership profiles.

Members extend Users with gym-specific information.
This separation allows the auth system to remain generic
while gym-specific logic lives in the Member model.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from app.models.types import GUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class MembershipStatus(str, enum.Enum):
    """
    Enum defining possible membership statuses.
    
    - PENDING: Registered but awaiting admin approval
    - ACTIVE: Approved and can make bookings
    - SUSPENDED: Temporarily disabled by admin
    
    Note: Values must match the PostgreSQL enum values (uppercase)
    """
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class Member(Base):
    """
    Member model for gym-specific profile data.
    
    Each Member has a one-to-one relationship with a User.
    Members must be approved by an admin before they can book.
    
    Attributes:
        id: Unique member identifier
        user_id: Foreign key to the associated User
        full_name: Member's full name
        phone: Optional phone number
        qr_code: Optional QR code for gym access
        membership_status: Current status (pending/active/suspended)
        approved_by: Admin who approved this member
        approved_at: When the member was approved
    
    Relationships:
        user: The associated User account
        bookings: All bookings made by this member
        recurring_patterns: Recurring booking patterns
    """
    __tablename__ = "members"
    
    id = Column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique member identifier"
    )
    
    # Foreign key to users table
    # unique=True enforces one-to-one relationship
    user_id = Column(
        GUID,
        ForeignKey("users.id", ondelete="RESTRICT"),  # Prevent user deletion if member exists
        unique=True,
        nullable=False,
        comment="Associated user account"
    )
    
    # Member's display name
    full_name = Column(
        String(255),
        nullable=False,
        comment="Member's full name"
    )
    
    # Optional contact number
    phone = Column(
        String(20),
        nullable=True,
        comment="Contact phone number"
    )

    # QR code for gym access (stored as base64 or URL)
    qr_code = Column(
        String(100000),  # Large enough for base64 image data (up to ~75KB image)
        nullable=True,
        comment="QR code for gym access"
    )

    # Membership approval status
    # New members are 'pending' until admin approves
    membership_status = Column(
        SQLEnum(MembershipStatus),
        nullable=False,
        default=MembershipStatus.PENDING,
        index=True,  # Index for filtering by status
        comment="Current membership status"
    )
    
    # Track who approved the member (for audit trail)
    approved_by = Column(
        GUID,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin who approved this member"
    )
    
    # When the member was approved
    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Approval timestamp"
    )
    
    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        comment="Registration timestamp"
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Last update timestamp"
    )
    
    # Relationships
    # back_populates creates bidirectional relationship with User
    # foreign_keys specifies which FK to use for this relationship
    user = relationship(
        "User",
        back_populates="member",
        lazy="selectin",  # Eager load user with member
        foreign_keys=[user_id]  # Explicitly specify the FK
    )
    
    # One member can have many bookings
    bookings = relationship(
        "Booking",
        back_populates="member",
        lazy="selectin",
        foreign_keys="Booking.member_id"
    )
    
    # One member can have many recurring patterns
    recurring_patterns = relationship(
        "RecurringPattern",
        back_populates="member",
        lazy="selectin"
    )
    
    def __repr__(self):
        """String representation for debugging."""
        return f"<Member {self.full_name} ({self.membership_status.value})>"

