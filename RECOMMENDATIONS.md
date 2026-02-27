# Future Enhancements, Performance & Security

## Future Enhancements

### Priority 1: Core Features

#### 1. Email Notifications
Send automated emails for booking confirmations, reminders, and cancellations.

```python
# Backend implementation suggestion
from fastapi_mail import FastMail, MessageSchema

async def send_booking_confirmation(member_email: str, booking: Booking):
    message = MessageSchema(
        subject="Gym Booking Confirmed",
        recipients=[member_email],
        body=f"Your booking on {booking.start_time} is confirmed.",
    )
    await fast_mail.send_message(message)
```

**Trigger points:**
- Booking created → Confirmation email
- 24 hours before → Reminder email
- Booking cancelled → Cancellation notice
- Admin approval → Welcome email to new members

#### 2. Waitlist System
Allow members to join a waitlist when slots are full.

```sql
-- New table
CREATE TABLE waitlist (
    id UUID PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    requested_date DATE,
    requested_start_time TIME,
    requested_end_time TIME,
    position INTEGER,
    status VARCHAR(20), -- 'waiting', 'offered', 'expired'
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Logic:**
- When slot is full, offer "Join Waitlist" button
- When booking cancelled, notify next in queue
- Auto-expire offers after 2 hours
- Send push/email notification when spot opens

#### 3. Profile Management
Allow members to update their profile information.

**Features:**
- Update phone number
- Change password
- Upload profile photo
- Set notification preferences
- View membership history

#### 4. Recurring Booking Enhancement
Improve the existing recurring pattern system.

**Additions:**
- Visual calendar showing all recurring instances
- Bulk cancel/modify recurring bookings
- Conflict detection before pattern creation
- Exception dates (skip specific dates)

---

### Priority 2: User Experience

#### 5. Mobile App (React Native)
Build a mobile app for easier booking on-the-go.

**Key screens:**
- Quick book (one-tap booking for favorite times)
- Calendar view of all bookings
- Push notifications
- QR code check-in

#### 6. Calendar Integration
Sync bookings with external calendars.

```typescript
// Generate .ics file for download
export function generateICSFile(booking: Booking): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDateTime(booking.start_time)}
DTEND:${formatDateTime(booking.end_time)}
SUMMARY:Gym Session
LOCATION:Eoghan Rua CLG Gym
END:VEVENT
END:VCALENDAR`;
}
```

**Integrations:**
- Google Calendar API
- Apple Calendar (iCal format)
- Microsoft Outlook

#### 7. Usage Analytics Dashboard
Show members their gym usage statistics.

**Metrics:**
- Total hours this month
- Favorite booking times
- Streak tracking (consecutive weeks)
- Comparison to club average

---

### Priority 3: Admin Features

#### 8. Bulk Operations
Allow admins to perform bulk actions.

**Features:**
- Bulk approve pending members
- Bulk cancel bookings (e.g., gym maintenance)
- Bulk email to members
- Import members from CSV

#### 9. Reporting & Export
Generate reports for club management.

**Reports:**
- Monthly usage statistics
- Peak hours analysis
- Member retention metrics
- Revenue tracking (if paid memberships)

**Export formats:** PDF, CSV, Excel

#### 10. Equipment Booking
Extend system to book specific equipment.

```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    quantity INTEGER,
    category VARCHAR(50)
);

CREATE TABLE equipment_bookings (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    equipment_id UUID REFERENCES equipment(id),
    quantity INTEGER DEFAULT 1
);
```

---

## Performance Considerations

### Database Optimization

#### 1. Indexing Strategy

```sql
-- Essential indexes for query performance
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_member_id ON bookings(member_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date_range ON bookings(start_time, end_time);

-- Composite index for availability queries
CREATE INDEX idx_bookings_overlap ON bookings(start_time, end_time, status)
    WHERE status = 'confirmed';

-- Partial index for active members
CREATE INDEX idx_members_active ON members(id)
    WHERE membership_status = 'active';
```

#### 2. Query Optimization

**Before (N+1 problem):**
```python
# Bad: Executes N+1 queries
bookings = await session.execute(select(Booking))
for booking in bookings:
    member = await session.get(Member, booking.member_id)  # N queries!
```

**After (Eager loading):**
```python
# Good: Single query with join
query = select(Booking).options(selectinload(Booking.member))
bookings = await session.execute(query)
```

#### 3. Connection Pooling

```python
# Configure SQLAlchemy connection pool
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,           # Maintain 10 connections
    max_overflow=20,        # Allow 20 extra during peak
    pool_timeout=30,        # Wait 30s for connection
    pool_recycle=1800,      # Recycle connections every 30 min
)
```

### Caching Strategy

#### 1. Redis Cache (Recommended)

```python
import redis.asyncio as redis

cache = redis.from_url("redis://localhost:6379")

async def get_availability(date: str) -> dict:
    # Check cache first
    cached = await cache.get(f"availability:{date}")
    if cached:
        return json.loads(cached)
    
    # Query database
    availability = await calculate_availability(date)
    
    # Cache for 5 minutes
    await cache.setex(f"availability:{date}", 300, json.dumps(availability))
    return availability
```

**Cache invalidation triggers:**
- New booking created → Invalidate date's availability
- Booking cancelled → Invalidate date's availability
- Use pub/sub for distributed cache invalidation

#### 2. In-Memory Caching (Simple)

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=100)
def get_time_slots(date: str) -> list:
    """Cache time slots for each date (static data)."""
    return generate_time_slots(date)

# Clear cache daily
def clear_old_cache():
    get_time_slots.cache_clear()
