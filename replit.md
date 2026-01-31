# Gym Booking System - Gaelic Club

## Project Overview

A gym booking application for a Gaelic club that allows members to book gym time slots and administrators to manage memberships and bookings.

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy (async), Alembic migrations
- **Database**: PostgreSQL (Neon-backed)
- **Authentication**: JWT tokens (HTTP-only cookies), bcrypt password hashing
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Axios

## Project Structure

```
gym-booking/
├── backend/
│   ├── alembic/              # Database migrations
│   │   └── versions/
│   ├── app/
│   │   ├── auth/             # Authentication (JWT, password hashing)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # API endpoints
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic layer
│   │   ├── config.py         # Configuration settings
│   │   ├── database.py       # Database connection
│   │   └── main.py           # FastAPI app entry point
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── dashboard/    # Protected dashboard routes
│   │   │   │   ├── admin/    # Admin-only pages
│   │   │   │   ├── book/     # Booking page
│   │   │   │   ├── bookings/ # My bookings page
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx  # Dashboard home
│   │   │   ├── login/        # Login page
│   │   │   ├── register/     # Registration page
│   │   │   ├── layout.tsx    # Root layout
│   │   │   ├── page.tsx      # Landing page
│   │   │   └── globals.css   # Global styles
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context providers
│   │   ├── lib/              # Utilities and API client
│   │   └── types/            # TypeScript type definitions
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
└── replit.md
```

## Frontend Pages

### Public Pages
- `/` - Landing page with hero section and features
- `/login` - User login form
- `/register` - New member registration form

### Member Dashboard (Protected)
- `/dashboard` - Member home with upcoming bookings and quick actions
- `/dashboard/book` - Book gym time slots with date picker and availability grid
- `/dashboard/bookings` - View and cancel personal bookings

### Admin Dashboard (Admin only)
- `/dashboard/admin` - Admin overview with statistics
- `/dashboard/admin/members` - Member management (approve, suspend, reactivate)
- `/dashboard/admin/bookings` - View and cancel any booking

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new member (pending approval)
- `POST /api/v1/auth/login` - Login, receive JWT tokens in cookies
- `POST /api/v1/auth/logout` - Logout, clear cookies
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Members
- `GET /api/v1/members/me` - Get own profile
- `PATCH /api/v1/members/me` - Update own profile

### Bookings
- `GET /api/v1/bookings` - List own bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/{id}` - Get specific booking
- `DELETE /api/v1/bookings/{id}` - Cancel booking
- `GET /api/v1/bookings/availability` - Check slot availability
- `POST /api/v1/bookings/recurring` - Create recurring pattern
- `GET /api/v1/bookings/recurring/patterns` - List recurring patterns
- `DELETE /api/v1/bookings/recurring/{id}` - Deactivate pattern

### Admin
- `GET /api/v1/admin/members` - List all members
- `GET /api/v1/admin/members/{id}` - Get member details
- `PATCH /api/v1/admin/members/{id}/approve` - Approve pending member
- `PATCH /api/v1/admin/members/{id}/suspend` - Suspend member
- `PATCH /api/v1/admin/members/{id}/reactivate` - Reactivate member
- `GET /api/v1/admin/bookings` - List all bookings
- `POST /api/v1/admin/bookings` - Create booking for member
- `DELETE /api/v1/admin/bookings/{id}` - Cancel any booking
- `GET /api/v1/admin/stats` - Dashboard statistics

## Database Schema

### Tables
- **users**: Authentication (email, password_hash, role)
- **members**: Gym member profiles (full_name, phone, membership_status)
- **bookings**: Time slot reservations (start_time, end_time, status)
- **recurring_patterns**: Recurring booking templates

### Key Constraints
- Maximum capacity: 20 people per time slot
- Maximum booking duration: 8 hours
- Maximum advance booking: 1 year
- Members can't double-book themselves

## Running the Application

### Backend
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm run dev
```

### Database Migrations
```bash
cd backend
python -m alembic upgrade head  # Apply migrations
python -m alembic revision --autogenerate -m "Description"  # Create new migration
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT signing secret

Optional (with defaults):
- `ACCESS_TOKEN_EXPIRE_MINUTES` - 15
- `REFRESH_TOKEN_EXPIRE_DAYS` - 7
- `GYM_MAX_CAPACITY` - 20
- `MAX_BOOKING_DURATION_MINS` - 480
- `MAX_BOOKING_ADVANCE_DAYS` - 365

## Recent Changes

- 2026-01-31: Next.js frontend implementation
  - App Router with TypeScript
  - Tailwind CSS v4 styling
  - Login/Register authentication pages
  - Member dashboard with booking functionality
  - Admin dashboard for member/booking management
  - Mobile-responsive design
  - Extensive code comments

- 2026-01-31: Initial backend implementation
  - FastAPI with async SQLAlchemy
  - JWT authentication with HTTP-only cookies
  - Full CRUD for members, bookings, recurring patterns
  - Admin member management and booking oversight
  - Alembic database migrations

## User Preferences

- Clean, extensively commented code
- Scalable architecture with service layer
- PostgreSQL with ORM for type safety
- Mobile-friendly responsive design

## Next Steps

1. Add email notifications
2. Implement waitlist for full slots
3. Add profile editing functionality
