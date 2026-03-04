import asyncio
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models.resource import Resource, ResourceType


async def update_clubhouse_rooms():
    """Update clubhouse rooms to match the floor plan."""
    async with AsyncSessionLocal() as db:
        # Delete old committee rooms if they exist
        await db.execute(
            delete(Resource).where(
                Resource.name.in_(["Committee Room A", "Committee Room B"])
            )
        )

        # Check if clubhouse rooms already exist
        existing = await db.execute(
            select(Resource).where(
                Resource.name.in_([
                    "Committee Room",
                    "Kitchen",
                    "Changing Room 1",
                    "Changing Room 2",
                    "Changing Room 3",
                    "Changing Room 4",
                    "Referee Changing Room",
                    "Room 2",
                ])
            )
        )
        existing_rooms = {r.name for r in existing.scalars().all()}

        if len(existing_rooms) == 8:
            print("All clubhouse rooms already exist:")
            for room in sorted(existing_rooms):
                print(f"  - {room}")
            return

        print(f"Found {len(existing_rooms)} existing rooms. Adding missing rooms...")

        # Define all clubhouse rooms
        rooms_to_add = {
            "Committee Room": {"capacity": 20, "buffer_mins": 15},
            "Kitchen": {"capacity": 10, "buffer_mins": 15},
            "Changing Room 1": {"capacity": 15, "buffer_mins": 15},
            "Changing Room 2": {"capacity": 15, "buffer_mins": 15},
            "Changing Room 3": {"capacity": 15, "buffer_mins": 15},
            "Changing Room 4": {"capacity": 15, "buffer_mins": 15},
            "Referee Changing Room": {"capacity": 8, "buffer_mins": 15},
            "Room 2": {"capacity": 10, "buffer_mins": 15},
        }

        # Add missing rooms
        for room_name, config in rooms_to_add.items():
            if room_name not in existing_rooms:
                room = Resource(
                    name=room_name,
                    type=ResourceType.ROOM,
                    capacity=config["capacity"],
                    buffer_mins=config["buffer_mins"],
                )
                db.add(room)
                print(f"  Added: {room_name}")

        await db.commit()
        print("\nClubhouse rooms updated successfully!")

        # List all rooms
        all_rooms = await db.execute(
            select(Resource).where(Resource.type == ResourceType.ROOM)
        )
        print("\nAll clubhouse rooms:")
        for room in all_rooms.scalars().all():
            print(f"  - {room.name} (capacity: {room.capacity})")


if __name__ == "__main__":
    asyncio.run(update_clubhouse_rooms())
