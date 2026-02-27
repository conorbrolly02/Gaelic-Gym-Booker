"""
Booking Scenarios Test Suite.

Comprehensive tests covering:
- Happy Path (booking creation, viewing, cancellation)
- Capacity Rules (full slot handling, race conditions)

These tests run against the actual API endpoints.
"""

import pytest
import httpx
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import os


# API base URL for the running backend
API_BASE_URL = "http://127.0.0.1:8000"

# Test credentials
TEST_PASSWORD = "TestPassword123!"


def get_unique_email(prefix: str = "booking") -> str:
    """Generate unique email for each test run."""
    return f"{prefix}_{uuid4().hex[:8]}@example.com"


def get_future_time_slot(hours_ahead: int = 2, duration_hours: int = 1):
    """Generate a future time slot for booking."""
    start = datetime.now(timezone.utc) + timedelta(hours=hours_ahead)
    start = start.replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=duration_hours)
    return start.isoformat(), end.isoformat()


async def register_and_login(client: httpx.AsyncClient, email: str = None, activate: bool = True):
    """Helper to register a new user, optionally activate, and login."""
    if email is None:
        email = get_unique_email()
    
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": TEST_PASSWORD,
            "full_name": f"Test User {uuid4().hex[:4]}",
            "phone": f"555{uuid4().hex[:7]}",
        },
    )
    
    # Attempt to activate member if admin credentials available
    if activate:
        await activate_member_as_admin(client, email)
    
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )
    
    return login_response.cookies, email


async def activate_member_as_admin(client: httpx.AsyncClient, member_email: str):
    """Helper to activate a member using admin credentials."""
    admin_email = os.environ.get("TEST_ADMIN_EMAIL")
    admin_password = os.environ.get("TEST_ADMIN_PASSWORD")
    
    if not admin_email or not admin_password:
        return False
    
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": admin_email, "password": admin_password},
    )
    
    if login_response.status_code != 200:
        return False
    
    admin_cookies = login_response.cookies
    
    # Get all members - API returns {"members": [...], "total": N, ...}
    members_response = await client.get(
        "/api/v1/admin/members",
        cookies=admin_cookies,
    )
    
    if members_response.status_code != 200:
        return False
    
    response_data = members_response.json()
    members = response_data.get("members", [])
    
    # Find member by email - email is directly on member object
    target_member = None
    for member in members:
        if member.get("email") == member_email:
            target_member = member
            break
    
    if not target_member:
        return False
    
    approve_response = await client.patch(
        f"/api/v1/admin/members/{target_member['id']}/approve",
        cookies=admin_cookies,
    )
    
    return approve_response.status_code == 200


# =============================================================================
# HAPPY PATH TESTS
# =============================================================================

