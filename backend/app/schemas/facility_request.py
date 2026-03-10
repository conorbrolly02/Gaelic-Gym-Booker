"""
Pydantic schemas for Facility Request API requests and responses.

These schemas define the shape of data for creating, updating, and returning
facility requests through the API.
"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from app.models.facility_request import FacilityRequestStatus


class FacilityRequestBase(BaseModel):
    """Base schema with common facility request fields."""

    facility_type: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Type or name of facility being requested (e.g., 'Main Hall', 'Training Room')"
    )
    description: str = Field(
        ...,
        min_length=10,
        description="Detailed description of what is being requested"
    )
    requested_equipment: Optional[str] = Field(
        None,
        description="Optional list of specific equipment or resources needed"
    )
    start_date: datetime = Field(
        ...,
        description="Requested start date and time"
    )
    end_date: datetime = Field(
        ...,
        description="Requested end date and time"
    )
    purpose: str = Field(
        ...,
        min_length=10,
        description="Purpose or reason for the facility request"
    )

    @field_validator('end_date')
    @classmethod
    def validate_end_after_start(cls, end_date: datetime, info) -> datetime:
        """Ensure end_date is after start_date."""
        if 'start_date' in info.data:
            start_date = info.data['start_date']
            if end_date <= start_date:
                raise ValueError('end_date must be after start_date')
        return end_date


class FacilityRequestCreate(FacilityRequestBase):
    """Schema for creating a new facility request."""
    pass


class FacilityRequestUpdate(BaseModel):
    """Schema for updating a facility request (partial updates allowed)."""

    facility_type: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )
    description: Optional[str] = Field(
        None,
        min_length=10
    )
    requested_equipment: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    purpose: Optional[str] = Field(
        None,
        min_length=10
    )


class FacilityRequestApprove(BaseModel):
    """Schema for approving a facility request."""
    pass  # No additional fields needed, approval is just a status change


class FacilityRequestReject(BaseModel):
    """Schema for rejecting a facility request."""

    rejection_reason: str = Field(
        ...,
        min_length=10,
        description="Reason for rejecting the request"
    )


class MemberBasicInfo(BaseModel):
    """Basic member information for nested responses."""

    id: str
    full_name: str

    class Config:
        from_attributes = True


class UserBasicInfo(BaseModel):
    """Basic user information for nested responses."""

    id: str
    email: str

    class Config:
        from_attributes = True


class FacilityRequestResponse(FacilityRequestBase):
    """Schema for facility request responses."""

    id: str
    member_id: str
    status: FacilityRequestStatus
    created_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Nested relationships (optional, populated when needed)
    member: Optional[MemberBasicInfo] = None
    approver: Optional[UserBasicInfo] = None

    class Config:
        from_attributes = True


class FacilityRequestListResponse(BaseModel):
    """Schema for paginated list of facility requests."""

    requests: list[FacilityRequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FacilityRequestStatsResponse(BaseModel):
    """Schema for facility request statistics (admin dashboard)."""

    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    cancelled_requests: int
