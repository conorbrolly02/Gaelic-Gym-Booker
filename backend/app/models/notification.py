"""
Notification model for user-facing notifications.

Notifications are created when admin actions affect a user's bookings
or membership (e.g., booking approved/rejected, membership approved).
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.types import GUID
from app.database import Base


class NotificationType(str, enum.Enum):
    BOOKING_APPROVED = "BOOKING_APPROVED"
    BOOKING_REJECTED = "BOOKING_REJECTED"
    MEMBERSHIP_APPROVED = "MEMBERSHIP_APPROVED"
    MEMBERSHIP_SUSPENDED = "MEMBERSHIP_SUSPENDED"
    MEMBERSHIP_REACTIVATED = "MEMBERSHIP_REACTIVATED"


class Notification(Base):
    """
    Notification model.

    Stores a notification message for a specific user. Notifications are
    created by admin actions (approve/reject bookings, approve members).
    Users can mark notifications as read or delete them.
    """
    __tablename__ = "notifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)

    user_id = Column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who should receive this notification",
    )

    type = Column(
        SQLEnum(NotificationType),
        nullable=False,
        comment="Type of notification",
    )

    title = Column(String(200), nullable=False, comment="Short notification title")

    message = Column(String(500), nullable=False, comment="Full notification message")

    booking_id = Column(
        GUID,
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        comment="Related booking (if applicable)",
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether the user has read this notification",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        comment="When the notification was created",
    )

    def __repr__(self):
        return f"<Notification {self.type.value} for user {self.user_id}>"
