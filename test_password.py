"""Test password hashing and verification."""
import sys
sys.path.insert(0, 'backend')

from app.auth.security import hash_password, verify_password

# Test password hashing
password = "admin123"
hashed = hash_password(password)

print(f"Password: {password}")
print(f"Hash: {hashed}")
print(f"Verification: {verify_password(password, hashed)}")
print(f"Wrong password: {verify_password('wrong', hashed)}")

# Now let's check what's actually in the database
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User

async def check_db():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@gym.com"))
        user = result.scalar_one_or_none()

        if user:
            print(f"\nDatabase user found:")
            print(f"Email: {user.email}")
            print(f"Stored hash: {user.password_hash}")
            print(f"Verify 'admin123': {verify_password('admin123', user.password_hash)}")
        else:
            print("\nNo user found in database!")

asyncio.run(check_db())
