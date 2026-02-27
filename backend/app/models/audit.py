# backend/app/models/audit.py
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base
from app.models.types import GUID
import sqlalchemy as sa

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    actor_user_id = Column(GUID, ForeignKey("users.id"), nullable=False, index=True)
    entity = Column(String(50), nullable=False)      # "booking", "member"
    entity_id = Column(GUID, nullable=False, index=True)
    action = Column(String(50), nullable=False)      # "create","update","cancel","delete","override"
    reason = Column(String(1000), nullable=True)
    before_json = Column(String, nullable=True)
    after_json = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=sa.func.now())