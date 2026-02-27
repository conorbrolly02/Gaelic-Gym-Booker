"""
Authentication service for user registration and login.

Contains the business logic for authentication operations,
separate from HTTP request handling.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Tuple
from uuid import UUID

from app.models.user import User, UserRole
from app.models.member import Member, MembershipStatus
from app.auth.security import hash_password, verify_password


class AuthService:
    """
    Service class for authentication operations.
    
    Handles user registration, login validation, and related logic.
    Database operations are performed through the provided session.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the service with a database session.
        
        Args:
            db: The async database session to use
        """
        self.db = db
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by their email address.
        
        Args:
            email: The email to search for
            
        Returns:
            The User if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """
        Find a user by their ID.
        
        Args:
            user_id: The UUID to search for
            
        Returns:
            The User if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None
    ) -> Tuple[User, Member]:
        """
        Register a new user and create their member profile.
        
        Creates both a User (for auth) and Member (for gym data) record.
        New members start with 'pending' status until admin approves.
        
        Args:
            email: User's email (will be lowercased)
            password: Plain text password (will be hashed)
            full_name: Member's full name
            phone: Optional phone number
            
        Returns:
            Tuple of (User, Member) objects
            
        Raises:
            ValueError: If email is already registered
        """
        # Check for existing user
        existing = await self.get_user_by_email(email)
        if existing:
            raise ValueError("Email already registered")
        
        # Create user with hashed password
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            role=UserRole.MEMBER,
            is_active=True,
        )
        self.db.add(user)
        
        # Flush to get the user ID
        await self.db.flush()
        
        # Create member profile
        member = Member(
            user_id=user.id,
            full_name=full_name,
            phone=phone,
            membership_status=MembershipStatus.PENDING,
        )
        self.db.add(member)
        
        # Commit both records
        await self.db.commit()
        await self.db.refresh(user)
        await self.db.refresh(member)
        
        return user, member
    
    async def authenticate_user(
        self,
        email: str,
        password: str
    ) -> Optional[User]:
        """
        Verify credentials and return user if valid.
        
        Args:
            email: The email to check
            password: The plain text password to verify
            
        Returns:
            The User if credentials are valid, None otherwise
        """
        user = await self.get_user_by_email(email)
        
        if not user:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        return user
    
    async def create_admin_user(
        self,
        email: str,
        password: str,
        full_name: str
    ) -> User:
        """
        Create an admin user (for initial setup).
        
        Admin users don't need member profiles since they
        don't book gym slots.
        
        Args:
            email: Admin's email
            password: Plain text password
            full_name: Admin's name (stored in member profile)
            
        Returns:
            The created admin User
        """
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
