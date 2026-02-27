"""
Member service for membership management.

Contains the business logic for member-related operations
like approval, suspension, and profile updates.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime

from app.models.user import User
from app.models.member import Member, MembershipStatus
from app.models.booking import Booking, BookingStatus


class MemberService:
    """
    Service class for member management operations.
    
    Handles member approval, suspension, listing, and updates.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the service with a database session.
        
        Args:
            db: The async database session to use
        """
        self.db = db
    
    async def get_member_by_id(self, member_id: UUID) -> Optional[Member]:
        """
        Find a member by their ID.
        
        Args:
            member_id: The member UUID to search for
            
        Returns:
            The Member if found, None otherwise
        """
        result = await self.db.execute(
            select(Member).where(Member.id == member_id)
        )
        return result.scalar_one_or_none()
    
    async def get_member_by_user_id(self, user_id: UUID) -> Optional[Member]:
        """
        Find a member by their associated user ID.
        
        Args:
            user_id: The user UUID to search for
            
        Returns:
            The Member if found, None otherwise
        """
        result = await self.db.execute(
            select(Member).where(Member.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def list_members(
        self,
        status: Optional[MembershipStatus] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Member], int]:
        """
        List members with optional filtering and pagination.
        
        Args:
            status: Filter by membership status
            search: Search in name/email (optional)
            page: Page number (1-indexed)
            limit: Items per page
            
        Returns:
            Tuple of (list of members, total count)
        """
        # Base query joining with User for email search
        query = select(Member).join(User, Member.user_id == User.id)
        count_query = select(func.count(Member.id)).join(User, Member.user_id == User.id)
        
        # Apply status filter
        if status:
            query = query.where(Member.membership_status == status)
            count_query = count_query.where(Member.membership_status == status)
        
        # Apply search filter (name or email)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                (Member.full_name.ilike(search_pattern)) |
                (User.email.ilike(search_pattern))
            )
            count_query = count_query.where(
                (Member.full_name.ilike(search_pattern)) |
                (User.email.ilike(search_pattern))
            )
        
        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit).order_by(Member.created_at.desc())
        
        # Execute query
        result = await self.db.execute(query)
        members = result.scalars().all()
        
        return list(members), total
    
    async def approve_member(
        self,
        member_id: UUID,
        approved_by: UUID
    ) -> Member:
        """
        Approve a pending member.
        
        Changes status from 'pending' to 'active' and records
        who approved them and when.
        
        Args:
            member_id: The member to approve
            approved_by: The admin user ID who approved
            
        Returns:
            The updated Member
            
        Raises:
            ValueError: If member not found or not pending
        """
        member = await self.get_member_by_id(member_id)
        
        if not member:
            raise ValueError("Member not found")
        
        if member.membership_status != MembershipStatus.PENDING:
            raise ValueError("Member is not pending approval")
        
        member.membership_status = MembershipStatus.ACTIVE
        member.approved_by = approved_by
        member.approved_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(member)
        
        return member
    
    async def suspend_member(self, member_id: UUID) -> Member:
        """
        Suspend an active member.
        
        Suspended members cannot log in or make bookings.
        Their existing bookings remain but they cannot create new ones.
        
        Args:
            member_id: The member to suspend
            
        Returns:
            The updated Member
            
        Raises:
            ValueError: If member not found
        """
        member = await self.get_member_by_id(member_id)
        
        if not member:
            raise ValueError("Member not found")
        
        member.membership_status = MembershipStatus.SUSPENDED
        
        await self.db.commit()
        await self.db.refresh(member)
        
        return member
    
    async def reactivate_member(self, member_id: UUID) -> Member:
        """
        Reactivate a suspended member.
        
        Args:
            member_id: The member to reactivate
            
        Returns:
            The updated Member
            
        Raises:
            ValueError: If member not found or not suspended
        """
        member = await self.get_member_by_id(member_id)
        
        if not member:
            raise ValueError("Member not found")
        
        if member.membership_status != MembershipStatus.SUSPENDED:
            raise ValueError("Member is not suspended")
        
        member.membership_status = MembershipStatus.ACTIVE
        
        await self.db.commit()
        await self.db.refresh(member)
        
        return member
    
    async def update_member_profile(
        self,
        member_id: UUID,
        full_name: Optional[str] = None,
        phone: Optional[str] = None
    ) -> Member:
        """
        Update a member's profile information.
        
        Only provided fields are updated.
        
        Args:
            member_id: The member to update
            full_name: New name (optional)
            phone: New phone (optional)
            
        Returns:
            The updated Member
        """
        member = await self.get_member_by_id(member_id)
        
        if not member:
            raise ValueError("Member not found")
        
        if full_name is not None:
            member.full_name = full_name
        
        if phone is not None:
            member.phone = phone
        
        await self.db.commit()
        await self.db.refresh(member)
        
        return member
    
    async def get_member_stats(self, member_id: UUID) -> dict:
        """
        Get booking statistics for a member.
        
        Args:
            member_id: The member to get stats for
            
        Returns:
            Dict with total_bookings and upcoming_bookings counts
        """
        # Count total bookings
        total_result = await self.db.execute(
            select(func.count(Booking.id))
            .where(Booking.member_id == member_id)
            .where(Booking.status == BookingStatus.CONFIRMED)
        )
        total = total_result.scalar()
        
        # Count upcoming bookings
        upcoming_result = await self.db.execute(
            select(func.count(Booking.id))
            .where(Booking.member_id == member_id)
            .where(Booking.status == BookingStatus.CONFIRMED)
            .where(Booking.start_time > datetime.utcnow())
        )
        upcoming = upcoming_result.scalar()
        
        return {
            "total_bookings": total,
            "upcoming_bookings": upcoming,
        }

    async def admin_update_member(
        self,
        member_id: UUID,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        role: Optional[str] = None,
        membership_status: Optional[str] = None
    ) -> Member:
        """
        Admin comprehensive member update including role changes.

        Allows admins to update all member details including:
        - Personal information (name, phone)
        - Email address
        - User role (MEMBER, COACH, ADMIN)
        - Membership status

        Args:
            member_id: The member to update
            full_name: New name (optional)
            phone: New phone (optional)
            email: New email address (optional)
            role: New user role (optional)
            membership_status: New membership status (optional)

        Returns:
            The updated Member

        Raises:
            ValueError: If member not found, email already in use, or invalid role/status
        """
        from app.models.user import UserRole

        member = await self.get_member_by_id(member_id)
        if not member:
            raise ValueError("Member not found")

        # Update member fields
        if full_name is not None:
            member.full_name = full_name

        if phone is not None:
            member.phone = phone

        # Update user email and role
        if email or role:
            user = member.user

            if email and email.lower() != user.email:
                # Check if email already exists
                existing_result = await self.db.execute(
                    select(User).where(User.email == email.lower())
                )
                existing_user = existing_result.scalar_one_or_none()
                if existing_user and existing_user.id != user.id:
                    raise ValueError("Email already in use")
                user.email = email.lower()

            if role:
                try:
                    user.role = UserRole(role.upper())
                except ValueError:
                    raise ValueError(f"Invalid role: {role}. Must be MEMBER, COACH, or ADMIN")

        # Update membership status
        if membership_status:
            try:
                member.membership_status = MembershipStatus(membership_status.upper())
            except ValueError:
                raise ValueError(f"Invalid status: {membership_status}")

        await self.db.commit()
        await self.db.refresh(member)

        return member