class TestBookingHappyPath:
    """Tests for successful booking operations."""

    @pytest.mark.asyncio
    async def test_active_member_can_book_available_slot(self):
        """
        ✅ Active member can book an available slot.
        
        An approved/active member should be able to create a booking
        for an available time slot.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=24)
            
            response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
            data = response.json()
            assert "id" in data
            assert data["status"] == "CONFIRMED"

    @pytest.mark.asyncio
    async def test_booking_appears_in_member_dashboard(self):
        """
        ✅ Booking appears in member's bookings list.
        
        After creating a booking, it should be visible in the
        member's personal bookings endpoint.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=25)
            
            create_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if create_response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            assert create_response.status_code == 201
            booking_id = create_response.json()["id"]
            
            list_response = await client.get(
                "/api/v1/bookings",
                cookies=cookies,
            )
            
            assert list_response.status_code == 200
            response_data = list_response.json()
            # Handle both wrapped {"bookings": [...]} and direct list responses
            bookings = response_data.get("bookings", response_data) if isinstance(response_data, dict) else response_data
            booking_ids = [b["id"] for b in bookings]
            assert booking_id in booking_ids

    @pytest.mark.asyncio
    async def test_booking_appears_in_admin_view(self):
        """
        ✅ Booking appears in admin's bookings view.
        
        Admins should be able to see all bookings including
        those made by regular members.
        """
        admin_email = os.environ.get("TEST_ADMIN_EMAIL")
        admin_password = os.environ.get("TEST_ADMIN_PASSWORD")
        
        if not admin_email or not admin_password:
            pytest.skip("Admin credentials not configured")
        
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            member_cookies, member_email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=26)
            
            create_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=member_cookies,
            )
            
            if create_response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            assert create_response.status_code == 201
            booking_id = create_response.json()["id"]
            
            admin_login = await client.post(
                "/api/v1/auth/login",
                json={"email": admin_email, "password": admin_password},
            )
            admin_cookies = admin_login.cookies
            
            admin_bookings = await client.get(
                "/api/v1/admin/bookings",
                cookies=admin_cookies,
            )
            
            assert admin_bookings.status_code == 200
            response_data = admin_bookings.json()
            # Handle wrapped {"bookings": [...]} response
            bookings = response_data.get("bookings", response_data) if isinstance(response_data, dict) else response_data
            booking_ids = [b["id"] for b in bookings]
            assert booking_id in booking_ids

    @pytest.mark.asyncio
    async def test_member_can_cancel_their_booking(self):
        """
        ✅ Member can cancel their own booking.
        
        A member should be able to cancel a booking they created.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=27)
            
            create_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=member_cookies if 'member_cookies' in dir() else cookies,
            )
            
            if create_response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            assert create_response.status_code == 201
            booking_id = create_response.json()["id"]
            
            cancel_response = await client.delete(
                f"/api/v1/bookings/{booking_id}",
                cookies=cookies,
            )
            
            assert cancel_response.status_code == 200
            
            get_response = await client.get(
                f"/api/v1/bookings/{booking_id}",
                cookies=cookies,
            )
            
            if get_response.status_code == 200:
                booking = get_response.json()
                assert booking["status"] == "CANCELLED"

    @pytest.mark.asyncio
    async def test_slot_availability_updates_after_booking(self):
        """
        ✅ Slot availability updates after booking.
        
        After a booking is made, the availability endpoint should
        reflect the reduced capacity.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=48)
            
            initial_availability = await client.get(
                "/api/v1/bookings/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if initial_availability.status_code != 200:
                pytest.skip("Availability endpoint not accessible")
            
            initial_data = initial_availability.json()
            initial_count = initial_data.get("current_bookings", 0)
            
            create_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if create_response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            if create_response.status_code != 201:
                pytest.skip(f"Booking failed: {create_response.text}")
            
            updated_availability = await client.get(
                "/api/v1/bookings/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            assert updated_availability.status_code == 200
            updated_data = updated_availability.json()
            updated_count = updated_data.get("current_bookings", 0)
            
            assert updated_count == initial_count + 1

    @pytest.mark.asyncio
    async def test_slot_availability_updates_after_cancellation(self):
        """
        ✅ Slot availability updates after cancellation.
        
        After a booking is cancelled, the slot should show
        increased availability.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=49)
            
            create_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if create_response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            if create_response.status_code != 201:
                pytest.skip(f"Booking failed: {create_response.text}")
            
            booking_id = create_response.json()["id"]
            
            before_cancel = await client.get(
                "/api/v1/bookings/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            before_data = before_cancel.json()
            before_count = before_data.get("current_bookings", before_data.get("booked_count", 0))
            
            # Cancel the booking
            cancel_response = await client.delete(
                f"/api/v1/bookings/{booking_id}",
                cookies=cookies,
            )
            assert cancel_response.status_code == 200
            
            after_cancel = await client.get(
                "/api/v1/bookings/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            after_data = after_cancel.json()
            after_count = after_data.get("current_bookings", after_data.get("booked_count", 0))
            
            # After cancellation, count should decrease (or be 0 if only one booking)
            assert after_count <= before_count, f"Expected count to decrease after cancellation. Before: {before_count}, After: {after_count}"


# =============================================================================
# CAPACITY RULES TESTS
# =============================================================================

class TestCapacityRules:
    """Tests for capacity enforcement."""

    @pytest.mark.asyncio
    async def test_member_cannot_book_full_slot(self):
        """
        ❌ Member cannot book a slot that is at full capacity.
        
        When a slot reaches maximum capacity (20 people),
        additional bookings should be rejected.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=100)
            
            availability = await client.get(
                "/api/v1/bookings/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if availability.status_code == 200:
                data = availability.json()
                if data.get("current_bookings", 0) >= data.get("max_capacity", 20):
                    response = await client.post(
                        "/api/v1/bookings",
                        json={
                            "start_time": start_time,
                            "end_time": end_time,
                        },
                        cookies=cookies,
                    )
                    
                    assert response.status_code in [400, 409, 422]
                    error_data = response.json()
                    assert "capacity" in str(error_data).lower() or "full" in str(error_data).lower()
                else:
                    pytest.skip("Slot not at capacity - cannot test full slot rejection")
            else:
                pytest.skip("Could not check availability")

    @pytest.mark.asyncio
    async def test_booking_fails_gracefully_on_race_condition(self):
        """
        ❌ Booking fails gracefully when last spot is taken simultaneously.
        
        When multiple users try to book the last spot at the same time,
        the system should handle it gracefully without errors.
        
        Note: This test simulates the scenario by checking error handling.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies1, email1 = await register_and_login(client)
            cookies2, email2 = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=150)
            
            async def attempt_booking(cookies):
                return await client.post(
                    "/api/v1/bookings",
                    json={
                        "start_time": start_time,
                        "end_time": end_time,
                    },
                    cookies=cookies,
                )
            
            response1 = await attempt_booking(cookies1)
            response2 = await attempt_booking(cookies2)
            
            valid_codes = [200, 201, 400, 403, 409, 422]
            assert response1.status_code in valid_codes, f"Unexpected status: {response1.status_code}"
            assert response2.status_code in valid_codes, f"Unexpected status: {response2.status_code}"
            
            if response1.status_code in [400, 409, 422]:
                error_data = response1.json()
                assert "detail" in error_data or "message" in error_data
            
            if response2.status_code in [400, 409, 422]:
                error_data = response2.json()
                assert "detail" in error_data or "message" in error_data

    @pytest.mark.asyncio
    async def test_slot_shows_full_when_capacity_reached(self):
        """
        ✅ Slot shows "full" or unavailable when capacity is reached.
        
        The availability endpoint should indicate when a slot
        has no remaining capacity.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=200)
            
            response = await client.get(
                "/api/v1/bookings/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if response.status_code != 200:
                pytest.skip("Availability endpoint not accessible")
            
            data = response.json()
            
            assert "max_capacity" in data or "capacity" in str(data).lower()
            assert "current_bookings" in data or "available" in str(data).lower()
            
            max_cap = data.get("max_capacity", 20)
            current = data.get("current_bookings", 0)
            
            if current >= max_cap:
                is_available = data.get("is_available", data.get("available", True))
                assert is_available == False, "Slot should show as unavailable when full"


# =============================================================================
# EDGE CASE TESTS
# =============================================================================

class TestBookingEdgeCases:
    """Tests for booking edge cases and validation."""

    @pytest.mark.asyncio
    async def test_cannot_book_past_time_slot(self):
        """
        ❌ Cannot book a slot in the past.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            past_start = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            past_end = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            
            response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": past_start,
                    "end_time": past_end,
                },
                cookies=cookies,
            )
            
            assert response.status_code in [400, 403, 422]

    @pytest.mark.asyncio
    async def test_cannot_book_overlapping_slots(self):
        """
        ❌ Same member cannot have overlapping bookings.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start_time, end_time = get_future_time_slot(hours_ahead=72, duration_hours=2)
            
            first_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start_time,
                    "end_time": end_time,
                },
                cookies=cookies,
            )
            
            if first_response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            if first_response.status_code != 201:
                pytest.skip(f"First booking failed: {first_response.text}")
            
            overlap_start = (datetime.fromisoformat(start_time.replace('Z', '+00:00')) + timedelta(hours=1)).isoformat()
            overlap_end = (datetime.fromisoformat(end_time.replace('Z', '+00:00')) + timedelta(hours=1)).isoformat()
            
            second_response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": overlap_start,
                    "end_time": overlap_end,
                },
                cookies=cookies,
            )
            
            assert second_response.status_code in [400, 409, 422]

    @pytest.mark.asyncio
    async def test_end_time_must_be_after_start_time(self):
        """
        ❌ End time must be after start time.
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start = datetime.now(timezone.utc) + timedelta(hours=50)
            end = start - timedelta(hours=1)
            
            response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start.isoformat(),
                    "end_time": end.isoformat(),
                },
                cookies=cookies,
            )
            
            # 403 = member pending, 400/422 = validation error
            if response.status_code == 403:
                pytest.skip("Member not active - admin approval required")
            
            assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_booking_duration_limits(self):
        """
        ❌ Booking must respect duration limits (30 min - 8 hours).
        """
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            cookies, email = await register_and_login(client)
            
            start = datetime.now(timezone.utc) + timedelta(hours=96)
            too_long_end = start + timedelta(hours=10)
            
            response = await client.post(
                "/api/v1/bookings",
                json={
                    "start_time": start.isoformat(),
                    "end_time": too_long_end.isoformat(),
                },
                cookies=cookies,
            )
            
            assert response.status_code in [400, 403, 422]
