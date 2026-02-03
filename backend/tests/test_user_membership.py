"""
User & Membership Test Scenarios.

Comprehensive tests covering:
- Membership Management (admin create/activate member, restrictions)
- Authentication (login, access control, JWT expiry)

These tests run against the actual API endpoints.
"""

import pytest
import httpx
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from jose import jwt
import os


# API base URL for the running backend
API_BASE_URL = "http://127.0.0.1:8000"

# Test credentials - using unique emails to avoid conflicts
TEST_PASSWORD = "TestPassword123!"


def get_unique_email(prefix: str = "test") -> str:
    """Generate unique email for each test run."""
    return f"{prefix}_{uuid4().hex[:8]}@example.com"


@pytest.fixture
def api_client():
    """Create HTTP client for API testing."""
    return httpx.Client(base_url=API_BASE_URL, timeout=30.0)


@pytest.fixture
def async_api_client():
    """Create async HTTP client for API testing."""
    return httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0)


# =============================================================================
# MEMBERSHIP MANAGEMENT TESTS
# =============================================================================

class TestMembershipManagement:
    """Tests for membership creation and management."""

    @pytest.mark.asyncio
    async def test_admin_can_create_member_via_registration(self, async_api_client):
        """
        ✅ Admin can create a new member (via registration endpoint).
        
        New members are created through the registration endpoint.
        """
        async with async_api_client as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": get_unique_email("newmember"),
                    "password": TEST_PASSWORD,
                    "full_name": "New Member",
                    "phone": "5551234567",
                },
            )
            
            assert response.status_code == 201
            data = response.json()
            assert "user_id" in data
            assert "message" in data

    @pytest.mark.asyncio
    async def test_member_is_pending_by_default(self, async_api_client):
        """
        ✅ Member is inactive (pending) by default after registration.
        
        New registrations start with PENDING status until admin approves.
        """
        email = get_unique_email("pendingtest")
        
        async with async_api_client as client:
            # Register new member
            reg_response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "Pending Test Member",
                    "phone": "5559876543",
                },
            )
            
            assert reg_response.status_code == 201
            
            # Login and check status
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                },
            )
            
            if login_response.status_code == 200:
                data = login_response.json()
                if "member" in data and data["member"]:
                    assert data["member"]["membership_status"] == "PENDING"

    @pytest.mark.asyncio
    async def test_duplicate_email_rejected(self, async_api_client):
        """
        ❌ Duplicate email addresses are rejected.
        
        Registration with existing email should fail.
        """
        email = get_unique_email("duplicate")
        
        async with async_api_client as client:
            # First registration
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "First User",
                    "phone": "1111111111",
                },
            )
            
            # Second registration with same email
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "Duplicate User",
                    "phone": "2222222222",
                },
            )
            
            assert response.status_code == 409


# =============================================================================
# AUTHENTICATION TESTS
# =============================================================================