```

### API Response Optimization

#### 1. Pagination
```python
@router.get("/bookings")
async def list_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    # Always paginate large datasets
    return await service.get_bookings(skip=skip, limit=limit)
```

#### 2. Field Selection
```python
@router.get("/bookings")
async def list_bookings(
    fields: str = Query(None, description="Comma-separated fields to include")
):
    # Return only requested fields
    booking_fields = fields.split(",") if fields else None
    return await service.get_bookings(fields=booking_fields)
```

#### 3. Compression
```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### Frontend Performance

#### 1. Code Splitting
```typescript
// Lazy load admin pages (only load when needed)
const AdminDashboard = dynamic(() => import('./admin/Dashboard'), {
  loading: () => <LoadingSpinner />,
});
```

#### 2. Image Optimization
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/gym-hero.jpg"
  width={800}
  height={400}
  loading="lazy"
  placeholder="blur"
/>
```

#### 3. State Management
```typescript
// Use React Query for server state caching
const { data: bookings, isLoading } = useQuery({
  queryKey: ['bookings'],
  queryFn: fetchBookings,
  staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
});
```

---

## Security Improvements

### Authentication & Authorization

#### 1. Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/login")
@limiter.limit("5/minute")  # Max 5 login attempts per minute
async def login(request: Request, credentials: LoginRequest):
    ...
```

**Recommended limits:**
- Login: 5 attempts/minute, 20 attempts/hour
- Registration: 3 accounts/hour per IP
- Booking creation: 10 bookings/minute
- API general: 100 requests/minute

#### 2. Password Policy

```python
import re

def validate_password(password: str) -> bool:
    """Enforce strong password requirements."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain a number")
    return True
```

#### 3. Token Security Enhancements

```python
# Refresh token rotation
async def refresh_access_token(refresh_token: str):
    # Validate refresh token
    payload = verify_token(refresh_token)
    
    # Issue new tokens (rotate refresh token)
    new_access = create_access_token(payload["sub"])
    new_refresh = create_refresh_token(payload["sub"])
    
    # Invalidate old refresh token
    await invalidate_token(refresh_token)
    
    return new_access, new_refresh
```

### Input Validation & Sanitization

#### 1. SQL Injection Prevention
Already handled by SQLAlchemy ORM, but audit raw queries:

```python
# BAD - Never do this
query = f"SELECT * FROM bookings WHERE id = '{booking_id}'"

# GOOD - Use parameterized queries
query = select(Booking).where(Booking.id == booking_id)
```

#### 2. XSS Prevention

```typescript
// Frontend: Never use dangerouslySetInnerHTML
// Use React's built-in escaping

// If you must render HTML, sanitize first:
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(userInput);
```

#### 3. Request Validation

```python
from pydantic import BaseModel, EmailStr, constr, validator

class BookingCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    
    @validator('start_time')
    def start_time_not_too_far(cls, v):
        if v > datetime.now(timezone.utc) + timedelta(days=365):
            raise ValueError('Cannot book more than 1 year ahead')
        return v
```

### Data Protection

#### 1. Sensitive Data Handling

```python
# Never log sensitive data
logger.info(f"User logged in: {user.email}")  # OK
logger.info(f"Login attempt: {password}")      # NEVER!

# Mask sensitive data in responses
def mask_email(email: str) -> str:
    user, domain = email.split('@')
    return f"{user[:2]}***@{domain}"
```

#### 2. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-domain.com",
        "https://www.your-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

#### 3. Security Headers

```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Force HTTPS in production
if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# Add security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

### Monitoring & Logging

#### 1. Security Audit Logging

```python
async def log_security_event(
    event_type: str,
    user_id: Optional[UUID],
    details: dict,
    ip_address: str,
):
    await db.execute(
        insert(SecurityLog).values(
            event_type=event_type,
            user_id=user_id,
            details=json.dumps(details),
            ip_address=ip_address,
            timestamp=datetime.now(timezone.utc),
        )
    )

# Usage
await log_security_event(
    "LOGIN_FAILED",
    None,
    {"email": email, "reason": "invalid_password"},
    request.client.host,
)
```

#### 2. Anomaly Detection

```python
async def check_suspicious_activity(user_id: UUID) -> bool:
    """Detect potentially malicious behavior."""
    # Check for unusual patterns
    recent_bookings = await get_recent_bookings(user_id, hours=1)
    
    if len(recent_bookings) > 20:
        await log_security_event("SUSPICIOUS_BOOKING_RATE", user_id, {})
        return True
    
    return False
```

---

## Implementation Priority Matrix

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Email Notifications | Medium | High | 1 |
| Rate Limiting | Low | High | 1 |
| Database Indexes | Low | High | 1 |
| Waitlist System | High | High | 2 |
| Redis Caching | Medium | Medium | 2 |
| Profile Management | Medium | Medium | 2 |
| Security Headers | Low | Medium | 2 |
| Mobile App | Very High | High | 3 |
| Calendar Sync | Medium | Medium | 3 |
| Equipment Booking | High | Low | 4 |

---

## Quick Wins (Implement This Week)

1. **Add database indexes** - 30 minutes, significant query improvement
2. **Enable GZIP compression** - 5 minutes, faster API responses
3. **Add rate limiting** - 1 hour, prevent abuse
4. **Security headers** - 30 minutes, better security posture
5. **Add logging** - 1 hour, easier debugging

## Medium-Term (Next Month)

1. Email notifications with SendGrid/Mailgun
2. Redis caching for availability queries
3. Waitlist basic functionality
4. Password reset flow
5. Admin reporting dashboard

## Long-Term (Next Quarter)

1. Mobile app development
2. Calendar integrations
3. Equipment booking module
4. Advanced analytics
5. Multi-location support
