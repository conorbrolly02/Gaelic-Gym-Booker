# Tests Temporarily Disabled

**Date**: 2026-03-09

## Why Tests Are Disabled

Tests have been temporarily disabled because they were creating test users in the **production database** (`gym_booking.db`) instead of using a separate test database.

## What Was Done

1. **Deleted 26 test users** with email patterns:
   - `booking_*@example.com`
   - `test_*@example.com`
   - `admin_*@example.com`

2. **Disabled test configuration**:
   - Renamed `conftest.py` to `conftest.py.disabled`
   - This prevents pytest from running tests that create database records

## The Problem

The test configuration in `conftest.py` was:
- Using the production SQLite database instead of a test database
- Creating real user records during test runs
- Not properly cleaning up test data after tests completed

## To Re-enable Tests Properly

When you're ready to re-enable tests, you need to:

1. **Create a separate test database configuration**:
   ```python
   # In conftest.py
   TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_gym_booking.db"
   ```

2. **Ensure proper cleanup**:
   - Use transactions that rollback after each test
   - Or clear the test database before/after test runs

3. **Add .gitignore entry**:
   ```
   backend/test_gym_booking.db
   ```

## Current Status

- ✅ All test users cleaned from production database
- ✅ Tests disabled (won't create new test users)
- ⚠️ Need to reconfigure tests to use separate database before re-enabling

## Files Modified

- `backend/tests/conftest.py` → `backend/tests/conftest.py.disabled`
- Created this README

## Contact

If you need to run tests, please reconfigure them first to avoid polluting the production database.
