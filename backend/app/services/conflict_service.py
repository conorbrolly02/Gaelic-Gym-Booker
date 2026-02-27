from __future__ import annotations

from typing import Set
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resource import Resource
from app.models.booking import Booking, BookingStatus


class ConflictService:
    """
    Handles all resource-level conflict detection.
    Supports hierarchical resources:
    - Full pitch → halves → quarters
    - Ball wall full → half A/B
    - Gym is independent
    - Rooms independent
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_resource_tree(self) -> dict[UUID, Resource]:
        """Loads all resources into a dict for parent/child traversal."""
        result = await self.db.execute(select(Resource))
        all_resources = result.scalars().all()
        return {r.id: r for r in all_resources}

    async def _collect_related(self, resource_id: UUID) -> Set[UUID]:
        """Collects all ancestors + descendants of the resource."""
        tree = await self._load_resource_tree()
        related = set()

        # climb ancestors
        cur = tree.get(resource_id)
        while cur:
            related.add(cur.id)
            cur = cur.parent

        # descend into children
        def add_children(r: Resource):
            related.add(r.id)
            for child in r.children:
                add_children(child)

        root = tree.get(resource_id)
        if root:
            add_children(root)

        return related

    async def has_overlap(
        self,
        resource_id: UUID,
        start,
        end,
        exclude_booking_id: UUID | None = None
    ) -> bool:
        """
        Checks if any booking overlaps the given time for ANY related resource.
        """

        related_ids = await self._collect_related(resource_id)

        q = select(Booking).where(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.resource_id.in_(related_ids),
            Booking.start_time < end,
            Booking.end_time > start
        )

        if exclude_booking_id:
            q = q.where(Booking.id != exclude_booking_id)

        result = await self.db.execute(q)
        return result.scalars().first() is not None