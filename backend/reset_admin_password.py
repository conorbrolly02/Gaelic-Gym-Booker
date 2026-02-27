"""Reset admin password."""
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User
from app.auth.security import hash_password

async def reset_admin_password():
    async with AsyncSessionLocal() as db:
        # Find admin user
        result = await db.execute(
            select(User).where(User.email == "admin@gym.com")
        )
        admin = result.scalar_one_or_none()

        if not admin:
            print("Admin user not found!")
            return

        # Reset password to "admin123"
        new_password = "admin123"
        admin.password_hash = hash_password(new_password)

        await db.commit()
        print(f"✓ Admin password reset successfully")
        print(f"  Email: {admin.email}")
        print(f"  New password: {new_password}")

if __name__ == "__main__":
    asyncio.run(reset_admin_password())