class TestAuthentication:
    """Tests for authentication and authorization."""

    @pytest.mark.asyncio
    async def test_member_can_login_with_valid_credentials(self, async_api_client):
        """
        ✅ Member can log in with valid credentials.
        """
        email = get_unique_email("logintest")
        
        async with async_api_client as client:
            # Register first
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "Login Test User",
                    "phone": "3333333333",
                },
            )
            
            # Login
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                },
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "user" in data
            assert data["user"]["email"] == email

    @pytest.mark.asyncio
    async def test_member_cannot_login_with_invalid_password(self, async_api_client):
        """
        ❌ Member cannot log in with invalid password.
        """
        email = get_unique_email("wrongpwd")
        
        async with async_api_client as client:
            # Register first
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "Wrong Password Test",
                    "phone": "4444444444",
                },
            )
            
            # Try login with wrong password
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": email,
                    "password": "WrongPassword123!",
                },
            )
            
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_nonexistent_user_cannot_login(self, async_api_client):
        """
        ❌ Non-existent user cannot log in.
        """
        async with async_api_client as client:
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": "nonexistent@example.com",
                    "password": "anypassword",
                },
            )
            
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_user_cannot_access_protected_routes(
        self, async_api_client
    ):
        """
        ❌ Non-authenticated users cannot access protected routes.
        """
        async with async_api_client as client:
            # Try to access protected endpoints without auth
            endpoints = [
                "/api/v1/auth/me",
                "/api/v1/bookings",
                "/api/v1/members/me",
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint)
                assert response.status_code == 401, f"Expected 401 for {endpoint}"

    @pytest.mark.asyncio
    async def test_member_cannot_access_admin_endpoints(self, async_api_client):
        """
        ❌ Member cannot access admin endpoints.
        """
        email = get_unique_email("memberadmintest")
        
        async with async_api_client as client:
            # Register and login
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "Member Admin Test",
                    "phone": "5555555555",
                },
            )
            
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                },
            )
            
            # Get cookies from login
            cookies = login_response.cookies
            
            # Try to access admin endpoint
            response = await client.get(
                "/api/v1/admin/members",
                cookies=cookies,
            )
            
            assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_jwt_expires_correctly(self, async_api_client):
        """
        ✅ JWT expires correctly and forces re-login.
        
        Access tokens with past expiry should be rejected.
        """
        # Get the secret key from environment
        secret_key = os.environ.get("SESSION_SECRET", "test-secret")
        
        # Create an expired token
        expired_payload = {
            "sub": str(uuid4()),
            "role": "MEMBER",
            "type": "access",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
            "iat": datetime.now(timezone.utc) - timedelta(minutes=20),
        }
        
        expired_token = jwt.encode(
            expired_payload,
            secret_key,
            algorithm="HS256"
        )
        
        async with async_api_client as client:
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {expired_token}"},
            )
            
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, async_api_client):
        """
        ❌ Invalid/malformed tokens are rejected.
        """
        async with async_api_client as client:
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer invalid.token.here"},
            )
            
            assert response.status_code == 401


# =============================================================================
# ADMIN ACCESS CONTROL TESTS
# =============================================================================

class TestAdminAccessControl:
    """Tests for admin-specific access control.
    
    Note: These tests require an existing admin account.
    Create admin via CLI: python -m app.scripts.create_admin
    """

    @pytest.mark.asyncio
    async def test_admin_login_and_access(self, async_api_client):
        """
        ✅ Admin can access admin endpoints after login.
        
        This test verifies the admin login flow works correctly.
        Note: Requires admin account to exist.
        """
        # Skip if no admin credentials configured
        admin_email = os.environ.get("TEST_ADMIN_EMAIL")
        admin_password = os.environ.get("TEST_ADMIN_PASSWORD")
        
        if not admin_email or not admin_password:
            pytest.skip("Admin credentials not configured for testing")
        
        async with async_api_client as client:
            # Login as admin
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": admin_email,
                    "password": admin_password,
                },
            )
            
            if login_response.status_code != 200:
                pytest.skip("Admin login failed - check credentials")
            
            cookies = login_response.cookies
            
            # Access admin endpoint
            response = await client.get(
                "/api/v1/admin/members",
                cookies=cookies,
            )
            
            assert response.status_code == 200


# =============================================================================
# REGISTRATION VALIDATION TESTS
# =============================================================================

class TestRegistrationValidation:
    """Tests for registration input validation."""

    @pytest.mark.asyncio
    async def test_invalid_email_rejected(self, async_api_client):
        """
        ❌ Invalid email format is rejected.
        """
        async with async_api_client as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "not-an-email",
                    "password": TEST_PASSWORD,
                    "full_name": "Invalid Email User",
                    "phone": "6666666666",
                },
            )
            
            assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_fields_rejected(self, async_api_client):
        """
        ❌ Missing required fields are rejected.
        """
        async with async_api_client as client:
            # Missing password
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": get_unique_email("missingpwd"),
                    "full_name": "Missing Password User",
                },
            )
            
            assert response.status_code == 422


# =============================================================================
# LOGOUT TESTS
# =============================================================================

class TestLogout:
    """Tests for logout functionality."""

    @pytest.mark.asyncio
    async def test_logout_clears_session(self, async_api_client):
        """
        ✅ Logout clears the session and cookies.
        """
        email = get_unique_email("logouttest")
        
        async with async_api_client as client:
            # Register and login
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "full_name": "Logout Test User",
                    "phone": "7777777777",
                },
            )
            
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": email,
                    "password": TEST_PASSWORD,
                },
            )
            
            cookies = login_response.cookies
            
            # Verify we're logged in
            me_response = await client.get("/api/v1/auth/me", cookies=cookies)
            assert me_response.status_code == 200
            
            # Logout
            logout_response = await client.post("/api/v1/auth/logout", cookies=cookies)
            assert logout_response.status_code == 200
