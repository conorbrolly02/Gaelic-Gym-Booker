"""
Authentication dependencies for FastAPI routes.

These are FastAPI dependencies that can be injected into route handlers
to enforce authentication and authorization requirements.
"""

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.member import Member, MembershipStatus
from app.auth.security import decode_token


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency that extracts and validates the current user from JWT.
    
    Looks for the access token in HTTP-only cookies.
    Raises 401 if no valid token is found.
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            return {"message": f"Hello, {user.email}"}
    """
    # Get token from cookies
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode and verify the token
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify it's an access token (not refresh)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    # Get user from database
    user_id = UUID(payload["sub"])
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the user is active.
    
    Extends get_current_user by also checking is_active flag.
    Use this for routes that should reject deactivated users.
    """
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user


async def get_current_member(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Member:
    """
    Dependency that gets the current user's member profile.
    
    Ensures the user has a member profile and is approved.
    Use this for routes that require an active gym member.
    """
    # Load member profile
    result = await db.execute(
        select(Member).where(Member.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member profile not found",
        )
    
    # Check membership status
    if member.membership_status == MembershipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending approval",
        )
    
    if member.membership_status == MembershipStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Membership suspended",
        )
    
    return member


async def require_admin(
    user: User = Depends(get_current_active_user)
) -> User:
    """
    Dependency that ensures the user is an admin.
    
    Use this for admin-only routes.
    
    Usage:
        @router.get("/admin/users")
        async def list_users(admin: User = Depends(require_admin)):
            # Only admins can reach here
            ...
    """
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user

