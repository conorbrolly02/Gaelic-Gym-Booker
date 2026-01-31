"""
API Integration Tests for Admin Endpoints.

Tests the admin API endpoints including:
- Member management
- Booking management with override
- Dashboard statistics
- Authorization requirements
"""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient


class TestAdminAuthorization:
    """Test admin authorization requirements."""

    @pytest.mark.asyncio
    async def test_admin_endpoints_require_admin_role(
        self, client: AsyncClient, test_member, auth_headers
    ):
        """Regular member should not access admin endpoints."""
        response = await client.get("/api/v1/admin/members", headers=auth_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_endpoints_accessible_by_admin(
        self, client: AsyncClient, admin_member, admin_auth_headers
    ):
        """Admin should access admin endpoints."""
        response = await client.get(
            "/api/v1/admin/members", headers=admin_auth_headers
        )
        assert response.status_code == 200


class TestAdminMemberManagement:
    """Test admin member management endpoints."""

    @pytest.mark.asyncio
    async def test_list_members(
        self, client: AsyncClient, admin_member, admin_auth_headers
    ):
        """Should list all members."""
        response = await client.get(
            "/api/v1/admin/members", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_member_by_id(
        self, client: AsyncClient, test_member, admin_member, admin_auth_headers
    ):
        """Should get specific member details."""
        response = await client.get(
            f"/api/v1/admin/members/{test_member.id}",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_member.id)


class TestAdminBookingOverride:
    """Test admin booking with override capabilities."""

    @pytest.mark.asyncio
    async def test_admin_create_booking_for_member(
        self,
        client: AsyncClient,
        test_member,
        admin_member,
        admin_auth_headers,
    ):
        """Admin should create booking for any member."""
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start + timedelta(hours=1)

        response = await client.post(
            "/api/v1/admin/bookings",
            json={
                "member_id": str(test_member.id),
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=admin_auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["member_id"] == str(test_member.id)

    @pytest.mark.asyncio
    async def test_admin_override_allows_past_booking(
        self,
        client: AsyncClient,
        test_member,
        admin_member,
        admin_auth_headers,
    ):
        """Admin with override should create past bookings."""
        start = datetime.now(timezone.utc) - timedelta(hours=2)
        end = start + timedelta(hours=1)

        response = await client.post(
            "/api/v1/admin/bookings",
            params={"override_rules": "true"},
            json={
                "member_id": str(test_member.id),
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=admin_auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["admin_override_used"] is True

    @pytest.mark.asyncio
    async def test_admin_cannot_override_capacity(
        self,
        client: AsyncClient,
        db_session,
        test_member,
        admin_member,
        admin_auth_headers,
    ):
        """Admin override should NOT bypass capacity limits."""
        from app.models.booking import Booking, BookingStatus
        from uuid import uuid4

        start = datetime.now(timezone.utc) + timedelta(hours=5)
        end = start + timedelta(hours=1)

        for i in range(20):
            member_id = test_member.id if i == 0 else uuid4()
            booking = Booking(
                id=uuid4(),
                member_id=member_id,
                start_time=start,
                end_time=end,
                status=BookingStatus.CONFIRMED,
                created_by=admin_member.user_id,
            )
            db_session.add(booking)
        await db_session.commit()

        response = await client.post(
            "/api/v1/admin/bookings",
            params={"override_rules": "true"},
            json={
                "member_id": str(test_member.id),
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            headers=admin_auth_headers,
        )

        assert response.status_code == 409
        data = response.json()
        assert data["error_code"] == "CAPACITY_EXCEEDED"


class TestAdminStats:
    """Test admin dashboard statistics."""

    @pytest.mark.asyncio
    async def test_get_dashboard_stats(
        self, client: AsyncClient, admin_member, admin_auth_headers
    ):
        """Should return dashboard statistics."""
        response = await client.get(
            "/api/v1/admin/stats", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "total_members" in data
        assert "total_bookings" in data
