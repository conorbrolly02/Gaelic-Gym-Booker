"""
Recurring pattern schemas for request/response validation.

Define the structure of recurring booking pattern data.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, time, timedelta, datetime
from app.config import settings


class RecurringPatternCreate(BaseModel):
    """
    Schema for creating a recurring booking pattern.
    
    Validates:
    - pattern_type is valid
    - days_of_week provided for weekly patterns
    - duration is reasonable
    - date range is valid
    """
    pattern_type: str = Field(
        ...,
        description="Type of recurrence: 'daily' or 'weekly'"
    )
    days_of_week: List[int] = Field(
        default=[],
        description="Days for weekly pattern (0=Sunday, 6=Saturday)"
    )
    start_time: time = Field(
        ...,
        description="Time of day for bookings (HH:MM)"
    )
    duration_mins: int = Field(
        ...,
        gt=0,
        le=settings.MAX_BOOKING_DURATION_MINS,
        description="Duration of each booking in minutes"
    )
    valid_from: date = Field(
        ...,
        description="First date for the pattern"
    )
    valid_until: date = Field(
        ...,
        description="Last date for the pattern"
    )
    
    @field_validator("pattern_type")
    @classmethod
    def validate_pattern_type(cls, v):
        """Ensure pattern_type is valid."""
        if v not in ["daily", "weekly"]:
            raise ValueError("pattern_type must be 'daily' or 'weekly'")
        return v
    
    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, v, info):
        """Validate days_of_week values."""
        for day in v:
            if day < 0 or day > 6:
                raise ValueError("days_of_week values must be 0-6")
        return v
    
    @field_validator("valid_until")
    @classmethod
    def validate_date_range(cls, valid_until, info):
        """Ensure valid_until is after valid_from and within limit."""
        valid_from = info.data.get("valid_from")
        if valid_from:
            if valid_until < valid_from:
                raise ValueError("valid_until must be after valid_from")
            max_date = valid_from + timedelta(days=settings.MAX_BOOKING_ADVANCE_DAYS)
            if valid_until > max_date:
                raise ValueError(
                    f"Pattern cannot extend more than {settings.MAX_BOOKING_ADVANCE_DAYS} days"
                )
        return valid_until


class RecurringPatternResponse(BaseModel):
    """
    Schema for recurring pattern data in responses.
    """
    id: UUID
    member_id: UUID
    pattern_type: str
    days_of_week: List[int]
    start_time: time
    duration_mins: int
    valid_from: date
    valid_until: date
    is_active: bool
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class RecurringPatternCreateResponse(BaseModel):
    """
    Response when creating a recurring pattern.
    
    Includes the pattern and stats about created bookings.
    """
    pattern: RecurringPatternResponse
    bookings_created: int
    conflicts_skipped: int
