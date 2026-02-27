"""
Booking model for gym time slot reservations.

Bookings represent a member's reserved time at the gym.
The model supports both one-time and recurring bookings.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Integer
from app.models.types import GUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class BookingStatus(str, enum.Enum):
    """
    Enum defining booking statuses.

    - CONFIRMED: Active booking
    - CANCELLED: Booking was cancelled (soft delete)

    Note: Values must match the PostgreSQL enum values (uppercase)
    """
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class BookingType(str, enum.Enum):
    """
    Enum defining booking types.

    - SINGLE: Individual booking (1 person)
    - TEAM: Team/group booking (multiple people)

    Note: Values must match the PostgreSQL enum values (uppercase)
    """
    SINGLE = "SINGLE"
    TEAM = "TEAM"


class Booking(Base):
    """
    Booking model for gym time slot reservations.
    
    Represents a single booking instance. For recurring bookings,
    each instance is a separate Booking row linked to a RecurringPattern.
    
    Attributes:
        id: Unique booking identifier
        member_id: Member who the booking is for
        start_time: When the booking starts
        end_time: When the booking ends
        status: confirmed or cancelled
        recurring_pattern_id: Optional link to recurring pattern
        created_by: User who created the booking (may be admin)
        cancelled_by: User who cancelled (if applicable)
        cancelled_at: When it was cancelled (if applicable)
    
    Relationships:
        member: The member this booking is for
        recurring_pattern: The pattern that generated this booking (if any)
        creator: User who created the booking
    """
    __tablename__ = "bookings"
    
    id = Column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique booking identifier"
    )
    
    # Which member the booking is for
    member_id = Column(
        GUID,
        ForeignKey("members.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,  # Index for fast member booking lookups
        comment="Member this booking is for"
    )

    # Which resource is being booked (pitch, gym, ball wall, etc.)
    # NULL for legacy gym bookings (before resource model was introduced)
    resource_id = Column(
        GUID,
        ForeignKey("resources.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Resource being booked (pitch, gym, ball wall, etc.)"
    )
    
    # Booking time window
    # Using timezone-aware datetime for 24/7 gym
    start_time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,  # Index for date range queries
        comment="Booking start time"
    )
    
    end_time = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Booking end time"
    )
    
    # Booking status - cancelled bookings are kept for history
    status = Column(
        SQLEnum(BookingStatus),
        nullable=False,
        default=BookingStatus.CONFIRMED,
        index=True,  # Index for filtering active bookings
        comment="Current booking status"
    )

    # Booking type - single or team
    booking_type = Column(
        SQLEnum(BookingType),
        nullable=False,
        default=BookingType.SINGLE,
        comment="Type of booking (single or team)"
    )

    # Party size - number of people for this booking
    # For single bookings, this is 1
    # For team bookings, this can be 1-20
    party_size = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Number of people included in this booking"
    )

    # Area - for pitch bookings only
    # Valid values: "whole", "half-left", "half-right",
    #               "quarter-tl", "quarter-tr", "quarter-bl", "quarter-br"
    # NULL for non-pitch bookings (gym, ball wall, etc.)
    area = Column(
        String(20),
        nullable=True,
        comment="Pitch area for pitch bookings (whole/half-left/half-right/quarter-*)"
    )

    # Pitch booking specific fields
    # These fields are used for pitch bookings to provide additional context
    title = Column(
        String(200),
        nullable=True,
        comment="Booking title/description (for pitch bookings)"
    )

    requester_name = Column(
        String(100),
        nullable=True,
        comment="Name of person requesting the booking (for pitch bookings)"
    )

    team_name = Column(
        String(100),
        nullable=True,
        comment="Team or organization name (for pitch bookings)"
    )

    notes = Column(
        String(500),
        nullable=True,
        comment="Additional notes about the booking (for pitch bookings)"
    )
    
    # Optional link to recurring pattern
    # NULL means this is a one-time booking
    recurring_pattern_id = Column(
        GUID,
        ForeignKey("recurring_patterns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Recurring pattern that generated this booking"
    )
    
    # Track who created the booking
    # If different from member's user_id, an admin created it
    created_by = Column(
        GUID,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="User who created this booking"
    )
    
    # Cancellation tracking
    cancelled_by = Column(
        GUID,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who cancelled this booking"
    )
    
    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the booking was cancelled"
    )
    
    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        comment="When the booking was created"
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Last update timestamp"
    )
    
    # Relationships
    member = relationship(
        "Member",
        back_populates="bookings",
        foreign_keys=[member_id],
        lazy="selectin"
    )
    
    recurring_pattern = relationship(
        "RecurringPattern",
        back_populates="bookings",
        lazy="selectin"
    )

    resource = relationship(
        "Resource",
        foreign_keys=[resource_id],
        lazy="selectin"
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
        lazy="selectin"
    )
    
    def __repr__(self):
        """String representation for debugging."""
        return f"<Booking {self.start_time} - {self.end_time} ({self.status.value})>"

