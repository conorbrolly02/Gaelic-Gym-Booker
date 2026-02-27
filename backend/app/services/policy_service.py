from __future__ import annotations

import os
from datetime import datetime, timezone

from app.models.booking import BookingStatus


class PolicyService:
    """
    Contains policy rules such as cancellation cutoff windows.
    """

    def __init__(self):
        # default: 120 minutes (2 hours)
        self.cutoff_mins = int(os.getenv("CANCEL_CUTOFF_MINS", "120"))

    def can_cancel(self, booking) -> bool:
        """
        Returns True if booking can be cancelled by a normal member.
        Admin overrides ignore this cutoff.
        """
        if booking.status != BookingStatus.CONFIRMED:
            return False

        now = datetime.now(timezone.utc)
        diff = (booking.start_time - now).total_seconds() / 60

        return diff >= self.cutoff_mins