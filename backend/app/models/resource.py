# backend/app/models/resource.py
import enum, uuid
from sqlalchemy import Column, String, Integer, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID

class ResourceType(str, enum.Enum):
    GYM = "GYM"
    PITCH = "PITCH"
    PITCH_HALF = "PITCH_HALF"
    PITCH_QUARTER = "PITCH_QUARTER"
    BALL_WALL = "BALL_WALL"
    BALL_WALL_HALF = "BALL_WALL_HALF"
    ROOM = "ROOM"

class Resource(Base):
    __tablename__ = "resources"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    type = Column(Enum(ResourceType), nullable=False, index=True)
    parent_id = Column(GUID, ForeignKey("resources.id"), nullable=True, index=True)
    capacity = Column(Integer, nullable=False, default=1)
    buffer_mins = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    # Pitch-specific fields
    surface = Column(String(50), nullable=True, comment="Surface type (e.g., Grass, Artificial Turf)")
    location = Column(String(200), nullable=True, comment="Physical location description")

    parent = relationship("Resource", remote_side=[id], backref="children")
