#!/usr/bin/env python
"""
Verify area column exists and works correctly.
Run: python verify_area_column.py
"""

import sqlite3
import sys
from pathlib import Path

def verify_area_column():
    """Verify area column in bookings table."""

    db_path = Path(__file__).parent / 'backend' / 'gym_booking.db'

    if not db_path.exists():
        print(f"[ERROR] Database not found at {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("=" * 50)
    print("  Area Column Verification")
    print("=" * 50)
    print()

    # Check column exists
    cursor.execute("PRAGMA table_info(bookings);")
    columns = {col[1]: col for col in cursor.fetchall()}

    if 'area' not in columns:
        print("[FAIL] Area column does not exist")
        conn.close()
        return False

    area_col = columns['area']
    print("[OK] Area column exists")
    print(f"     Type: {area_col[2]}")
    print(f"     Nullable: {'YES' if not area_col[3] else 'NO'}")
    print()

    # Check migration version
    try:
        cursor.execute("SELECT version_num FROM alembic_version;")
        version = cursor.fetchone()

        if version:
            print(f"[OK] Migration version: {version[0]}")
            expected = 'def789ghi012'
            if version[0] == expected:
                print(f"     (Matches expected: {expected})")
            else:
                print(f"     [WARN] Expected: {expected}")
        else:
            print("[WARN] No migration version found")
    except sqlite3.OperationalError:
        print("[WARN] alembic_version table not found")

    print()

    # Check for bookings with area
    cursor.execute("SELECT COUNT(*) FROM bookings WHERE area IS NOT NULL;")
    count = cursor.fetchone()[0]
    print(f"Bookings with area set: {count}")

    if count > 0:
        cursor.execute("""
            SELECT area, COUNT(*) as cnt
            FROM bookings
            WHERE area IS NOT NULL
            GROUP BY area
            ORDER BY cnt DESC
        """)
        print("\nArea distribution:")
        for row in cursor.fetchall():
            print(f"  - {row[0]:15} : {row[1]} booking(s)")
    else:
        print("  (No pitch bookings created yet)")

    # Check resources table for pitches
    print()
    cursor.execute("SELECT COUNT(*) FROM resources WHERE type = 'PITCH';")
    pitch_count = cursor.fetchone()[0]
    print(f"Pitch resources available: {pitch_count}")

    if pitch_count > 0:
        cursor.execute("SELECT id, name FROM resources WHERE type = 'PITCH';")
        print("\nPitches:")
        for row in cursor.fetchall():
            print(f"  - {row[1]} (ID: {row[0]})")

    conn.close()
    print()
    print("=" * 50)
    print("[OK] Verification complete!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    success = verify_area_column()
    sys.exit(0 if success else 1)
