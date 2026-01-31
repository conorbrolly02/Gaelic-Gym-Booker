"""
Unit Tests for Booking Service.

Tests business logic in the BookingService class including:
- Booking validation rules
- Capacity enforcement
- Member overlap detection
- Admin override capabilities

Run unit tests only (no database required):
    pytest tests/test_booking_service.py -m unit

Run all tests (requires PostgreSQL):
    pytest tests/test_booking_service.py
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.services.booking_service import BookingService, BookingError, BookingErrorCode
from app.models.booking import Booking, BookingStatus
from app.config import settings


@pytest.mark.unit
class TestBookingTimeValidation:
    """Test booking time validation rules."""

    def test_validate_times_end_before_start_raises_error(self):
        """End time before start time should raise INVALID_TIME_RANGE."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start - timedelta(hours=1)

        with pytest.raises(BookingError) as exc_info:
            service.validate_booking_times(start, end, admin_override=False)

        assert exc_info.value.code == BookingErrorCode.INVALID_TIME_RANGE

    def test_validate_times_past_start_raises_error(self):
        """Past start time should raise PAST_START_TIME."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) - timedelta(hours=1)
        end = datetime.now(timezone.utc) + timedelta(hours=1)

        with pytest.raises(BookingError) as exc_info:
            service.validate_booking_times(start, end, admin_override=False)

        assert exc_info.value.code == BookingErrorCode.PAST_START_TIME

    def test_validate_times_past_start_allowed_with_admin_override(self):
        """Admin override should allow past start times."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) - timedelta(hours=1)
        end = datetime.now(timezone.utc) + timedelta(hours=1)

        service.validate_booking_times(start, end, admin_override=True)

    def test_validate_times_too_short_duration_raises_error(self):
        """Duration below minimum should raise DURATION_TOO_SHORT."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start + timedelta(minutes=15)

        with pytest.raises(BookingError) as exc_info:
            service.validate_booking_times(start, end, admin_override=False)

        assert exc_info.value.code == BookingErrorCode.DURATION_TOO_SHORT

    def test_validate_times_too_long_duration_raises_error(self):
        """Duration above maximum should raise DURATION_TOO_LONG."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start + timedelta(hours=10)

        with pytest.raises(BookingError) as exc_info:
            service.validate_booking_times(start, end, admin_override=False)

        assert exc_info.value.code == BookingErrorCode.DURATION_TOO_LONG

    def test_validate_times_too_far_in_advance_raises_error(self):
        """Booking too far in advance should raise TOO_FAR_IN_ADVANCE."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) + timedelta(days=400)
        end = start + timedelta(hours=1)

        with pytest.raises(BookingError) as exc_info:
            service.validate_booking_times(start, end, admin_override=False)

        assert exc_info.value.code == BookingErrorCode.TOO_FAR_IN_ADVANCE

    def test_validate_times_valid_booking_passes(self):
        """Valid booking times should not raise any error."""
        service = BookingService(None)
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start + timedelta(hours=1)

        service.validate_booking_times(start, end, admin_override=False)


@pytest.mark.unit
class TestBookingErrorCodes:
    """Test BookingError and BookingErrorCode enum."""

    def test_booking_error_contains_code_and_message(self):
        """BookingError should contain both code and message."""
        error = BookingError("Test message", BookingErrorCode.CAPACITY_EXCEEDED)

        assert error.code == BookingErrorCode.CAPACITY_EXCEEDED
        assert error.message == "Test message"
        assert str(error) == "Test message"

    def test_all_error_codes_have_string_values(self):
        """All error codes should have string values for API responses."""
        codes = [
            BookingErrorCode.CAPACITY_EXCEEDED,
            BookingErrorCode.MEMBER_OVERLAP,
            BookingErrorCode.PAST_START_TIME,
            BookingErrorCode.INVALID_TIME_RANGE,
            BookingErrorCode.DURATION_TOO_SHORT,
            BookingErrorCode.DURATION_TOO_LONG,
            BookingErrorCode.TOO_FAR_IN_ADVANCE,
        ]

        for code in codes:
            assert isinstance(code.value, str)
            assert len(code.value) > 0


@pytest.mark.integration
class TestCapacityEnforcement:
    """Test capacity limit enforcement (requires PostgreSQL)."""

    @pytest.mark.asyncio
    async def test_count_overlapping_bookings_returns_count(
        self, db_session, test_member, future_booking_times
    ):
        """Should count overlapping confirmed bookings."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = Booking(
            id=uuid4(),
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            status=BookingStatus.CONFIRMED,
            created_by=test_member.user_id,
        )
        db_session.add(booking)
        await db_session.commit()

        count = await service.count_overlapping_bookings(start, end)
        assert count == 1

    @pytest.mark.asyncio
    async def test_cancelled_bookings_not_counted(
        self, db_session, test_member, future_booking_times
    ):
        """Cancelled bookings should not count toward capacity."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = Booking(
            id=uuid4(),
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            status=BookingStatus.CANCELLED,
            created_by=test_member.user_id,
        )
        db_session.add(booking)
        await db_session.commit()

        count = await service.count_overlapping_bookings(start, end)
        assert count == 0


@pytest.mark.integration
class TestMemberOverlapCheck:
    """Test member overlap detection (requires PostgreSQL)."""

    @pytest.mark.asyncio
    async def test_check_member_overlap_detects_overlap(
        self, db_session, test_member, future_booking_times
    ):
        """Should detect when member has overlapping booking."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = Booking(
            id=uuid4(),
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            status=BookingStatus.CONFIRMED,
            created_by=test_member.user_id,
        )
        db_session.add(booking)
        await db_session.commit()

        has_overlap = await service.check_member_overlap(test_member.id, start, end)
        assert has_overlap is True

    @pytest.mark.asyncio
    async def test_check_member_overlap_no_overlap_different_times(
        self, db_session, test_member, future_booking_times
    ):
        """Should not detect overlap for non-overlapping times."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = Booking(
            id=uuid4(),
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            status=BookingStatus.CONFIRMED,
            created_by=test_member.user_id,
        )
        db_session.add(booking)
        await db_session.commit()

        new_start = end + timedelta(hours=1)
        new_end = new_start + timedelta(hours=1)

        has_overlap = await service.check_member_overlap(test_member.id, new_start, new_end)
        assert has_overlap is False

    @pytest.mark.asyncio
    async def test_cancelled_booking_not_considered_overlap(
        self, db_session, test_member, future_booking_times
    ):
        """Cancelled bookings should not count as overlap."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = Booking(
            id=uuid4(),
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            status=BookingStatus.CANCELLED,
            created_by=test_member.user_id,
        )
        db_session.add(booking)
        await db_session.commit()

        has_overlap = await service.check_member_overlap(test_member.id, start, end)
        assert has_overlap is False


