"""
API Integration Tests for Authentication Endpoints.

Tests the authentication API endpoints including:
- User registration
- User login
- Token refresh
- Session management
"""

import pytest
from httpx import AsyncClient


class TestRegistrationAPI:
    """Test POST /api/v1/auth/register endpoint."""

    @pytest.mark.asyncio
    async def test_register_new_user_success(self, client: AsyncClient):
        """Should register new user successfully."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "securepassword123",
                "full_name": "New User",
                "phone": "1234567890",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert "user" in data or "id" in data

    @pytest.mark.asyncio
    async def test_register_duplicate_email_fails(
        self, client: AsyncClient, test_user
    ):
        """Should reject duplicate email registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "password123",
                "full_name": "Duplicate User",
                "phone": "0987654321",
            },
        )

        assert response.status_code in [400, 409]

    @pytest.mark.asyncio
    async def test_register_invalid_email_fails(self, client: AsyncClient):
        """Should reject invalid email format."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "password123",
                "full_name": "Invalid Email User",
                "phone": "1234567890",
            },
        )

        assert response.status_code == 422


class TestLoginAPI:
    """Test POST /api/v1/auth/login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user, test_member):
        """Should login successfully with correct credentials."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )

        assert response.status_code == 200
        assert "access_token" in response.cookies or "access_token" in response.json()

    @pytest.mark.asyncio
    async def test_login_wrong_password_fails(
        self, client: AsyncClient, test_user, test_member
    ):
        """Should reject incorrect password."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user_fails(self, client: AsyncClient):
        """Should reject nonexistent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "password123",
            },
        )

        assert response.status_code == 401


class TestCurrentUserAPI:
    """Test GET /api/v1/auth/me endpoint."""

    @pytest.mark.asyncio
    async def test_get_current_user_authenticated(
        self, client: AsyncClient, test_user, test_member, auth_headers
    ):
        """Should return current user info when authenticated."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email

    @pytest.mark.asyncio
    async def test_get_current_user_unauthenticated(self, client: AsyncClient):
        """Should return 401 when not authenticated."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestLogoutAPI:
    """Test POST /api/v1/auth/logout endpoint."""

    @pytest.mark.asyncio
    async def test_logout_success(
        self, client: AsyncClient, test_user, test_member, auth_headers
    ):
        """Should logout successfully."""
        response = await client.post("/api/v1/auth/logout", headers=auth_headers)
        assert response.status_code == 200
