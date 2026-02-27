# backend/app/models/booking.py (additions)
import enum
from sqlalchemy import Column, Integer, Enum, ForeignKey, String
from sqlalchemy.orm import relationship
from app.models.types import GUID
# ...existing imports and Booking class...

class CancelReason(str, enum.Enum):
    MEMBER_REQUEST = "MEMBER_REQUEST"
    LATE_CANCELLATION = "LATE_CANCELLATION"
    WEATHER = "WEATHER"
    ADMIN_OVERRIDE = "ADMIN_OVERRIDE"
    OTHER = "OTHER"

# inside Booking model:
resource_id = Column(GUID, ForeignKey("resources.id"), nullable=False, index=True)
cancel_reason = Column(Enum(CancelReason), nullable=True)
cancel_note = Column(String(1000), nullable=True)
override_reason = Column(String(1000), nullable=True)
version = Column(Integer, nullable=False, default=1)

resource = relationship("Resource")