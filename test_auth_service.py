"""Test the authentication service directly."""
import asyncio
import sys
sys.path.insert(0, 'backend')

from app.database import AsyncSessionLocal
from app.services.auth_service import AuthService

async def test_auth():
    async with AsyncSessionLocal() as session:
        service = AuthService(session)

        print("Testing authentication service...")
        print(f"Email: admin@gym.com")
        print(f"Password: admin123")

        # Test authentication
        user = await service.authenticate_user("admin@gym.com", "admin123")

        if user:
            print(f"\n✓ Authentication SUCCESSFUL!")
            print(f"User ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role.value}")
            print(f"Active: {user.is_active}")
        else:
            print(f"\n✗ Authentication FAILED!")

            # Let's try to understand why
            user_by_email = await service.get_user_by_email("admin@gym.com")
            if user_by_email:
                print(f"User found by email: {user_by_email.email}")
                print(f"Now testing password verification...")

                from app.auth.security import verify_password
                result = verify_password("admin123", user_by_email.password_hash)
                print(f"Password verification result: {result}")
            else:
                print("User not found by email")

asyncio.run(test_auth())