@pytest.mark.integration
class TestCreateBooking:
    """Test booking creation with all validations (requires PostgreSQL)."""

    @pytest.mark.asyncio
    async def test_create_booking_success(
        self, db_session, test_member, test_user, future_booking_times
    ):
        """Should create booking successfully with valid data."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = await service.create_booking(
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            created_by=test_user.id,
        )

        assert booking.id is not None
        assert booking.member_id == test_member.id
        assert booking.status == BookingStatus.CONFIRMED

    @pytest.mark.asyncio
    async def test_create_booking_member_overlap_raises_error(
        self, db_session, test_member, test_user, future_booking_times
    ):
        """Should raise MEMBER_OVERLAP when member has existing booking."""
        service = BookingService(db_session)
        start, end = future_booking_times

        await service.create_booking(
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            created_by=test_user.id,
        )

        with pytest.raises(BookingError) as exc_info:
            await service.create_booking(
                member_id=test_member.id,
                start_time=start,
                end_time=end,
                created_by=test_user.id,
            )

        assert exc_info.value.code == BookingErrorCode.MEMBER_OVERLAP

    @pytest.mark.asyncio
    async def test_create_booking_admin_override_bypasses_overlap(
        self, db_session, test_member, test_user, future_booking_times
    ):
        """Admin override should allow double-booking for same member."""
        service = BookingService(db_session)
        start, end = future_booking_times

        await service.create_booking(
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            created_by=test_user.id,
        )

        booking2 = await service.create_booking(
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            created_by=test_user.id,
            admin_override=True,
        )

        assert booking2.id is not None


@pytest.mark.integration
class TestCancelBooking:
    """Test booking cancellation (requires PostgreSQL)."""

    @pytest.mark.asyncio
    async def test_cancel_booking_success(
        self, db_session, test_member, test_user, future_booking_times
    ):
        """Should cancel booking successfully."""
        service = BookingService(db_session)
        start, end = future_booking_times

        booking = await service.create_booking(
            member_id=test_member.id,
            start_time=start,
            end_time=end,
            created_by=test_user.id,
        )

        cancelled = await service.cancel_booking(
            booking_id=booking.id,
            cancelled_by=test_user.id,
        )

        assert cancelled.status == BookingStatus.CANCELLED
        assert cancelled.cancelled_by == test_user.id
        assert cancelled.cancelled_at is not None

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_booking_raises_error(self, db_session, test_user):
        """Should raise error when booking not found."""
        service = BookingService(db_session)

        with pytest.raises(BookingError) as exc_info:
            await service.cancel_booking(
                booking_id=uuid4(),
                cancelled_by=test_user.id,
            )

        assert exc_info.value.code == BookingErrorCode.BOOKING_NOT_FOUND
