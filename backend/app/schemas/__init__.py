"""
Pydantic Schemas Package.

Schemas define the structure of API request/response bodies.
They provide automatic validation and documentation.
"""

from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenData,
)
from app.schemas.member import (
    MemberCreate,
    MemberUpdate,
    MemberResponse,
    MemberWithUserResponse,
)
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    AvailabilityResponse,
    AvailabilitySlot,
)
from app.schemas.recurring import (
    RecurringPatternCreate,
    RecurringPatternResponse,
)

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenData",
    "MemberCreate",
    "MemberUpdate",
    "MemberResponse",
    "MemberWithUserResponse",
    "BookingCreate",
    "BookingResponse",
    "AvailabilityResponse",
    "AvailabilitySlot",
    "RecurringPatternCreate",
    "RecurringPatternResponse",
]
