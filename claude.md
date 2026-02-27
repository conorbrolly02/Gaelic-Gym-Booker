# Gaelic Gym Booker - Complete Technical Documentation

## Table of Contents
1. [High-Level Overview](#high-level-overview)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Backend Documentation](#backend-documentation)
6. [Frontend Documentation](#frontend-documentation)
7. [Database & Persistence](#database--persistence)
8. [Environment & Configuration](#environment--configuration)
9. [Build, Deployment, and CI/CD](#build-deployment-and-cicd)
10. [Common Workflows](#common-workflows)
11. [Conventions & Standards](#conventions--standards)
12. [Known Issues & Current Limitations](#known-issues--current-limitations)
13. [Appendix](#appendix)

---

## 1. High-Level Overview

### Purpose
The Gaelic Gym Booker is a comprehensive gym booking management system designed for a Gaelic club's gym facility. It enables members to book time slots at the gym while providing administrators with tools to manage memberships and oversee all bookings.

### Core Use Cases
1. **Member Registration & Authentication**: Users register accounts that require admin approval before they can book
2. **Gym Slot Booking**: Active members can reserve time slots with single or team bookings
3. **Recurring Bookings**: Members can create recurring booking patterns (weekly schedules)
4. **Admin Member Management**: Administrators approve/suspend members
5. **Admin Booking Oversight**: Administrators view all bookings and create bookings on behalf of members
6. **Capacity Management**: System enforces maximum gym capacity (20 people) across all concurrent bookings

### Primary Users
- **Members**: Gym users who need to book time slots
- **Administrators**: Club staff managing memberships and facility usage

### Major Subsystems
1. **Authentication System**: JWT-based auth with HTTP-only cookies
2. **Member Management**: User profiles, approval workflows, status tracking
3. **Booking System**: Time slot reservations with capacity enforcement
4. **Recurring Patterns**: Automated recurring booking generation
5. **Admin Dashboard**: Member approval, booking oversight, statistics

---

## 2. Architecture Overview

### Architecture Pattern
The application follows a **layered, service-oriented architecture** with clear separation between:
- **Presentation Layer** (Next.js frontend)
- **API Layer** (FastAPI routes/controllers)
- **Business Logic Layer** (Service classes)
- **Data Access Layer** (SQLAlchemy ORM)
- **Persistence Layer** (SQLite/PostgreSQL database)

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        UI[React Components]
        CTX[Auth Context]
        API_CLIENT[API Client/Axios]
    end

    subgraph "Backend - FastAPI"
        ROUTES[API Routes/Routers]
        MIDDLEWARE[CORS + Auth Middleware]
        SERVICES[Service Layer]
        AUTH[Auth/JWT Handler]
    end

    subgraph "Data Layer"
        ORM[SQLAlchemy ORM]
        DB[(Database SQLite/PostgreSQL)]
    end

    UI --> CTX
    CTX --> API_CLIENT
    API_CLIENT -->|HTTP + Cookies| MIDDLEWARE
    MIDDLEWARE --> ROUTES
    ROUTES --> AUTH
    ROUTES --> SERVICES
    SERVICES --> ORM
    ORM --> DB
    AUTH -.->|Validates| ROUTES
```

### Communication Flows

#### Authentication Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DB

    User->>Frontend: Enter credentials
    Frontend->>API: POST /auth/login
    API->>DB: Verify credentials
    DB-->>API: User data
    API->>API: Generate JWT tokens
    API-->>Frontend: Set HTTP-only cookies + user data
    Frontend->>Frontend: Store user in context
    Frontend-->>User: Redirect to dashboard
```

#### Booking Creation Flow
```mermaid
sequenceDiagram
    participant Member
    participant Frontend
    participant API
    participant BookingService
    participant DB

    Member->>Frontend: Select time slot
    Frontend->>API: POST /bookings
    API->>API: Verify JWT + extract user
    API->>BookingService: create_booking()
    BookingService->>BookingService: Validate time slot
    BookingService->>DB: Check capacity
    DB-->>BookingService: Current bookings
    BookingService->>BookingService: Calculate available spots
    BookingService->>DB: Create booking
    DB-->>BookingService: Booking created
    BookingService-->>API: Return booking
    API-->>Frontend: 201 Created + booking data
    Frontend-->>Member: Show confirmation
```

---

## 3. Technology Stack

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 16.1.6 (App Router) | React framework with SSR/SSG capabilities |
| **UI Library** | React 19.2.4 | Component-based UI development |
| **Language** | TypeScript 5.9.3 | Type-safe JavaScript |
| **Styling** | Tailwind CSS 4.1.18 | Utility-first CSS framework |
| **HTTP Client** | Axios 1.13.4 | API communication with interceptors |
| **State Management** | React Context API | Authentication state management |
| **Build Tool** | Turbopack (Next.js) | Fast bundler and dev server |

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI 0.128.0 | Modern async Python web framework |
| **Language** | Python 3.11+ | Backend language |
| **ASGI Server** | Uvicorn 0.40.0 | High-performance async server |
| **ORM** | SQLAlchemy 2.0.46 | Database ORM with async support |
| **Validation** | Pydantic 2.12.5 | Data validation and settings |
| **Auth** | python-jose 3.5.0 | JWT token generation/verification |
| **Password Hashing** | bcrypt 5.0.0 | Secure password hashing |
| **Testing** | pytest 9.0.2 + pytest-asyncio | Unit and integration testing |

### Database
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Primary DB** | SQLite (dev) / PostgreSQL (prod) | Relational database |
| **Async Driver** | aiosqlite / asyncpg | Async database drivers |
| **Migrations** | Alembic 1.18.3 | Database schema versioning |

### DevOps & Tooling
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Package Manager (BE)** | uv | Fast Python package manager |
| **Package Manager (FE)** | npm | Node.js package manager |
| **Environment** | Replit (original) | Cloud development environment |
| **Local Dev** | localhost | Local development setup |

---

## 4. Repository Structure

```
Gaelic-Gym-Booker/
├── backend/                    # FastAPI backend application
│   ├── alembic/               # Database migrations
│   │   ├── versions/          # Migration files
│   │   └── alembic.ini        # Alembic configuration
│   ├── app/                   # Main application package
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Settings and configuration
│   │   ├── database.py        # Database connection setup
│   │   ├── auth/              # Authentication logic
│   │   │   ├── dependencies.py # Auth dependency injection
│   │   │   └── security.py    # JWT handling
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── user.py        # User model
│   │   │   ├── member.py      # Member model
│   │   │   ├── booking.py     # Booking model
│   │   │   ├── recurring.py   # Recurring pattern model
│   │   │   └── types.py       # Custom types (GUID)
│   │   ├── schemas/           # Pydantic schemas
│   │   │   ├── auth.py        # Auth schemas
│   │   │   ├── member.py      # Member schemas
│   │   │   └── booking.py     # Booking schemas
│   │   ├── routers/           # API route handlers
│   │   │   ├── auth.py        # /auth/* endpoints
│   │   │   ├── members.py     # /members/* endpoints
│   │   │   ├── bookings.py    # /bookings/* endpoints
│   │   │   └── admin.py       # /admin/* endpoints
│   │   └── services/          # Business logic layer
│   │       ├── auth_service.py    # Auth business logic
│   │       ├── member_service.py  # Member business logic
│   │       └── booking_service.py # Booking business logic
│   ├── tests/                 # Backend tests
│   ├── pytest.ini             # Pytest configuration
│   └── gym_booking.db         # SQLite database (dev)
├── frontend/                  # Next.js frontend application
│   ├── public/                # Static assets
│   ├── src/                   # Source code
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── login/         # Login page
│   │   │   ├── register/      # Registration page
│   │   │   └── dashboard/     # Dashboard and authenticated routes
│   │   │       ├── page.tsx           # Main dashboard
│   │   │       ├── layout.tsx         # Dashboard layout
│   │   │       ├── book/              # Booking creation
│   │   │       ├── bookings/          # User's bookings
│   │   │       └── admin/             # Admin-only pages
│   │   │           ├── page.tsx       # Admin dashboard
│   │   │           ├── members/       # Member management
│   │   │           └── bookings/      # Booking oversight
│   │   ├── components/        # Reusable React components
│   │   │   ├── Navigation.tsx # Navigation bar
│   │   │   ├── Alert.tsx      # Alert component
│   │   │   └── LoadingSpinner.tsx # Loading indicator
│   │   ├── context/           # React contexts
│   │   │   └── AuthContext.tsx # Authentication context
│   │   ├── lib/               # Utility libraries
│   │   │   └── api.ts         # API client (axios)
│   │   └── types/             # TypeScript type definitions
│   │       └── index.ts       # Shared types
│   ├── package.json           # Dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   ├── next.config.ts         # Next.js configuration
│   ├── tailwind.config.ts     # Tailwind CSS configuration
│   └── postcss.config.mjs     # PostCSS configuration
├── main.py                    # Root entry point (simple)
├── pyproject.toml             # Python project configuration
├── uv.lock                    # Locked dependencies
├── gym_booking.db             # Root database file
├── SETUP_GUIDE.md             # Setup instructions
├── RECOMMENDATIONS.md         # Development recommendations
└── replit.md                  # Replit-specific docs
```

### Directory Descriptions

#### `/backend`
**Purpose**: FastAPI backend application handling all business logic, data persistence, and API endpoints.

**Key Files**:
- `app/main.py`: Application entry point, router registration, CORS configuration
- `app/config.py`: Centralized configuration from environment variables
- `app/database.py`: SQLAlchemy engine and session management

**Ownership**: Backend developers, API design

#### `/backend/app/models`
**Purpose**: SQLAlchemy ORM models defining database schema.

**Contents**: User, Member, Booking, RecurringPattern models with relationships

**Ownership**: Database schema, data modeling

#### `/backend/app/routers`
**Purpose**: API endpoint definitions organized by resource.

**Contents**: FastAPI routers handling HTTP requests/responses

**Ownership**: API interface layer

#### `/backend/app/services`
**Purpose**: Business logic layer isolated from HTTP concerns.

**Contents**: Service classes with methods for core operations

**Ownership**: Business rules, validation logic

#### `/frontend`
**Purpose**: Next.js React application providing user interface.

**Key Files**:
- `src/app/`: Next.js pages using App Router
- `src/components/`: Reusable UI components
- `src/context/`: React Context providers
- `src/lib/api.ts`: Centralized API client

**Ownership**: Frontend developers, UX/UI

#### `/frontend/src/app`
**Purpose**: Next.js App Router pages and layouts.

**Structure**: File-based routing (folder = route segment)

**Ownership**: Page-level components and routing

#### `/frontend/src/lib`
**Purpose**: Shared utilities and API client.

**Contents**: Axios instance, API method wrappers

**Ownership**: Frontend utilities

---

## 5. Backend Documentation

### API Architecture
The backend follows a **layered architecture**:

1. **Router Layer** (`routers/`): Handles HTTP requests, calls services, returns responses
2. **Service Layer** (`services/`): Contains business logic, validates rules, coordinates data access
3. **Model Layer** (`models/`): Defines database schema and relationships
4. **Schema Layer** (`schemas/`): Pydantic models for request/response validation

### Routing Conventions
- All routes prefixed with `/api/v1` for versioning
- Routes organized by resource: `/auth`, `/members`, `/bookings`, `/admin`
- HTTP methods follow REST conventions:
  - `GET`: Retrieve resources
  - `POST`: Create resources
  - `PATCH`: Partial update
  - `DELETE`: Soft delete (status change)

### API Endpoints Overview

#### Authentication Routes (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user account | No |
| POST | `/login` | Login and receive JWT cookies | No |
| POST | `/logout` | Logout and clear cookies | Yes |
| POST | `/refresh` | Refresh access token | No (uses refresh cookie) |
| GET | `/me` | Get current user info | Yes |

#### Member Routes (`/api/v1/members`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/me` | Get current member profile | Yes (Member) |
| PATCH | `/me` | Update member profile | Yes (Member) |

#### Booking Routes (`/api/v1/bookings`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get member's bookings | Yes (Active Member) |
| POST | `/` | Create new booking | Yes (Active Member) |
| GET | `/{id}` | Get specific booking | Yes (Owner/Admin) |
| DELETE | `/{id}` | Cancel booking | Yes (Owner/Admin) |
| GET | `/availability` | Check time slot availability | Yes (Active Member) |
| POST | `/recurring` | Create recurring pattern | Yes (Active Member) |
| GET | `/recurring/patterns` | Get member's patterns | Yes (Active Member) |
| DELETE | `/recurring/{id}` | Deactivate pattern | Yes (Owner/Admin) |

#### Admin Routes (`/api/v1/admin`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/stats` | Get dashboard statistics | Yes (Admin) |
| GET | `/members` | List all members | Yes (Admin) |
| GET | `/members/{id}` | Get member details | Yes (Admin) |
| PATCH | `/members/{id}/approve` | Approve pending member | Yes (Admin) |
| PATCH | `/members/{id}/suspend` | Suspend member | Yes (Admin) |
| PATCH | `/members/{id}/reactivate` | Reactivate suspended member | Yes (Admin) |
| GET | `/bookings` | List all bookings | Yes (Admin) |
| POST | `/bookings` | Create booking for any member | Yes (Admin) |
| DELETE | `/bookings/{id}` | Cancel any booking | Yes (Admin) |

### Controllers/Services/Repositories Pattern

#### Router (Controller) Example
**File**: `backend/app/routers/bookings.py`

Responsibilities:
- Parse HTTP requests
- Extract user from JWT dependency
- Call service methods
- Return HTTP responses

```python
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: CreateBookingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = BookingService(db)
    booking = await service.create_booking(
        member_id=user.member.id,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        created_by=user.id
    )
    return booking
```

#### Service Example
**File**: `backend/app/services/booking_service.py`

Responsibilities:
- Business logic validation
- Capacity checking
- Conflict detection
- Database operations via ORM

Key Methods:
- `create_booking()`: Validates and creates single booking
- `check_availability()`: Calculates available capacity
- `create_recurring_pattern()`: Generates multiple bookings
- `cancel_booking()`: Soft-deletes booking

#### Model (Repository) Example
**File**: `backend/app/models/booking.py`

Responsibilities:
- Define database schema
- Define relationships
- No business logic (data structure only)

### Data Models & Schema

#### User Model
**Table**: `users`

```python
class User(Base):
    id: UUID (PK)
    email: str (unique, indexed)
    password_hash: str
    role: UserRole (MEMBER, ADMIN)
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Relationships
    member: Member (one-to-one)
```

#### Member Model
**Table**: `members`

```python
class Member(Base):
    id: UUID (PK)
    user_id: UUID (FK -> users.id, unique)
    full_name: str
    phone: str (optional)
    membership_status: MembershipStatus (PENDING, ACTIVE, SUSPENDED)
    approved_by: UUID (FK -> users.id, nullable)
    approved_at: datetime (nullable)
    created_at: datetime
    updated_at: datetime

    # Relationships
    user: User
    bookings: List[Booking]
    recurring_patterns: List[RecurringPattern]
```

#### Booking Model
**Table**: `bookings`

```python
class Booking(Base):
    id: UUID (PK)
    member_id: UUID (FK -> members.id)
    start_time: datetime (indexed)
    end_time: datetime
    status: BookingStatus (CONFIRMED, CANCELLED)
    booking_type: BookingType (SINGLE, TEAM)
    party_size: int (1-20)
    recurring_pattern_id: UUID (FK -> recurring_patterns.id, nullable)
    created_by: UUID (FK -> users.id)
    cancelled_by: UUID (FK -> users.id, nullable)
    cancelled_at: datetime (nullable)
    created_at: datetime
    updated_at: datetime

    # Relationships
    member: Member
    recurring_pattern: RecurringPattern
    creator: User
```

#### RecurringPattern Model
**Table**: `recurring_patterns`

```python
class RecurringPattern(Base):
    id: UUID (PK)
    member_id: UUID (FK -> members.id)
    pattern_type: PatternType (WEEKLY)
    days_of_week: str (comma-separated: "1,3,5")
    start_time: time
    duration_mins: int
    valid_from: date
    valid_until: date
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Relationships
    member: Member
    bookings: List[Booking]
```

### Error Handling Patterns

#### HTTP Exception Handling
```python
# In routers
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Booking not found"
)

# In services (raise ValueError, routers convert to HTTPException)
raise ValueError("Email already registered")
```

#### Standard Error Responses
```json
{
  "detail": "Error message here"
}
```

### Logging Conventions
- FastAPI logs all requests automatically
- SQLAlchemy can log queries (set `echo=True` in `database.py`)
- Custom logging: Use Python `logging` module
- Uvicorn logs to stdout/stderr

### Security Responsibilities

#### Authentication
- **JWT Tokens**: Stored in HTTP-only cookies (XSS protection)
- **Access Token**: 15 minute expiry
- **Refresh Token**: 7 day expiry
- **Token Secret**: From `SESSION_SECRET` environment variable

#### Authorization
- **Dependency Injection**: `get_current_user()` validates JWT
- **Role Checking**: `require_admin()` enforces admin access
- **Member Status**: Active members required for booking

#### Password Security
- **Hashing**: bcrypt with automatic salt
- **Never stored plaintext**
- **Verification**: Timing-safe comparison

#### CORS Configuration
```python
# backend/app/main.py
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5000",
    # Replit domains added dynamically
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Example API Request/Response

#### POST /api/v1/bookings
**Request**:
```json
{
  "start_time": "2026-02-25T14:00:00Z",
  "end_time": "2026-02-25T15:30:00Z",
  "booking_type": "SINGLE",
  "party_size": 1
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "member_id": "123e4567-e89b-12d3-a456-426614174000",
  "start_time": "2026-02-25T14:00:00Z",
  "end_time": "2026-02-25T15:30:00Z",
  "status": "CONFIRMED",
  "booking_type": "SINGLE",
  "party_size": 1,
  "recurring_pattern_id": null,
  "created_by": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-24T12:30:00Z",
  "updated_at": "2026-02-24T12:30:00Z"
}
```

#### GET /api/v1/admin/stats
**Response** (200 OK):
```json
{
  "total_members": 25,
  "pending_approvals": 3,
  "active_members": 20,
  "suspended_members": 2,
  "total_bookings": 150,
  "upcoming_bookings": 45,
  "bookings_today": 8
}
```

---

## 6. Frontend Documentation

### Component Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Public landing page
│   ├── layout.tsx            # Root layout with AuthProvider
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   └── dashboard/            # Protected dashboard area
│       ├── layout.tsx        # Dashboard layout with Navigation
│       ├── page.tsx          # Main dashboard (member/admin)
│       ├── book/             # Booking creation page
│       ├── bookings/         # Member's bookings list
│       └── admin/            # Admin-only section
│           ├── page.tsx      # Admin dashboard with stats
│           ├── members/      # Member management page
│           └── bookings/     # All bookings oversight
├── components/               # Reusable components
│   ├── Navigation.tsx        # Top navigation bar
│   ├── Alert.tsx             # Alert/notification component
│   └── LoadingSpinner.tsx    # Loading indicator
├── context/
│   └── AuthContext.tsx       # Global auth state
├── lib/
│   └── api.ts                # API client
└── types/
    └── index.ts              # TypeScript definitions
```

### Component Naming Conventions
- **PascalCase** for component files: `Navigation.tsx`, `BookingCard.tsx`
- **camelCase** for utility files: `api.ts`, `utils.ts`
- Page components in Next.js: `page.tsx`, `layout.tsx`

### State Management Patterns

#### Global State (Auth Context)
**File**: `src/context/AuthContext.tsx`

**Provides**:
```typescript
{
  user: User | null,
  member: Member | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  isAdmin: boolean,
  login: (credentials) => Promise<void>,
  logout: () => Promise<void>,
  refreshUser: () => Promise<void>
}
```

**Usage**:
```tsx
import { useAuth } from "@/context/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm onSubmit={login} />;
  }

  return <Dashboard user={user} onLogout={logout} />;
}
```

#### Local State (Component State)
```tsx
const [bookings, setBookings] = useState<Booking[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### Route Definitions

#### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page

#### Protected Routes (Requires Authentication)
- `/dashboard` - Main dashboard (redirects based on role)
- `/dashboard/book` - Create new booking
- `/dashboard/bookings` - View member's bookings

#### Admin-Only Routes
- `/dashboard/admin` - Admin dashboard with statistics
- `/dashboard/admin/members` - Member management
- `/dashboard/admin/bookings` - All bookings oversight

#### Route Protection
Implemented in dashboard layout:
```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) redirect("/login");

  return <>{children}</>;
}
```

### Key UI Flows

#### Registration Flow
1. User visits `/register`
2. Fills out form (email, password, full name, phone)
3. Submits form → `POST /api/v1/auth/register`
4. Success: Shows "Awaiting approval" message
5. Redirects to `/login`

#### Login Flow
1. User visits `/login`
2. Enters email and password
3. Submits → `POST /api/v1/auth/login`
4. Success: Auth context updates, cookies set
5. Redirects to `/dashboard`
6. Dashboard checks member status:
   - PENDING: Shows "Awaiting approval"
   - ACTIVE: Shows booking interface
   - SUSPENDED: Shows "Account suspended"

#### Booking Creation Flow
1. Member navigates to `/dashboard/book`
2. Selects date, start time, end time
3. Chooses booking type (SINGLE/TEAM)
4. If TEAM: Enters party size (1-20)
5. Clicks "Check Availability"
6. System shows available spots
7. Confirms booking → `POST /api/v1/bookings`
8. Success: Redirects to `/dashboard/bookings`

#### Admin Member Approval Flow
1. Admin visits `/dashboard/admin/members`
2. Views list filtered by "PENDING" status
3. Reviews member details
4. Clicks "Approve" → `PATCH /api/v1/admin/members/{id}/approve`
5. Member status updates to "ACTIVE"
6. Member can now create bookings

### Frontend-Backend Interaction

#### API Client Configuration
**File**: `src/lib/api.ts`

```typescript
const api = axios.create({
  baseURL: getApiBaseUrl(), // http://localhost:8000/api/v1
  withCredentials: true,     // Include cookies
  headers: {
    "Content-Type": "application/json",
  },
});
```

#### API Method Organization
```typescript
// Organized by resource
export const authApi = { login, register, logout, getCurrentUser };
export const memberApi = { getProfile, updateProfile };
export const bookingApi = { getBookings, createBooking, checkAvailability };
export const adminApi = { getStats, getMembers, approveMember };
```

#### Error Handling
```typescript
// Axios interceptor transforms errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message;
    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status;
    return Promise.reject(enhancedError);
  }
);
```

**Component Usage**:
```tsx
try {
  const booking = await bookingApi.createBooking(data);
  setSuccess("Booking created!");
} catch (error: any) {
  setError(error.message); // User-friendly message
}
```

### Theming & Style Guide

#### Tailwind CSS Utility-First Approach
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
  Book Now
</button>
```

#### Common Style Patterns
```tsx
// Card container
<div className="bg-white rounded-lg shadow-md p-6">

// Form input
<input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

// Status badge
<span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
  Active
</span>
```

#### Color Conventions
- **Primary**: Blue (`blue-600`, `blue-700`)
- **Success**: Green (`green-600`, `green-100`)
- **Warning**: Yellow (`yellow-600`, `yellow-100`)
- **Danger**: Red (`red-600`, `red-100`)
- **Neutral**: Gray (`gray-100` to `gray-900`)

---

## 7. Database & Persistence

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o| Member : "has one"
    User ||--o{ Booking : "created by"
    Member ||--o{ Booking : "books"
    Member ||--o{ RecurringPattern : "creates"
    RecurringPattern ||--o{ Booking : "generates"
    User ||--o{ Member : "approved by"
    User ||--o{ Booking : "cancelled by"

    User {
        uuid id PK
        string email UK
        string password_hash
        enum role
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    Member {
        uuid id PK
        uuid user_id FK
        string full_name
        string phone
        enum membership_status
        uuid approved_by FK
        datetime approved_at
        datetime created_at
        datetime updated_at
    }

    Booking {
        uuid id PK
        uuid member_id FK
        datetime start_time
        datetime end_time
        enum status
        enum booking_type
        int party_size
        uuid recurring_pattern_id FK
        uuid created_by FK
        uuid cancelled_by FK
        datetime cancelled_at
        datetime created_at
        datetime updated_at
    }

    RecurringPattern {
        uuid id PK
        uuid member_id FK
        enum pattern_type
        string days_of_week
        time start_time
        int duration_mins
        date valid_from
        date valid_until
        boolean is_active
        datetime created_at
        datetime updated_at
    }
```

### Table Schemas

#### `users` Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hash |
| role | ENUM | NOT NULL, DEFAULT 'MEMBER' | MEMBER or ADMIN |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE, INDEX | Account status |
| created_at | TIMESTAMP | NOT NULL | Registration time |
| updated_at | TIMESTAMP | NOT NULL | Last modification |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `email`
- INDEX: `is_active`

#### `members` Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique member identifier |
| user_id | UUID | FK(users.id), UNIQUE, NOT NULL | Associated user |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| phone | VARCHAR(20) | NULL | Contact number |
| membership_status | ENUM | NOT NULL, DEFAULT 'PENDING', INDEX | PENDING/ACTIVE/SUSPENDED |
| approved_by | UUID | FK(users.id), NULL | Approving admin |
| approved_at | TIMESTAMP | NULL | Approval time |
| created_at | TIMESTAMP | NOT NULL | Registration time |
| updated_at | TIMESTAMP | NOT NULL | Last modification |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `user_id`
- INDEX: `membership_status`

**Foreign Keys**:
- `user_id` → `users.id` (RESTRICT)
- `approved_by` → `users.id` (SET NULL)

#### `bookings` Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique booking identifier |
| member_id | UUID | FK(members.id), NOT NULL, INDEX | Member who booked |
| start_time | TIMESTAMP | NOT NULL, INDEX | Booking start |
| end_time | TIMESTAMP | NOT NULL | Booking end |
| status | ENUM | NOT NULL, DEFAULT 'CONFIRMED', INDEX | CONFIRMED/CANCELLED |
| booking_type | ENUM | NOT NULL, DEFAULT 'SINGLE' | SINGLE/TEAM |
| party_size | INTEGER | NOT NULL, DEFAULT 1 | Number of people (1-20) |
| recurring_pattern_id | UUID | FK(recurring_patterns.id), NULL, INDEX | Pattern if recurring |
| created_by | UUID | FK(users.id), NOT NULL | Creator (member or admin) |
| cancelled_by | UUID | FK(users.id), NULL | Canceller if cancelled |
| cancelled_at | TIMESTAMP | NULL | Cancellation time |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last modification |

**Indexes**:
- PRIMARY KEY: `id`
- INDEX: `member_id`
- INDEX: `start_time`
- INDEX: `status`
- INDEX: `recurring_pattern_id`

**Foreign Keys**:
- `member_id` → `members.id` (RESTRICT)
- `recurring_pattern_id` → `recurring_patterns.id` (SET NULL)
- `created_by` → `users.id` (RESTRICT)
- `cancelled_by` → `users.id` (SET NULL)

#### `recurring_patterns` Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique pattern identifier |
| member_id | UUID | FK(members.id), NOT NULL | Pattern owner |
| pattern_type | ENUM | NOT NULL | Currently only 'WEEKLY' |
| days_of_week | VARCHAR(50) | NULL | Comma-separated days (0-6) |
| start_time | TIME | NOT NULL | Time of day |
| duration_mins | INTEGER | NOT NULL | Booking duration |
| valid_from | DATE | NOT NULL | Start date |
| valid_until | DATE | NOT NULL | End date |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last modification |

**Indexes**:
- PRIMARY KEY: `id`

**Foreign Keys**:
- `member_id` → `members.id` (RESTRICT)

### Migration Structure

#### Migration Tool: Alembic

**Location**: `backend/alembic/`

**Configuration**: `backend/alembic.ini`

**Versions**: `backend/alembic/versions/`

#### Existing Migrations
1. **f2f547987da9_initial_migration**: Creates users, members, bookings, recurring_patterns tables
2. **6f9a394b7ead_add_booking_type_and_party_size**: Adds booking_type and party_size columns

#### Running Migrations
```bash
# Generate new migration
cd backend
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Data Lifecycle

#### User Registration
1. Create `User` record (role: MEMBER, is_active: true)
2. Create `Member` record (membership_status: PENDING)
3. Admin approves → Update `member.membership_status = ACTIVE`

#### Booking Creation
1. Validate member is ACTIVE
2. Check time slot availability
3. Calculate capacity (max 20 people total)
4. Create `Booking` record (status: CONFIRMED)

#### Recurring Pattern
1. Create `RecurringPattern` record
2. Generate individual `Booking` records for each occurrence
3. Link bookings to pattern via `recurring_pattern_id`
4. Deactivation: Set `is_active = false`, no cascading delete

#### Soft Deletes
- **Users**: Set `is_active = false`
- **Bookings**: Set `status = CANCELLED`
- **Recurring Patterns**: Set `is_active = false`

### Common Queries and Access Patterns

#### Find Available Time Slots
```sql
SELECT
    SUM(party_size) as total_capacity
FROM bookings
WHERE status = 'CONFIRMED'
    AND start_time < :end_time
    AND end_time > :start_time;

-- Available spots = 20 - total_capacity
```

#### Get Member's Upcoming Bookings
```sql
SELECT * FROM bookings
WHERE member_id = :member_id
    AND status = 'CONFIRMED'
    AND start_time >= NOW()
ORDER BY start_time ASC;
```

#### Admin: Get Pending Members
```sql
SELECT m.*, u.email
FROM members m
JOIN users u ON m.user_id = u.id
WHERE m.membership_status = 'PENDING'
ORDER BY m.created_at ASC;
```

#### Check Booking Conflicts
```sql
SELECT * FROM bookings
WHERE member_id = :member_id
    AND status = 'CONFIRMED'
    AND start_time < :new_end_time
    AND end_time > :new_start_time;
```

---

## 8. Environment & Configuration

### Required Environment Variables

#### Backend (.env)
```bash
# Database connection (required)
DATABASE_URL=sqlite+aiosqlite:///./gym_booking.db
# OR for PostgreSQL:
# DATABASE_URL=postgresql://user:pass@host:port/db

# JWT secret (required) - generate with: openssl rand -hex 32
SESSION_SECRET=your-secret-key-here

# JWT expiration (optional, defaults provided)
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_ALGORITHM=HS256

# Gym capacity settings (optional, defaults provided)
GYM_MAX_CAPACITY=20
MAX_BOOKING_DURATION_MINS=480
MAX_BOOKING_ADVANCE_DAYS=365
MIN_BOOKING_LEAD_TIME_MINS=0
MIN_BOOKING_DURATION_MINS=30
```

#### Frontend (.env.local)
```bash
# API URL (optional, auto-detected from browser)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Secrets Management

#### Local Development
- Store in `.env` files (gitignored)
- Never commit `.env` files to version control
- Share `.env.example` with dummy values

#### Production (Replit)
- Use Replit Secrets panel
- Environment variables injected at runtime
- Database URL provided by Replit PostgreSQL

#### Generating Secrets
```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Or with Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### Deployment Configurations

#### Development (Local)
- SQLite database
- Hot reload enabled
- Debug logging
- CORS allows localhost

#### Production (Replit)
- PostgreSQL database
- Production-grade ASGI server
- Secure cookies (secure=True when HTTPS)
- CORS allows Replit domains

### Local Development Setup

#### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

#### Backend Setup
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt
# OR with uv
uv pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and set DATABASE_URL and SESSION_SECRET

# Initialize database
python -m alembic upgrade head

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create environment file (optional)
cp .env.local.example .env.local

# Run development server
npm run dev
```

Frontend runs at: `http://localhost:5000`

#### Full Stack Development
Run both servers concurrently in separate terminals:

**Terminal 1** (Backend):
```bash
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2** (Frontend):
```bash
cd frontend && npm run dev
```

---

## 9. Build, Deployment, and CI/CD

### Build Pipeline

#### Backend Build
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

No build step required (Python interpreted).

#### Frontend Build
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

Generates optimized static assets in `.next/` directory.

### Test Suite Overview

#### Backend Tests
**Location**: `backend/tests/`

**Framework**: pytest with pytest-asyncio

**Run Tests**:
```bash
cd backend
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_auth_service.py

# Verbose output
pytest -v
```

**Test Files**:
- `tests/test_auth_service.py`: Authentication logic tests
- `tests/test_booking_service.py`: Booking logic tests (if exists)

**Test Database**:
- Uses separate SQLite database for testing
- Automatically created and torn down

#### Frontend Tests
Currently no automated tests configured.

**Recommended Setup**:
- Jest for unit tests
- React Testing Library for component tests
- Playwright or Cypress for E2E tests

### Static Analysis / Linting

#### Backend
```bash
# Type checking (if using mypy)
mypy app/

# Code formatting (if using black)
black app/

# Linting (if using flake8)
flake8 app/
```

Currently not configured in project.

#### Frontend
```bash
# Next.js built-in ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

### Deployment Approach

#### Containerization (Recommended for Production)

**Dockerfile Example (Backend)**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Dockerfile Example (Frontend)**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

**Docker Compose**:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/gymdb
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "5000:5000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=gymdb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

#### Serverless / PaaS
- **Vercel**: Frontend deployment (Next.js optimized)
- **Render**: Backend deployment (FastAPI support)
- **Railway**: Full-stack deployment
- **Replit**: Current platform (original development environment)

### Release Management Strategy

#### Versioning
- Semantic versioning: `MAJOR.MINOR.PATCH`
- Currently at `1.0.0`

#### Branching Strategy (Recommended)
- **main**: Production-ready code
- **develop**: Integration branch
- **feature/***: New features
- **bugfix/***: Bug fixes
- **hotfix/***: Urgent production fixes

#### Release Process
1. Develop in feature branches
2. Merge to `develop` for integration testing
3. Create release branch: `release/v1.1.0`
4. Test thoroughly
5. Merge to `main` and tag: `v1.1.0`
6. Deploy to production
7. Merge back to `develop`

#### Database Migrations in Production
```bash
# Before deployment
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

**Best Practice**: Test migrations on staging environment first.

---

## 10. Common Workflows

### How to Add a New API Endpoint

**Example**: Add endpoint to get member statistics

#### 1. Define Pydantic Schema
**File**: `backend/app/schemas/member.py`
```python
class MemberStats(BaseModel):
    total_bookings: int
    upcoming_bookings: int
    total_hours_booked: float
```

#### 2. Add Service Method
**File**: `backend/app/services/member_service.py`
```python
async def get_member_stats(self, member_id: UUID) -> dict:
    """Get booking statistics for a member."""
    # Query bookings
    result = await self.db.execute(
        select(Booking)
        .where(Booking.member_id == member_id)
        .where(Booking.status == BookingStatus.CONFIRMED)
    )
    bookings = result.scalars().all()

    # Calculate stats
    total = len(bookings)
    upcoming = len([b for b in bookings if b.start_time > datetime.utcnow()])
    total_hours = sum([
        (b.end_time - b.start_time).total_seconds() / 3600
        for b in bookings
    ])

    return {
        "total_bookings": total,
        "upcoming_bookings": upcoming,
        "total_hours_booked": total_hours
    }
```

#### 3. Add Router Endpoint
**File**: `backend/app/routers/members.py`
```python
@router.get(
    "/me/stats",
    response_model=MemberStats,
    summary="Get member statistics"
)
async def get_my_stats(
    user: User = Depends(get_current_active_member),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for the current member."""
    service = MemberService(db)
    stats = await service.get_member_stats(user.member.id)
    return stats
```

#### 4. Test Endpoint
```bash
# Start server
uvicorn app.main:app --reload

# Test in browser
# Visit http://localhost:8000/docs
# Try the new endpoint
```

#### 5. Add Frontend API Method
**File**: `frontend/src/lib/api.ts`
```typescript
export const memberApi = {
  // ... existing methods

  getStats: async (): Promise<MemberStats> => {
    const response = await api.get("/members/me/stats");
    return response.data;
  },
};
```

#### 6. Use in Frontend Component
```tsx
const [stats, setStats] = useState<MemberStats | null>(null);

useEffect(() => {
  async function loadStats() {
    const data = await memberApi.getStats();
    setStats(data);
  }
  loadStats();
}, []);
```

### How to Create a New Frontend Page

**Example**: Add a member profile page

#### 1. Create Page File
**File**: `frontend/src/app/dashboard/profile/page.tsx`
```tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { memberApi } from "@/lib/api";

export default function ProfilePage() {
  const { member, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: member?.full_name || "",
    phone: member?.phone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await memberApi.updateProfile(formData);
      await refreshUser();
      setEditing(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!member) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      {editing ? (
        <form onSubmit={handleSubmit}>
          <input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
          <button type="submit">Save</button>
        </form>
      ) : (
        <div>
          <p>Name: {member.full_name}</p>
          <p>Phone: {member.phone}</p>
          <button onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}
```

#### 2. Add Navigation Link
**File**: `frontend/src/components/Navigation.tsx`
```tsx
<Link href="/dashboard/profile">Profile</Link>
```

#### 3. Test Page
- Navigate to `http://localhost:5000/dashboard/profile`
- Verify rendering and functionality

### How to Add a New Data Model & Migration

**Example**: Add a `GymEquipment` model

#### 1. Create Model
**File**: `backend/app/models/equipment.py`
```python
import uuid
from sqlalchemy import Column, String, Boolean, Integer
from app.models.types import GUID
from app.database import Base

class GymEquipment(Base):
    __tablename__ = "equipment"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    is_available = Column(Boolean, nullable=False, default=True)
```

#### 2. Import in Database Init
**File**: `backend/app/database.py`
```python
async def init_db():
    async with engine.begin() as conn:
        from app.models import user, member, booking, recurring, equipment
        await conn.run_sync(Base.metadata.create_all)
```

#### 3. Generate Migration
```bash
cd backend
alembic revision --autogenerate -m "Add equipment table"
```

This creates a file like: `alembic/versions/abc123_add_equipment_table.py`

#### 4. Review Migration
**File**: `backend/alembic/versions/abc123_add_equipment_table.py`
```python
def upgrade():
    op.create_table(
        'equipment',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('equipment')
```

#### 5. Apply Migration
```bash
alembic upgrade head
```

#### 6. Create Pydantic Schemas
**File**: `backend/app/schemas/equipment.py`
```python
from pydantic import BaseModel

class EquipmentBase(BaseModel):
    name: str
    quantity: int
    is_available: bool = True

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentResponse(EquipmentBase):
    id: str

    class Config:
        from_attributes = True
```

#### 7. Add Service and Routes
Follow the same pattern as other models (service class, router endpoints).

### How to Run Tests

#### Backend Tests
```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth_service.py

# Run with coverage
pytest --cov=app --cov-report=html
open htmlcov/index.html  # View coverage report
```

#### Frontend Tests (if configured)
```bash
cd frontend

# Run tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### How to Debug Common Issues

#### Issue: "401 Unauthorized" on API calls
**Cause**: JWT token expired or missing

**Solution**:
1. Check browser cookies (DevTools → Application → Cookies)
2. Verify `access_token` cookie exists
3. Try logging out and back in
4. Check backend logs for token validation errors

```bash
# Enable SQL logging to debug
# In backend/app/database.py
engine = create_async_engine(database_url, echo=True)
```

#### Issue: CORS errors in browser console
**Cause**: Frontend and backend origins don't match

**Solution**:
1. Check `backend/app/main.py` allowed origins
2. Ensure frontend URL is in the list
3. Verify `withCredentials: true` in API client

```python
# backend/app/main.py
allowed_origins = [
    "http://localhost:5000",  # Add your frontend URL
]
```

#### Issue: Database migration conflicts
**Cause**: Multiple migration files created simultaneously

**Solution**:
```bash
# Rollback to a known good state
alembic downgrade <revision_id>

# Delete conflicting migration files
rm alembic/versions/<conflict_file>.py

# Regenerate migration
alembic revision --autogenerate -m "Fixed migration"
alembic upgrade head
```

#### Issue: Booking capacity calculation incorrect
**Cause**: Overlapping time slots not properly detected

**Debug**:
1. Check `backend/app/services/booking_service.py:check_availability()`
2. Verify time zone handling (all times should be UTC)
3. Add logging to see overlapping bookings:

```python
# In booking_service.py
overlapping = result.scalars().all()
print(f"Found {len(overlapping)} overlapping bookings")
for booking in overlapping:
    print(f"  {booking.start_time} - {booking.end_time}: {booking.party_size} people")
```

### How to Add or Modify Permissions

**Example**: Add "TRAINER" role with ability to view all member bookings

#### 1. Update User Role Enum
**File**: `backend/app/models/user.py`
```python
class UserRole(str, enum.Enum):
    MEMBER = "MEMBER"
    ADMIN = "ADMIN"
    TRAINER = "TRAINER"  # New role
```

#### 2. Create Migration
```bash
alembic revision -m "Add trainer role"
```

Manually edit migration:
```python
def upgrade():
    op.execute("ALTER TYPE userrole ADD VALUE 'TRAINER'")

def downgrade():
    # Removing enum values is complex in PostgreSQL
    # Consider creating a new enum instead
    pass
```

#### 3. Create Permission Dependency
**File**: `backend/app/auth/dependencies.py`
```python
async def require_trainer_or_admin(
    user: User = Depends(get_current_user)
) -> User:
    """Require user to be TRAINER or ADMIN."""
    if user.role not in [UserRole.TRAINER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trainer or Admin access required"
        )
    return user
```

#### 4. Use in Route
**File**: `backend/app/routers/bookings.py`
```python
@router.get(
    "/all",
    response_model=list[BookingResponse]
)
async def get_all_member_bookings(
    user: User = Depends(require_trainer_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all bookings (trainer/admin only)."""
    # Implementation
```

#### 5. Update Frontend Types
**File**: `frontend/src/types/index.ts`
```typescript
export type UserRole = "MEMBER" | "ADMIN" | "TRAINER";
```

#### 6. Update Frontend Auth Context
**File**: `frontend/src/context/AuthContext.tsx`
```typescript
const isTrainer = user?.role === "TRAINER";
const isTrainerOrAdmin = ["TRAINER", "ADMIN"].includes(user?.role || "");

// Add to context value
return {
  // ...
  isTrainer,
  isTrainerOrAdmin,
};
```

---

## 11. Conventions & Standards

### Coding Conventions

#### Python (Backend)
- **PEP 8**: Follow Python style guide
- **Line Length**: 100 characters (flexible)
- **Imports**: Group by standard library, third-party, local
- **Docstrings**: Use triple quotes for all functions/classes
- **Type Hints**: Use for function parameters and returns

```python
from typing import Optional
from datetime import datetime

async def create_booking(
    member_id: UUID,
    start_time: datetime,
    end_time: datetime
) -> Booking:
    """
    Create a new booking for a member.

    Args:
        member_id: The member's UUID
        start_time: Booking start time (UTC)
        end_time: Booking end time (UTC)

    Returns:
        The created Booking instance

    Raises:
        ValueError: If time slot is invalid
    """
    # Implementation
```

#### TypeScript (Frontend)
- **Airbnb Style Guide** (loosely followed)
- **Indentation**: 2 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Optional (consistent usage)
- **Types**: Explicit interface/type definitions

```typescript
interface BookingFormData {
  startTime: string;
  endTime: string;
  bookingType: "SINGLE" | "TEAM";
  partySize: number;
}

const createBooking = async (data: BookingFormData): Promise<Booking> => {
  // Implementation
};
```

### Naming Conventions

#### Backend (Python)
- **Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions**: `snake_case()`
- **Variables**: `snake_case`
- **Constants**: `UPPER_CASE`
- **Private**: `_leading_underscore`

```python
# backend/app/services/booking_service.py
class BookingService:
    MAX_CAPACITY = 20  # Constant

    def __init__(self, db: AsyncSession):
        self._db = db  # Private attribute

    async def create_booking(self, member_id: UUID) -> Booking:
        # Public method
        pass
```

#### Frontend (TypeScript)
- **Files**: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- **Components**: `PascalCase`
- **Functions**: `camelCase()`
- **Variables**: `camelCase`
- **Constants**: `UPPER_CASE`
- **Types/Interfaces**: `PascalCase`

```typescript
// frontend/src/components/BookingCard.tsx
interface BookingCardProps {
  booking: Booking;
  onCancel: (id: string) => void;
}

const BookingCard = ({ booking, onCancel }: BookingCardProps) => {
  const MAX_PARTY_SIZE = 20;
  const formattedDate = formatDate(booking.startTime);

  return <div>{formattedDate}</div>;
};
```

#### Database
- **Tables**: `snake_case` (plural)
- **Columns**: `snake_case`
- **Indexes**: `idx_table_column`
- **Foreign Keys**: `fk_table_column`

### Versioning Guidelines

#### API Versioning
- Prefix: `/api/v1`, `/api/v2`
- Breaking changes require new version
- Maintain backwards compatibility when possible

#### Database Versioning
- Alembic migrations track schema versions
- Never modify existing migrations
- Create new migration for every schema change

### Branching Strategy

#### Git Flow (Recommended)
```
main (production)
  └── develop (integration)
       ├── feature/add-trainer-role
       ├── feature/booking-calendar
       └── bugfix/capacity-calculation

hotfix/critical-security-fix
  └── main (merged directly)
```

#### Branch Naming
- `feature/description`: New features
- `bugfix/description`: Bug fixes
- `hotfix/description`: Urgent production fixes
- `chore/description`: Maintenance tasks
- `docs/description`: Documentation updates

#### Branch Lifecycle
1. Create from `develop`
2. Develop and commit
3. Open pull request to `develop`
4. Code review
5. Merge and delete branch

### Commit Message Format

#### Conventional Commits
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting (no logic change)
- **refactor**: Code restructuring
- **test**: Adding/updating tests
- **chore**: Maintenance tasks

#### Examples
```
feat(bookings): add team booking support

- Add booking_type and party_size fields to Booking model
- Update capacity calculation to account for party size
- Add frontend UI for team booking selection

Closes #45
```

```
fix(auth): resolve token expiration edge case

When refresh token expires exactly at validation time,
return 401 instead of 500 error.

Fixes #78
```

```
docs(readme): update setup instructions

Add detailed steps for local PostgreSQL setup
```

---

## 12. Known Issues & Current Limitations

### Open Technical Risks

#### 1. No Email Verification
**Risk**: Users can register with any email without verification

**Impact**:
- Fake accounts possible
- Password reset unavailable
- No email notifications

**Mitigation**: Add email verification service (SendGrid, AWS SES)

#### 2. No Rate Limiting
**Risk**: API endpoints susceptible to abuse

**Impact**:
- Potential DoS attacks
- Spam registrations
- Excessive booking attempts

**Mitigation**: Implement rate limiting middleware (slowapi, FastAPI-Limiter)

#### 3. SQLite in Production (if deployed)
**Risk**: SQLite not suitable for concurrent writes

**Impact**:
- Database locks under load
- No replication/backup
- Performance limitations

**Mitigation**: Use PostgreSQL for production deployments

#### 4. No Background Job System
**Risk**: Long-running tasks block request threads

**Impact**:
- Slow recurring booking generation
- No automated cleanup of old bookings

**Mitigation**: Implement Celery or FastAPI BackgroundTasks

### Architectural Debt

#### 1. Tight Coupling in Services
**Issue**: Service classes directly use SQLAlchemy queries

**Better Approach**: Implement repository pattern for data access abstraction

**Refactor Example**:
```python
# Current
class BookingService:
    async def get_booking(self, id):
        result = await self.db.execute(select(Booking).where(...))
        return result.scalar_one_or_none()

# Better (Repository Pattern)
class BookingRepository:
    async def find_by_id(self, id):
        result = await self.db.execute(select(Booking).where(...))
        return result.scalar_one_or_none()

class BookingService:
    def __init__(self, repo: BookingRepository):
        self.repo = repo

    async def get_booking(self, id):
        return await self.repo.find_by_id(id)
```

#### 2. No Caching Layer
**Issue**: Repeated database queries for frequently accessed data

**Examples**:
- Member profile fetched on every request
- Capacity calculations repeated
- Statistics recomputed on each page load

**Solution**: Add Redis for caching

#### 3. Frontend State Management
**Issue**: Only React Context for state (insufficient for complex state)

**Limitation**: No optimistic updates, no cache management

**Solution**: Consider React Query or Zustand for advanced state management

#### 4. No API Documentation Beyond OpenAPI
**Issue**: OpenAPI docs auto-generated but lack usage examples

**Solution**: Add detailed API documentation with example requests/responses

### Areas Needing Future Improvement

#### 1. Testing Coverage
**Current State**:
- Limited backend tests
- No frontend tests
- No E2E tests

**Needed**:
- Unit tests for all services
- Component tests for critical UI
- E2E tests for key workflows (login, booking)

#### 2. Error Logging and Monitoring
**Current State**:
- Basic console logging
- No error tracking
- No performance monitoring

**Needed**:
- Sentry for error tracking
- Application performance monitoring (APM)
- Structured logging (JSON format)

#### 3. Backup and Disaster Recovery
**Current State**:
- No automated backups
- No recovery procedures

**Needed**:
- Daily database backups
- Point-in-time recovery capability
- Documented recovery procedures

#### 4. Security Enhancements
**Current State**:
- Basic JWT auth
- CORS configured
- HTTPS in production

**Needed**:
- Two-factor authentication
- Password strength requirements
- Account lockout after failed attempts
- Security headers (CSP, HSTS)
- Regular security audits

#### 5. Performance Optimization
**Current State**:
- No query optimization
- N+1 query problems possible
- No database indexing strategy

**Needed**:
- Database query analysis
- Strategic indexing
- API response caching
- Frontend code splitting

#### 6. User Experience
**Current State**:
- Basic UI design
- Limited user feedback
- No accessibility features

**Needed**:
- Improved UI/UX design
- Loading states everywhere
- Error messages more user-friendly
- WCAG accessibility compliance
- Mobile-responsive improvements

#### 7. Admin Features
**Current State**:
- Basic member approval
- Limited booking oversight

**Needed**:
- Bulk member operations
- Export data to CSV/Excel
- Booking analytics and reports
- Member activity tracking
- Audit logs

#### 8. Member Features
**Current State**:
- Basic booking creation
- Recurring patterns

**Needed**:
- Booking calendar view
- Booking reminders (email/SMS)
- Waiting list for full time slots
- Booking history export
- Favorite time slots

---

## 13. Appendix

### Glossary of Terms

| Term | Definition |
|------|------------|
| **Access Token** | Short-lived JWT token used for API authentication (15 min expiry) |
| **Active Member** | Member with `membership_status = ACTIVE`, can create bookings |
| **Admin** | User with `role = ADMIN`, has elevated permissions |
| **Booking** | Reserved time slot at the gym |
| **Capacity** | Maximum number of people allowed in gym (20) |
| **Confirmed Booking** | Booking with `status = CONFIRMED` (not cancelled) |
| **JWT** | JSON Web Token, used for stateless authentication |
| **Member** | User profile with gym-specific data |
| **Party Size** | Number of people included in a booking (1-20) |
| **Pending Member** | Newly registered member awaiting admin approval |
| **Recurring Pattern** | Template for automatically generating repeated bookings |
| **Refresh Token** | Long-lived JWT token used to obtain new access tokens (7 day expiry) |
| **Single Booking** | Booking for one person (`booking_type = SINGLE`) |
| **Soft Delete** | Marking record as deleted without removing from database |
| **Suspended Member** | Member temporarily disabled by admin |
| **Team Booking** | Booking for multiple people (`booking_type = TEAM`) |
| **Time Slot** | Period of time that can be booked |

### Useful Scripts

#### Create Admin User
```python
# backend/create_admin.py
import asyncio
from app.database import AsyncSessionLocal
from app.services.auth_service import AuthService

async def create_admin():
    async with AsyncSessionLocal() as db:
        service = AuthService(db)
        user, member = await service.register_user(
            email="admin@example.com",
            password="secure_password",
            full_name="Admin User",
            phone="1234567890"
        )

        # Set role to ADMIN
        user.role = "ADMIN"
        member.membership_status = "ACTIVE"
        await db.commit()

        print(f"Admin user created: {user.email}")

if __name__ == "__main__":
    asyncio.run(create_admin())
```

Run:
```bash
cd backend
python create_admin.py
```

#### Reset Database
```bash
# backend/reset_db.sh
#!/bin/bash

# Delete database
rm gym_booking.db

# Recreate from migrations
alembic upgrade head

echo "Database reset complete"
```

#### Check Database
```python
# backend/check_db.py
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.member import Member
from app.models.booking import Booking

async def check_db():
    async with AsyncSessionLocal() as db:
        # Count users
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Total users: {len(users)}")

        # Count members
        result = await db.execute(select(Member))
        members = result.scalars().all()
        print(f"Total members: {len(members)}")

        # Count bookings
        result = await db.execute(select(Booking))
        bookings = result.scalars().all()
        print(f"Total bookings: {len(bookings)}")

if __name__ == "__main__":
    asyncio.run(check_db())
```

#### Generate Test Data
```python
# backend/generate_test_data.py
import asyncio
from datetime import datetime, timedelta
from app.database import AsyncSessionLocal
from app.services.auth_service import AuthService
from app.services.booking_service import BookingService

async def generate_test_data():
    async with AsyncSessionLocal() as db:
        auth_service = AuthService(db)
        booking_service = BookingService(db)

        # Create test members
        for i in range(5):
            user, member = await auth_service.register_user(
                email=f"member{i}@test.com",
                password="password123",
                full_name=f"Test Member {i}",
                phone=f"555000{i:04d}"
            )

            # Approve member
            member.membership_status = "ACTIVE"
            await db.commit()

            # Create some bookings
            for j in range(3):
                start = datetime.utcnow() + timedelta(days=j+1, hours=10)
                end = start + timedelta(hours=1)

                await booking_service.create_booking(
                    member_id=member.id,
                    start_time=start,
                    end_time=end,
                    booking_type="SINGLE",
                    party_size=1,
                    created_by=user.id
                )

        print("Test data generated!")

if __name__ == "__main__":
    asyncio.run(generate_test_data())
```

### Example AI Agent Prompts

#### Fix Bug Prompt
```
I'm experiencing an issue where bookings are being created even when the gym is at full capacity.

Context:
- File: backend/app/services/booking_service.py
- Function: create_booking()
- Expected: Should raise ValueError if capacity exceeded
- Actual: Booking created successfully even at 20/20 capacity

Please:
1. Review the capacity checking logic in booking_service.py:check_availability()
2. Identify the bug (likely in how overlapping bookings are calculated)
3. Fix the issue
4. Add a test case to prevent regression

Relevant files:
- backend/app/services/booking_service.py (lines 50-120)
- backend/app/models/booking.py (Booking model definition)
- backend/app/config.py (GYM_MAX_CAPACITY setting)
```

#### Add Feature Prompt
```
I need to add a "waiting list" feature for full time slots.

Requirements:
1. When a booking fails due to capacity, offer to join waiting list
2. Store waiting list entries with member_id, time slot, party size
3. When a booking is cancelled, notify waiting list members
4. Admin can view and manage waiting list

Please:
1. Design the database schema (WaitingList table)
2. Create Alembic migration
3. Add service methods for waiting list operations
4. Create API endpoints (POST /bookings/waitlist, GET /bookings/waitlist, DELETE /bookings/waitlist/{id})
5. Add admin endpoints to view all waiting lists
6. Update frontend to show "Join Waiting List" button when booking fails

Follow the existing code patterns in this codebase. Reference:
- backend/app/models/booking.py for model structure
- backend/app/services/booking_service.py for service patterns
- backend/app/routers/bookings.py for route structure
```

#### Refactor Prompt
```
The booking_service.py file has grown too large and has multiple responsibilities. Please refactor it using best practices.

Current issues:
- Single file with 500+ lines
- Handles booking creation, capacity checking, recurring patterns, and cancellation
- Difficult to test individual components

Please refactor to:
1. Split into multiple service classes:
   - BookingService (core booking CRUD)
   - CapacityService (availability checking)
   - RecurringBookingService (recurring pattern logic)
2. Extract common validation logic into validators
3. Update routers to use new service structure
4. Ensure all existing tests still pass
5. Add type hints everywhere

Maintain backwards compatibility with existing API endpoints.
```

### Quick Reference: Key Files

| File | Purpose | When to Modify |
|------|---------|----------------|
| `backend/app/main.py` | App entry, router registration | Add new router, change CORS |
| `backend/app/config.py` | Configuration settings | Add new env variables |
| `backend/app/database.py` | Database connection | Change DB URL, add models |
| `backend/app/models/*.py` | Database schema | Add/modify data models |
| `backend/app/routers/*.py` | API endpoints | Add/modify endpoints |
| `backend/app/services/*.py` | Business logic | Add/modify business rules |
| `backend/app/schemas/*.py` | Request/response validation | Add/modify API contracts |
| `backend/app/auth/dependencies.py` | Auth middleware | Add permission checks |
| `frontend/src/lib/api.ts` | API client | Add new API methods |
| `frontend/src/context/AuthContext.tsx` | Global auth state | Modify auth logic |
| `frontend/src/types/index.ts` | TypeScript types | Add/modify types |
| `frontend/src/app/**/page.tsx` | UI pages | Add/modify pages |
| `frontend/src/components/*.tsx` | Reusable components | Add/modify components |

### Configuration Reference

#### Backend Environment Variables
```bash
# Required
DATABASE_URL=sqlite+aiosqlite:///./gym_booking.db
SESSION_SECRET=your-secret-key-here

# Optional (defaults shown)
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_ALGORITHM=HS256
GYM_MAX_CAPACITY=20
MAX_BOOKING_DURATION_MINS=480
MAX_BOOKING_ADVANCE_DAYS=365
MIN_BOOKING_LEAD_TIME_MINS=0
MIN_BOOKING_DURATION_MINS=30
```

#### Frontend Environment Variables
```bash
# Optional
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

#### Database Connection Strings
```bash
# SQLite (development)
DATABASE_URL=sqlite+aiosqlite:///./gym_booking.db

# PostgreSQL (production)
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/gymdb

# PostgreSQL with SSL (Replit)
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

---

## Conclusion

This documentation provides a comprehensive technical overview of the Gaelic Gym Booker application. It should enable both AI agents and human developers to:

- Understand the system architecture quickly
- Navigate the codebase effectively
- Add new features safely
- Fix bugs efficiently
- Deploy and maintain the application

For questions or contributions, refer to the project repository or contact the development team.

**Version**: 1.0.0
**Last Updated**: 2026-02-24
**Maintained By**: Development Team
