# backend/app/models/recurring_exception.py
import uuid
from sqlalchemy import Column, String, ForeignKey
from app.database import Base
from app.models.types import GUID

class RecurringException(Base):
    __tablename__ = "recurring_exceptions"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    booking_id = Column(GUID, ForeignKey("bookings.id"), nullable=False, index=True)
    reason = Column(String(300), nullable=True)