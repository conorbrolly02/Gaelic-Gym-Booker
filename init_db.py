"""Initialize the database with all tables."""
import asyncio
import sys
sys.path.insert(0, 'backend')

from app.database import init_db

async def main():
    print("Initializing database...")
    await init_db()
    print("Database initialized successfully!")

if __name__ == "__main__":
    asyncio.run(main())
