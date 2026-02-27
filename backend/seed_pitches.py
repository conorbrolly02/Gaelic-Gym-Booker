"""
Seed script to create pitch resources in the database.

Creates two pitch resources:
- Main Pitch
- Minor Pitch

This script is idempotent - it will only create pitches if they don't already exist.

Usage:
    python seed_pitches.py
"""

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.resource import Resource, ResourceType


async def seed_pitches():
    """
    Create pitch resources if they don't already exist.

    Pitches created:
    1. Main Pitch - capacity 1 (only one booking can use entire pitch at a time)
    2. Minor Pitch - capacity 1

    Note: Capacity of 1 because pitch bookings use area-based conflict detection,
    not capacity-based. Multiple bookings can share a pitch if they book different areas.
    """
    async with AsyncSessionLocal() as db:
        # Define pitch data
        pitches_data = [
            {
                "name": "Main Pitch",
                "type": ResourceType.PITCH,
                "capacity": 1,
                "buffer_mins": 0,
                "is_active": True
            },
            {
                "name": "Minor Pitch",
                "type": ResourceType.PITCH,
                "capacity": 1,
                "buffer_mins": 0,
                "is_active": True
            }
        ]

        created_count = 0
        skipped_count = 0

        for pitch_data in pitches_data:
            # Check if pitch already exists (by name and type)
            result = await db.execute(
                select(Resource)
                .where(Resource.name == pitch_data["name"])
                .where(Resource.type == pitch_data["type"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"[OK] Pitch '{pitch_data['name']}' already exists (ID: {existing.id})")
                skipped_count += 1
            else:
                # Create new pitch
                new_pitch = Resource(**pitch_data)
                db.add(new_pitch)
                await db.commit()
                await db.refresh(new_pitch)
                print(f"[OK] Created pitch '{pitch_data['name']}' (ID: {new_pitch.id})")
                created_count += 1

        print(f"\nSummary: Created {created_count}, Skipped {skipped_count}")
        print("Pitch seeding complete!")


if __name__ == "__main__":
    print("Seeding pitch resources...\n")
    asyncio.run(seed_pitches())
