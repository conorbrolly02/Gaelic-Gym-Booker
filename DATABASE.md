# Database Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Location & Connection](#database-location--connection)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [How to Connect](#how-to-connect)
6. [Migrations](#migrations)
7. [Common Database Operations](#common-database-operations)
8. [Backup & Maintenance](#backup--maintenance)

---

## Overview

The Gaelic Gym Booker application uses a **relational database** to store all user, booking, and resource data. The database is accessed through **SQLAlchemy ORM** (Object-Relational Mapping) with async support.

### Current Setup
- **Development**: SQLite database file
- **Production**: Can use SQLite or PostgreSQL
- **Location**: `backend/gym_booking.db`

---

## Database Location & Connection

### Database File Location
```
Gaelic-Gym-Booker/
├── backend/
│   └── gym_booking.db          ← Main production database
├── gym_booking.db              ← Alternative location (legacy)
└── backend/gaelic_gym.db       ← Empty/unused database file
```

**Primary database**: `backend/gym_booking.db` (267 KB)

### Connection String
The database connection is configured in `backend/app/config.py` and reads from the `DATABASE_URL` environment variable.

**Current Configuration** (from `.env` or environment):
```bash
DATABASE_URL=sqlite+aiosqlite:///./gym_booking.db
```

**Alternative Configurations**:

| Environment | Connection String Example |
|-------------|--------------------------|
| **SQLite (Local)** | `sqlite+aiosqlite:///./gym_booking.db` |
| **PostgreSQL (Production)** | `postgresql+asyncpg://user:password@host:5432/database` |
| **PostgreSQL (Replit)** | `postgresql://user:password@host:5432/db?sslmode=require` |

### Environment Variable Setup

**For Local Development** (`.env` file):
```bash
# Database connection
DATABASE_URL=sqlite+aiosqlite:///./gym_booking.db

# JWT Secret (required)
SESSION_SECRET=your-secret-key-here
```

**For Production** (Environment variables):
```bash
export DATABASE_URL="postgresql+asyncpg://user:password@host:5432/database"
export SESSION_SECRET="your-production-secret-key"
```

---

## Technology Stack

### Database Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database Engine** | SQLite 3.x (dev) / PostgreSQL (prod) | Data storage |
| **ORM** | SQLAlchemy 2.0.46 | Object-relational mapping |
| **Async Driver (SQLite)** | aiosqlite | Async SQLite access |
| **Async Driver (PostgreSQL)** | asyncpg | Async PostgreSQL access |
| **Migrations** | Alembic 1.18.3 | Schema version control |
| **Validation** | Pydantic 2.12.5 | Data validation |

### SQLAlchemy Configuration

**File**: `backend/app/database.py`

```python
# Database URL processing
raw_url = settings.DATABASE_URL
# Converts "postgresql://" to "postgresql+asyncpg://"
# Converts "sqlite://" to "sqlite+aiosqlite://"

# Create async engine
engine = create_async_engine(database_url, echo=True)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

**Key Features**:
- **Async Support**: All database operations are asynchronous (uses `async/await`)
- **Connection Pooling**: Automatic connection pool management
- **SQL Logging**: `echo=True` logs all SQL queries to console (useful for debugging)

---

## Database Schema

### Tables Overview

The database contains **9 tables**:

| Table | Purpose | Records |
|-------|---------|---------|
| `users` | User authentication & authorization | 7 users |
| `members` | Member profiles (linked to users) | Member data |
| `bookings` | Gym/pitch time slot reservations | Booking records |
| `recurring_patterns` | Templates for recurring bookings | Recurring schedules |
| `recurring_exceptions` | Exceptions to recurring patterns | Pattern overrides |
| `resources` | Bookable resources (gyms, pitches) | Resource definitions |
| `blackouts` | Blocked time periods | Maintenance windows |
| `audit_events` | Audit trail for actions | Activity logs |
| `alembic_version` | Database schema version | Migration tracking |

### Entity Relationship Diagram

```
┌─────────────┐
│    users    │
│ (auth data) │
└──────┬──────┘
       │ 1:1
       ▼
┌─────────────┐       ┌──────────────────┐
│   members   │──────▶│  recurring       │
│  (profile)  │ 1:N   │  patterns        │
└──────┬──────┘       └────────┬─────────┘
       │ 1:N                   │ 1:N
       ▼                       ▼
┌─────────────┐       ┌──────────────────┐
│  bookings   │◀──────│  recurring_      │
│             │       │  exceptions      │
└──────┬──────┘       └──────────────────┘
       │ N:1
       ▼
┌─────────────┐
│  resources  │
│ (gym/pitch) │
└─────────────┘
```

### Table Details

#### `users` Table
Stores user authentication and role information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR(255) | Unique email (login identifier) |
| `password_hash` | VARCHAR(255) | Bcrypt hashed password |
| `role` | ENUM | User role: MEMBER, ADMIN, COACH |
| `is_active` | BOOLEAN | Account active status |
| `created_at` | TIMESTAMP | Registration date |
| `updated_at` | TIMESTAMP | Last modification |

**Model File**: `backend/app/models/user.py`

#### `members` Table
Stores member profile information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users.id` |
| `full_name` | VARCHAR(255) | Member's full name |
| `phone` | VARCHAR(20) | Contact phone number |
| `membership_status` | ENUM | PENDING, ACTIVE, SUSPENDED |
| `qr_code` | TEXT | QR code data (large) |
| `approved_by` | UUID | Foreign key → `users.id` (admin) |
| `approved_at` | TIMESTAMP | Approval timestamp |
| `created_at` | TIMESTAMP | Registration date |
| `updated_at` | TIMESTAMP | Last modification |

**Model File**: `backend/app/models/member.py`

#### `bookings` Table
Stores all booking reservations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `member_id` | UUID | Foreign key → `members.id` |
| `resource_id` | UUID | Foreign key → `resources.id` |
| `start_time` | TIMESTAMP | Booking start time (UTC) |
| `end_time` | TIMESTAMP | Booking end time (UTC) |
| `status` | ENUM | CONFIRMED, CANCELLED, PENDING_APPROVAL |
| `booking_type` | ENUM | SINGLE, TEAM |
| `party_size` | INTEGER | Number of people (1-20) |
| `area` | VARCHAR(50) | Pitch area (whole, half-left, etc.) |
| `title` | VARCHAR(255) | Booking title |
| `requester_name` | VARCHAR(255) | Person requesting |
| `team_name` | VARCHAR(255) | Team name (optional) |
| `recurring_pattern_id` | UUID | Link to recurring pattern |
| `version` | INTEGER | Optimistic locking version |
| `created_by` | UUID | Foreign key → `users.id` |
| `cancelled_by` | UUID | Foreign key → `users.id` |
| `cancelled_at` | TIMESTAMP | Cancellation time |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last modification |

**Model File**: `backend/app/models/booking.py`

#### `resources` Table
Stores bookable resources (gyms, pitches).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Resource name |
| `resource_type` | ENUM | GYM, PITCH |
| `max_capacity` | INTEGER | Maximum people allowed |
| `is_active` | BOOLEAN | Available for booking |
| `supports_areas` | BOOLEAN | Can be split into areas |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last modification |

**Model File**: `backend/app/models/resource.py`

#### `recurring_patterns` Table
Templates for weekly recurring bookings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `member_id` | UUID | Foreign key → `members.id` |
| `pattern_type` | ENUM | WEEKLY (currently only option) |
| `days_of_week` | VARCHAR(50) | Comma-separated days (0-6) |
| `start_time` | TIME | Time of day for booking |
| `duration_mins` | INTEGER | Booking duration |
| `valid_from` | DATE | Pattern start date |
| `valid_until` | DATE | Pattern end date |
| `is_active` | BOOLEAN | Pattern active status |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last modification |

**Model File**: `backend/app/models/recurring.py`

#### `recurring_exceptions` Table
Exceptions to recurring patterns (skipped dates).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `recurring_pattern_id` | UUID | Foreign key → `recurring_patterns.id` |
| `exception_date` | DATE | Date to skip |
| `created_at` | TIMESTAMP | Creation time |

**Model File**: `backend/app/models/recurring_exception.py`

#### `blackouts` Table
Blocked time periods for maintenance.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `resource_id` | UUID | Foreign key → `resources.id` |
| `start_time` | TIMESTAMP | Blackout start |
| `end_time` | TIMESTAMP | Blackout end |
| `reason` | TEXT | Reason for blackout |
| `created_by` | UUID | Foreign key → `users.id` |
| `created_at` | TIMESTAMP | Creation time |

**Model File**: `backend/app/models/blackout.py`

#### `audit_events` Table
Audit trail for important actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users.id` |
| `action` | VARCHAR(255) | Action performed |
| `details` | JSON | Additional details |
| `ip_address` | VARCHAR(45) | User's IP address |
| `created_at` | TIMESTAMP | Event time |

**Model File**: `backend/app/models/audit.py`

---

## How to Connect

### Using Python/SQLAlchemy (Application Code)

**Dependency Injection Pattern** (FastAPI):
```python
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users
```

### Using Python SQLite3 (Direct Access)

**For Quick Scripts/Debugging**:
```python
import sqlite3

# Connect to database
conn = sqlite3.connect('backend/gym_booking.db')
cursor = conn.cursor()

# Query data
cursor.execute("SELECT email, role FROM users")
for row in cursor.fetchall():
    print(row)

# Close connection
conn.close()
```

### Using Database Browser Tools

#### Option 1: DB Browser for SQLite (GUI)
1. Download from: https://sqlitebrowser.org/
2. Open → Select `backend/gym_booking.db`
3. Browse tables, run queries, edit data

#### Option 2: VS Code Extension
1. Install extension: "SQLite Viewer" or "SQLite"
2. Open `backend/gym_booking.db` in VS Code
3. Right-click → "Open Database"

#### Option 3: Command Line (sqlite3)
```bash
# Windows (if sqlite3 installed)
cd backend
sqlite3 gym_booking.db

# Inside sqlite3 shell
.tables                    # List all tables
.schema users              # Show table schema
SELECT * FROM users;       # Query data
.exit                      # Exit
```

### Connection in Application

**File**: `backend/app/database.py`

```python
# Get database session in routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## Migrations

### Migration Tool: Alembic

Alembic tracks and applies database schema changes.

**Configuration**: `backend/alembic/alembic.ini` (not currently present, uses defaults)
**Migration Files**: `backend/alembic/versions/`

### Current Migrations

| Migration | Description |
|-----------|-------------|
| `f2f547987da9_initial_migration_...` | Initial tables: users, members, bookings |
| `6f9a394b7ead_add_booking_type_...` | Added booking_type and party_size |
| `ee9d9855d8bd_resources_blackout_...` | Added resources, blackouts, audit |
| `abc123def456_add_pitch_booking_...` | Added pitch booking columns |
| `701946b0ac15_add_qr_code_to_member` | Added QR code to members |
| `79b0e6c7e804_add_pending_approval_...` | Added PENDING_APPROVAL status |
| `85e8ac333fe5_add_version_column_...` | Added version for optimistic locking |
| `fea829c40728_increase_qr_code_...` | Increased QR code column size |

### Running Migrations

**Apply all pending migrations**:
```bash
cd backend
alembic upgrade head
```

**Create a new migration**:
```bash
cd backend
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Then apply it
alembic upgrade head
```

**Rollback one migration**:
```bash
cd backend
alembic downgrade -1
```

**Check current version**:
```bash
cd backend
alembic current
```

**View migration history**:
```bash
cd backend
alembic history
```

### Migration Workflow

1. **Modify ORM models** in `backend/app/models/*.py`
2. **Generate migration**: `alembic revision --autogenerate -m "description"`
3. **Review migration file** in `backend/alembic/versions/`
4. **Apply migration**: `alembic upgrade head`
5. **Commit** migration file to git

---

## Common Database Operations

### View Current Users
```bash
cd backend
python -c "
import sqlite3
conn = sqlite3.connect('gym_booking.db')
cur = conn.cursor()
rows = cur.execute('SELECT email, role, created_at FROM users ORDER BY created_at DESC').fetchall()
for row in rows:
    print(f'{row[0]:40} {row[1]:10} {row[2]}')
conn.close()
"
```

### Count Records in Each Table
```bash
cd backend
python -c "
import sqlite3
conn = sqlite3.connect('gym_booking.db')
cur = conn.cursor()
tables = cur.execute('SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name').fetchall()
for table in tables:
    count = cur.execute(f'SELECT COUNT(*) FROM {table[0]}').fetchone()[0]
    print(f'{table[0]:25} {count:5} records')
conn.close()
"
```

### Backup Database
```bash
# Simple file copy
cp backend/gym_booking.db backend/gym_booking.backup.db

# With timestamp
cp backend/gym_booking.db backend/gym_booking.$(date +%Y%m%d_%H%M%S).db
```

### Reset Database (Development Only)
```bash
# WARNING: This deletes all data!
cd backend

# Delete database
rm gym_booking.db

# Recreate from migrations
alembic upgrade head

# Optionally create test users
python create_test_users.py
```

### Export Data to CSV
```bash
cd backend
python -c "
import sqlite3
import csv

conn = sqlite3.connect('gym_booking.db')
cur = conn.cursor()

# Export users
rows = cur.execute('SELECT * FROM users').fetchall()
columns = [desc[0] for desc in cur.description]

with open('users_export.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    writer.writerows(rows)

print('Exported users to users_export.csv')
conn.close()
"
```

### Check Database Size
```bash
# Windows
dir backend\gym_booking.db

# Linux/Mac
ls -lh backend/gym_booking.db
```

**Current size**: ~267 KB (with 7 users, minimal bookings)

---

## Backup & Maintenance

### Backup Strategy

#### Development (SQLite)
- **Manual backups**: Copy `gym_booking.db` before major changes
- **Git ignored**: Database files are in `.gitignore` (never commit)
- **Frequency**: Before schema changes, before data cleanup

#### Production (PostgreSQL)
- **Automated backups**: Use cloud provider's backup service
- **Frequency**: Daily automated backups
- **Retention**: 7-30 days of backups
- **Point-in-time recovery**: If supported by provider

### Maintenance Tasks

#### Daily
- Monitor database size growth
- Check for failed transactions in logs

#### Weekly
- Review audit logs for unusual activity
- Check for orphaned records

#### Monthly
- Analyze slow queries (if performance issues)
- Vacuum database (SQLite only): `VACUUM;`
- Archive old cancelled bookings

### Database Cleanup Scripts

**Delete old cancelled bookings** (older than 90 days):
```python
import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect('backend/gym_booking.db')
cur = conn.cursor()

cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()
cur.execute(
    "DELETE FROM bookings WHERE status = 'CANCELLED' AND cancelled_at < ?",
    (cutoff,)
)
deleted = cur.rowcount
conn.commit()
conn.close()

print(f"Deleted {deleted} old cancelled bookings")
```

### Database Health Checks

**Check for referential integrity issues**:
```sql
-- Find members without users
SELECT m.id, m.full_name
FROM members m
LEFT JOIN users u ON m.user_id = u.id
WHERE u.id IS NULL;

-- Find bookings without members
SELECT b.id, b.start_time
FROM bookings b
LEFT JOIN members m ON b.member_id = m.id
WHERE m.id IS NULL;

-- Find orphaned recurring patterns
SELECT rp.id, rp.pattern_type
FROM recurring_patterns rp
LEFT JOIN members m ON rp.member_id = m.id
WHERE m.id IS NULL;
```

---

## Troubleshooting

### Common Issues

#### "Database is locked"
**Cause**: Another process is accessing the SQLite database
**Solution**:
- Close other connections
- Wait for long-running queries to complete
- Consider PostgreSQL for production (better concurrency)

#### "Table doesn't exist"
**Cause**: Migrations not applied
**Solution**:
```bash
cd backend
alembic upgrade head
```

#### "Column not found"
**Cause**: Database schema out of sync with code
**Solution**:
```bash
cd backend
alembic revision --autogenerate -m "sync schema"
alembic upgrade head
```

#### "Cannot connect to database"
**Cause**: Wrong DATABASE_URL or file path
**Solution**:
- Check `.env` file has correct `DATABASE_URL`
- Verify database file exists at specified path
- Check file permissions

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | None | Database connection string |
| `SESSION_SECRET` | ✅ | None | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | 15 | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ❌ | 7 | Refresh token lifetime |
| `GYM_MAX_CAPACITY` | ❌ | 20 | Max gym capacity |
| `MAX_BOOKING_DURATION_MINS` | ❌ | 480 | Max booking length |
| `MAX_BOOKING_ADVANCE_DAYS` | ❌ | 365 | Advance booking limit |

### Database URL Formats

```bash
# SQLite (relative path)
DATABASE_URL=sqlite+aiosqlite:///./gym_booking.db

# SQLite (absolute path - Windows)
DATABASE_URL=sqlite+aiosqlite:///C:/Users/You/gym_booking.db

# SQLite (absolute path - Linux/Mac)
DATABASE_URL=sqlite+aiosqlite:////home/user/gym_booking.db

# PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/gymdb

# PostgreSQL with SSL
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `backend/gym_booking.db` | Main database file |
| `backend/app/database.py` | Database connection setup |
| `backend/app/config.py` | Configuration (DATABASE_URL) |
| `backend/app/models/*.py` | ORM models (table definitions) |
| `backend/alembic/versions/*.py` | Migration files |

### Key Commands

```bash
# View database in Python
cd backend
python
>>> import sqlite3
>>> conn = sqlite3.connect('gym_booking.db')
>>> conn.execute('SELECT email FROM users').fetchall()

# Run migrations
cd backend
alembic upgrade head

# Backup database
cp backend/gym_booking.db backend/gym_booking.backup.db

# Check database size
ls -lh backend/gym_booking.db  # Linux/Mac
dir backend\gym_booking.db      # Windows
```

---

## Summary

- **Database**: SQLite file at `backend/gym_booking.db` (267 KB)
- **ORM**: SQLAlchemy 2.0 with async support
- **Migrations**: Alembic for schema version control
- **Tables**: 9 tables (users, members, bookings, resources, etc.)
- **Connection**: Via `DATABASE_URL` environment variable
- **Access**: Through SQLAlchemy ORM in application code
- **Current Users**: 7 active users

For more details, see `CLAUDE.md` section 7 (Database & Persistence).
