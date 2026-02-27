# backend/app/models/blackout.py
import uuid
from sqlalchemy import Column, DateTime, Boolean, String, ForeignKey
from app.database import Base
from app.models.types import GUID

class Blackout(Base):
    __tablename__ = "blackouts"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    resource_id = Column(GUID, ForeignKey("resources.id"), nullable=True, index=True)  # null => club-wide
    starts_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    title = Column(String(200), nullable=False)
    is_holiday = Column(Boolean, nullable=False, default=False)