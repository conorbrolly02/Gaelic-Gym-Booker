"""
Authentication API routes.

Handles user registration, login, logout, and token refresh.
Uses HTTP-only cookies for secure token storage.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserCreate, UserLogin, UserResponse, MessageResponse, UpdateUserProfile
from app.services.auth_service import AuthService
from app.auth.security import create_access_token, create_refresh_token, decode_token
from app.auth.dependencies import get_current_user
from app.models.user import User

# Create router with prefix and tags for OpenAPI docs
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Register a new member account",
    description="Creates a new user and member profile. Member starts in 'pending' status until admin approves."
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new member account.
    
    - Creates User record for authentication
    - Creates Member record for gym-specific data
    - Member starts as 'pending' until admin approves
    - Returns success message with user ID
    """
    service = AuthService(db)
    
    try:
        user, member = await service.register_user(
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            phone=user_data.phone,
        )
        
        return {
            "message": "Registration successful. Awaiting admin approval.",
            "user_id": str(user.id),
        }
    
    except ValueError as e:
        # Email already exists
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.post(
    "/login",
    response_model=dict,
    summary="Log in to get access tokens",
    description="Authenticates user and sets JWT tokens in HTTP-only cookies."
)
async def login(
    response: Response,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate and log in.
    
    - Verifies email and password
    - Creates access and refresh tokens
    - Sets tokens in HTTP-only cookies (secure)
    - Returns user info
    """
    service = AuthService(db)
    
    # Verify credentials
    user = await service.authenticate_user(
        email=credentials.email,
        password=credentials.password,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    
    # Create tokens
    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id, user.role.value)
    
    # Set cookies
    # httponly=True: JavaScript can't access (XSS protection)
    # samesite="lax": CSRF protection
    # secure=True: Only sent over HTTPS (set False for local dev)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set True in production with HTTPS
        max_age=15 * 60,  # 15 minutes
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    
    # Build response with user info
    user_response = {
        "id": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }
    
    member_response = None
    if user.member:
        member_response = {
            "id": str(user.member.id),
            "full_name": user.member.full_name,
            "membership_status": user.member.membership_status.value,
        }
    
    return {
        "message": "Login successful",
        "user": user_response,
        "member": member_response,
    }


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out and clear tokens",
)
async def logout(
    response: Response,
    user: User = Depends(get_current_user)
):
    """
    Log out the current user.
    
    Clears the authentication cookies.
    """
    # Clear cookies by setting them to expire immediately
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    
    return {"message": "Logged out successfully"}


@router.post(
    "/refresh",
    response_model=MessageResponse,
    summary="Refresh access token",
)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a new access token using the refresh token.
    
    Used when the access token expires but refresh token is still valid.
    """
    # Get refresh token from cookies
    token = request.cookies.get("refresh_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )
    
    # Decode and verify
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    # Verify it's a refresh token
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    # Create new access token
    new_access_token = create_access_token(
        user_id=payload["sub"],
        role=payload["role"],
    )
    
    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=15 * 60,
    )
    
    return {"message": "Token refreshed"}


@router.get(
    "/me",
    response_model=dict,
    summary="Get current user info",
)
async def get_me(
    user: User = Depends(get_current_user)
):
    """
    Get the current authenticated user's information.
    
    Includes member profile if the user is a member.
    """
    user_response = {
        "id": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
    }
    
    member_response = None
    if user.member:
        member_response = {
            "id": str(user.member.id),
            "full_name": user.member.full_name,
            "phone": user.member.phone,
            "membership_status": user.member.membership_status.value,
        }
    
    return {
        "user": user_response,
        "member": member_response,
    }


@router.patch(
    "/me",
    response_model=dict,
    summary="Update current user profile",
)
async def update_my_profile(
    updates: UpdateUserProfile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update the current user's email and/or password.

    Requires current password for verification when changing email or password.
    Returns updated user information.
    """
    service = AuthService(db)

    try:
        updated_user = await service.update_user_profile(
            user_id=user.id,
            email=updates.email,
            current_password=updates.current_password,
            new_password=updates.new_password
        )

        user_response = {
            "id": str(updated_user.id),
            "email": updated_user.email,
            "role": updated_user.role.value,
            "is_active": updated_user.is_active,
        }

        member_response = None
        if updated_user.member:
            member_response = {
                "id": str(updated_user.member.id),
                "full_name": updated_user.member.full_name,
                "phone": updated_user.member.phone,
                "membership_status": updated_user.member.membership_status.value,
            }

        return {
            "message": "Profile updated successfully",
            "user": user_response,
            "member": member_response,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

