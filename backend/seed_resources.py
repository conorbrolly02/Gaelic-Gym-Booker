import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.resource import Resource, ResourceType


async def seed_resources():
    async with AsyncSessionLocal() as db:

        # ---- Check if already seeded ----
        existing = await db.execute(select(Resource))
        if existing.scalars().first():
            print("Resources already seeded. Skipping.")
            return

        print("Seeding initial resource hierarchy...")

        # ---------------------------
        # GYM
        # ---------------------------
        gym = Resource(
            name="Gym",
            type=ResourceType.GYM,
            capacity=20,
            buffer_mins=0,
        )
        db.add(gym)

        # ---------------------------
        # PITCH 1 (Full → Halves → Quarters)
        # ---------------------------
        pitch1_full = Resource(
            name="Pitch 1 (Full)",
            type=ResourceType.PITCH,
            capacity=1,
            buffer_mins=10,
        )

        pitch1_half_a = Resource(
            name="Pitch 1 - Half A",
            type=ResourceType.PITCH_HALF,
            parent=pitch1_full
        )
        pitch1_half_b = Resource(
            name="Pitch 1 - Half B",
            type=ResourceType.PITCH_HALF,
            parent=pitch1_full
        )

        # Quarters under halves
        pitch1_q1 = Resource(
            name="Pitch 1 - Q1",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch1_half_a
        )
        pitch1_q2 = Resource(
            name="Pitch 1 - Q2",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch1_half_a
        )
        pitch1_q3 = Resource(
            name="Pitch 1 - Q3",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch1_half_b
        )
        pitch1_q4 = Resource(
            name="Pitch 1 - Q4",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch1_half_b
        )

        db.add_all([
            pitch1_full,
            pitch1_half_a, pitch1_half_b,
            pitch1_q1, pitch1_q2, pitch1_q3, pitch1_q4,
        ])

        # ---------------------------
        # PITCH 2 (mirror structure)
        # ---------------------------
        pitch2_full = Resource(
            name="Pitch 2 (Full)",
            type=ResourceType.PITCH,
            capacity=1,
            buffer_mins=10,
        )

        pitch2_half_a = Resource(
            name="Pitch 2 - Half A",
            type=ResourceType.PITCH_HALF,
            parent=pitch2_full
        )
        pitch2_half_b = Resource(
            name="Pitch 2 - Half B",
            type=ResourceType.PITCH_HALF,
            parent=pitch2_full
        )

        pitch2_q1 = Resource(
            name="Pitch 2 - Q1",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch2_half_a
        )
        pitch2_q2 = Resource(
            name="Pitch 2 - Q2",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch2_half_a
        )
        pitch2_q3 = Resource(
            name="Pitch 2 - Q3",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch2_half_b
        )
        pitch2_q4 = Resource(
            name="Pitch 2 - Q4",
            type=ResourceType.PITCH_QUARTER,
            parent=pitch2_half_b
        )

        db.add_all([
            pitch2_full,
            pitch2_half_a, pitch2_half_b,
            pitch2_q1, pitch2_q2, pitch2_q3, pitch2_q4,
        ])

        # ---------------------------
        # BALL WALL (Full → Halves)
        # ---------------------------
        bw_full = Resource(
            name="Ball Wall (Full)",
            type=ResourceType.BALL_WALL,
            capacity=1,
            buffer_mins=5,
        )

        bw_half_a = Resource(
            name="Ball Wall - Half A",
            type=ResourceType.BALL_WALL_HALF,
            parent=bw_full
        )
        bw_half_b = Resource(
            name="Ball Wall - Half B",
            type=ResourceType.BALL_WALL_HALF,
            parent=bw_full
        )

        db.add_all([bw_full, bw_half_a, bw_half_b])

        # ---------------------------
        # CLUBHOUSE ROOMS
        # ---------------------------
        committee_room = Resource(
            name="Committee Room",
            type=ResourceType.ROOM,
            capacity=20,
            buffer_mins=15,
        )

        kitchen = Resource(
            name="Kitchen",
            type=ResourceType.ROOM,
            capacity=10,
            buffer_mins=15,
        )

        cr1 = Resource(
            name="Changing Room 1",
            type=ResourceType.ROOM,
            capacity=15,
            buffer_mins=15,
        )

        cr2 = Resource(
            name="Changing Room 2",
            type=ResourceType.ROOM,
            capacity=15,
            buffer_mins=15,
        )

        cr3 = Resource(
            name="Changing Room 3",
            type=ResourceType.ROOM,
            capacity=15,
            buffer_mins=15,
        )

        cr4 = Resource(
            name="Changing Room 4",
            type=ResourceType.ROOM,
            capacity=15,
            buffer_mins=15,
        )

        ref_cr = Resource(
            name="Referee Changing Room",
            type=ResourceType.ROOM,
            capacity=8,
            buffer_mins=15,
        )

        room2 = Resource(
            name="Room 2",
            type=ResourceType.ROOM,
            capacity=10,
            buffer_mins=15,
        )

        db.add_all([committee_room, kitchen, cr1, cr2, cr3, cr4, ref_cr, room2])

        # ---------------------------
        # COMMIT & DONE
        # ---------------------------
        await db.commit()
        print("Resource hierarchy seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed_resources())