"""
API Integration Tests for Booking Endpoints.

Tests the booking API endpoints including:
- Creating bookings
- Listing bookings
- Cancelling bookings
- Error responses
- Authentication requirements
"""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient


class TestCreateBookingAPI:
    """Test POST /api/v1/bookings endpoint."""

    @pytest.mark.asyncio
    async def test_create_booking_requires_authentication(
        self, client: AsyncClient, future_booking_times
    ):
        """Should return 401 when not authenticated."""
        start, end = future_booking_times
        response = await client.post(
            "/api/v1/bookings",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_booking_success(
        self,
        client: AsyncClient,
        test_member,
        auth_headers,
        future_booking_times,
    ):
        """Should create booking successfully with valid data."""
        start, end = future_booking_times
        response = await client.post(
            "/api/v1/bookings",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["status"] == "confirmed"

    @pytest.mark.asyncio
    async def test_create_booking_past_time_returns_error(
        self,
        client: AsyncClient,
        test_member,
        auth_headers,
        past_booking_times,
    ):
        """Should return error for past booking times."""
        start, end = past_booking_times
        response = await client.post(
            "/api/v1/bookings",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code in [400, 409]
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "PAST_START_TIME"

    @pytest.mark.asyncio
    async def test_create_booking_invalid_duration_returns_error(
        self, client: AsyncClient, test_member, auth_headers
    ):
        """Should return error for invalid duration."""
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start + timedelta(minutes=10)

        response = await client.post(
            "/api/v1/bookings",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code in [400, 409]
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "DURATION_TOO_SHORT"


class TestListBookingsAPI:
    """Test GET /api/v1/bookings endpoint."""

    @pytest.mark.asyncio
    async def test_list_bookings_requires_authentication(self, client: AsyncClient):
        """Should return 401 when not authenticated."""
        response = await client.get("/api/v1/bookings")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_bookings_returns_empty_initially(
        self, client: AsyncClient, test_member, auth_headers
    ):
        """Should return empty list when no bookings exist."""
        response = await client.get("/api/v1/bookings", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        assert len(data["bookings"]) == 0

    @pytest.mark.asyncio
    async def test_list_bookings_returns_user_bookings(
        self,
        client: AsyncClient,
        test_member,
        auth_headers,
        future_booking_times,
    ):
        """Should return bookings for authenticated user."""
        start, end = future_booking_times
        await client.post(
            "/api/v1/bookings",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=auth_headers,
        )

        response = await client.get("/api/v1/bookings", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["bookings"]) == 1


class TestCancelBookingAPI:
    """Test DELETE /api/v1/bookings/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_cancel_booking_requires_authentication(self, client: AsyncClient):
        """Should return 401 when not authenticated."""
        response = await client.delete("/api/v1/bookings/some-id")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_cancel_own_booking_success(
        self,
        client: AsyncClient,
        test_member,
        auth_headers,
        future_booking_times,
    ):
        """Should cancel own booking successfully."""
        start, end = future_booking_times
        create_response = await client.post(
            "/api/v1/bookings",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=auth_headers,
        )
        booking_id = create_response.json()["id"]

        response = await client.delete(
            f"/api/v1/bookings/{booking_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_booking_returns_error(
        self, client: AsyncClient, test_member, auth_headers
    ):
        """Should return error for nonexistent booking."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(
            f"/api/v1/bookings/{fake_id}",
            headers=auth_headers,
        )

        assert response.status_code in [404, 400]


class TestAvailabilityAPI:
    """Test GET /api/v1/bookings/availability endpoint."""

    @pytest.mark.asyncio
    async def test_check_availability_returns_count(
        self, client: AsyncClient, test_member, auth_headers, future_booking_times
    ):
        """Should return availability information."""
        start, end = future_booking_times
        response = await client.get(
            "/api/v1/bookings/availability",
            params={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "current_bookings" in data
        assert "max_capacity" in data
        assert "available_spots" in data
