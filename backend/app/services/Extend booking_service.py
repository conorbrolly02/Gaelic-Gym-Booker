# backend/app/services/booking_service.py (key excerpts)
import json
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.booking import Booking, BookingStatus, CancelReason
from app.models.audit import AuditEvent
from app.services.conflict_service import ConflictService
from app.services.policy_service import PolicyService

class BookingService:
    def __init__(self, db: AsyncSession, conflicts: ConflictService, policy: PolicyService):
        self.db = db
        self.conflicts = conflicts
        self.policy = policy

    async def create_booking(self, member_id: UUID, data, created_by: UUID, is_admin=False):
        if not getattr(data, "override", False):
            if await self.conflicts.has_overlap(data.resource_id, data.start_time, data.end_time):
                raise ValueError("Conflicts with existing booking.")
        else:
            if not getattr(data, "override_reason", None):
                raise ValueError("Override reason required.")

        b = Booking(
            member_id=member_id,
            resource_id=data.resource_id,
            start_time=data.start_time,
            end_time=data.end_time,
            booking_type=data.booking_type,
            party_size=data.party_size,
            status=BookingStatus.CONFIRMED,
            created_by=created_by,
            override_reason=getattr(data, "override_reason", None)
        )
        self.db.add(b)
        await self.db.flush()
        await self._audit(created_by, "booking", b.id, "create", after=b)
        return b

    async def edit_booking(self, booking_id: UUID, edit, actor_user, is_admin=False):
        b = await self._get_owned_or_admin(booking_id, actor_user, is_admin)
        if b.version != edit.version:
            raise ValueError("Version conflict—refresh and try again.")

        new_start = edit.start_time or b.start_time
        new_end   = edit.end_time or b.end_time
        new_res   = edit.resource_id or b.resource_id

        if await self.conflicts.has_overlap(new_res, new_start, new_end, exclude_booking_id=b.id):
            raise ValueError("Conflicts with existing booking.")

        before = b.__dict__.copy()
        b.start_time = new_start
        b.end_time = new_end
        b.resource_id = new_res
        if edit.party_size is not None:
            b.party_size = edit.party_size
        b.version += 1
        await self._audit(actor_user.id, "booking", b.id, "update", before=before, after=b, reason=edit.reason)
        return b

    async def cancel_booking(self, booking_id: UUID, payload, actor_user, is_admin=False):
        b = await self._get_owned_or_admin(booking_id, actor_user, is_admin)
        if not is_admin and not self.policy.can_cancel(b):
            raise ValueError("Cancellation cutoff reached.")
        if b.status != BookingStatus.CONFIRMED:
            return b

        before = b.__dict__.copy()
        b.status = BookingStatus.CANCELLED
        b.cancel_reason = payload.reason_code or CancelReason.MEMBER_REQUEST
        b.cancel_note = payload.note
        b.cancelled_by = actor_user.id
        b.cancelled_at = datetime.now(timezone.utc)
        b.version += 1
        await self._audit(actor_user.id, "booking", b.id, "cancel", before=before, after=b, reason=payload.note)
        return b

    async def delete_cancelled(self, booking_id: UUID, actor_user, is_admin=False):
        b = await self._get_owned_or_admin(booking_id, actor_user, is_admin)
        if b.status != BookingStatus.CANCELLED:
            raise ValueError("Can only delete cancelled bookings.")
        await self._audit(actor_user.id, "booking", booking_id, "delete")
        await self.db.delete(b)
        return True

    async def _get_owned_or_admin(self, booking_id, actor_user, is_admin):
        res = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        b = res.scalar_one_or_none()
        if not b:
            raise ValueError("Booking not found.")
        if not is_admin and b.member.user_id != actor_user.id:
            raise PermissionError("Forbidden.")
        return b

    async def _audit(self, actor_user_id, entity, entity_id, action, before=None, after=None, reason=None):
        evt = AuditEvent(
            actor_user_id=actor_user_id,
            entity=entity,
            entity_id=entity_id,
            action=action,
            reason=reason,
            before_json=json.dumps(self._safe(before)) if before else None,
            after_json=json.dumps(self._safe(after)) if after else None
        )
        self.db.add(evt)

    def _safe(self, obj):
        if not obj: return None
        if hasattr(obj, "__dict__"): obj = obj.__dict__
        return {k: str(v) for k, v in obj.items() if k not in ("_sa_instance_state", "password_hash")}