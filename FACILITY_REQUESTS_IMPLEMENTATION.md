# Facility Requests Feature - Implementation Summary

## Overview
This document details the comprehensive facility requests feature that has been added to the Gaelic Gym Booker application. This feature allows members to request special access to facilities, with an admin approval workflow and comprehensive email notifications.

## Date Implemented
March 10, 2026

---

## 1. Database Changes

### New Table: `facility_requests`

**Migration File**: `backend/alembic/versions/d3acf1f6eba2_add_facility_requests_table.py`

**Schema**:
```sql
CREATE TABLE facility_requests (
    id UUID PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id),
    facility_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    purpose TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    INDEX idx_facility_requests_member (member_id),
    INDEX idx_facility_requests_status (status),
    INDEX idx_facility_requests_start_date (start_date)
);
```

**Status Enum**: `PENDING`, `APPROVED`, `REJECTED`

**Facility Types**:
- GYM
- PITCH
- MEETING_ROOM
- TRAINING_FACILITY
- OTHER

### Updated Table: `notifications`

**Migration File**: `backend/alembic/versions/c6d669a195eb_add_facility_request_to_notifications.py`

**Changes**:
- Added new notification types:
  - `FACILITY_REQUEST_SUBMITTED`
  - `FACILITY_REQUEST_APPROVED`
  - `FACILITY_REQUEST_REJECTED`
- Added optional `facility_request_id` foreign key column

---

## 2. Backend Implementation

### Models

#### FacilityRequest Model
**File**: `backend/app/models/facility_request.py`

**Key Features**:
- UUID primary key
- Links to member and user (creator)
- Tracks review status and reviewer
- Supports admin notes
- Timestamps for audit trail

**Relationships**:
- `member`: Many-to-one with Member
- `created_by_user`: Many-to-one with User (creator)
- `reviewed_by_user`: Many-to-one with User (reviewer)
- `notifications`: One-to-many with Notification

#### Updated Notification Model
**File**: `backend/app/models/notification.py`

**Changes**:
- Added `FacilityRequestType` enum
- Added optional `facility_request_id` field
- Added relationship to `FacilityRequest`

### Schemas (Pydantic)

**File**: `backend/app/schemas/facility_request.py`

**Schemas Created**:

1. **FacilityRequestCreate**
   - Input for creating requests
   - Fields: facility_type, start_date, end_date, purpose

2. **FacilityRequestUpdate**
   - Input for updating requests (admin)
   - Fields: status, admin_notes

3. **FacilityRequestResponse**
   - Output for API responses
   - Includes all fields plus member name and reviewer details

4. **FacilityRequestListItem**
   - Simplified response for list views
   - Omits admin_notes for privacy

**Enums**:
- `FacilityRequestStatus`: PENDING, APPROVED, REJECTED
- `FacilityType`: GYM, PITCH, MEETING_ROOM, TRAINING_FACILITY, OTHER

### Services

#### FacilityRequestService
**File**: `backend/app/services/facility_request_service.py`

**Key Methods**:

1. **create_facility_request**
   - Validates member is active
   - Creates request record
   - Sends email confirmation to user
   - Notifies admins via email
   - Creates in-app notification

2. **get_facility_request**
   - Retrieves single request by ID
   - Loads relationships (member, creator, reviewer)

3. **get_member_facility_requests**
   - Lists all requests for a specific member
   - Supports filtering by status

4. **get_all_facility_requests**
   - Admin function to list all requests
   - Supports filtering by status
   - Includes member details

5. **approve_facility_request**
   - Changes status to APPROVED
   - Records reviewer and timestamp
   - Optional admin notes
   - Sends approval email to user
   - Creates in-app notification

6. **reject_facility_request**
   - Changes status to REJECTED
   - Records reviewer and timestamp
   - Optional admin notes (reason)
   - Sends rejection email to user
   - Creates in-app notification

7. **delete_facility_request**
   - Soft delete (changes status)
   - Only allows deletion of PENDING requests
   - Prevents deletion of reviewed requests

#### Email Service
**File**: `backend/app/services/email_service.py`

**Email Functions Implemented**:

1. **send_facility_request_submitted**
   - Confirmation email to user
   - Shows request details
   - Notifies that approval is pending

2. **notify_admins_new_facility_request**
   - Sent to all configured admin emails
   - Shows requester details
   - Request details and purpose

3. **send_facility_request_approved**
   - Success notification to user
   - Shows approved request details
   - Includes approver name

4. **send_facility_request_rejected**
   - Rejection notification to user
   - Shows rejection reason if provided
   - Encourages resubmission if appropriate

5. **send_registration_confirmation**
   - Sent when new user registers
   - Role-specific messaging

6. **notify_admins_new_registration**
   - Notifies admins of new user
   - Shows user details for approval

7. **send_membership_approved**
   - Membership approval notification
   - Welcomes user to system

8. **send_membership_suspended**
   - Notifies user of suspension
   - Explains restrictions

9. **send_membership_reactivated**
   - Welcome back message
   - Confirms restoration of access

**Email Configuration** (in `backend/app/config.py`):
```python
SMTP_HOST: Optional[str]           # SMTP server
SMTP_PORT: int = 587               # Port (587=TLS, 465=SSL)
SMTP_USERNAME: Optional[str]       # Auth username
SMTP_PASSWORD: Optional[str]       # Auth password
SMTP_FROM_EMAIL: Optional[str]     # From address
SMTP_FROM_NAME: str                # From display name
SMTP_USE_TLS: bool = True          # Enable TLS
SMTP_USE_SSL: bool = False         # Enable SSL
ADMIN_EMAILS: str                  # Comma-separated list
```

### API Endpoints

#### Member Endpoints
**File**: `backend/app/routers/facility_requests.py`

**Routes**:

1. **POST /api/v1/facility-requests**
   - Create new facility request
   - Requires: Active member authentication
   - Returns: Created request details

2. **GET /api/v1/facility-requests**
   - List member's facility requests
   - Requires: Member authentication
   - Query params: status (optional filter)

3. **GET /api/v1/facility-requests/{request_id}**
   - Get specific request details
   - Requires: Owner or admin
   - Returns: Full request details

4. **DELETE /api/v1/facility-requests/{request_id}**
   - Delete own facility request
   - Requires: Owner, PENDING status only
   - Returns: Success confirmation

#### Admin Endpoints
**File**: `backend/app/routers/admin.py` (additions)

**Routes**:

5. **GET /api/v1/admin/facility-requests**
   - List all facility requests
   - Requires: Admin authentication
   - Query params: status (optional filter)
   - Returns: All requests with member details

6. **GET /api/v1/admin/facility-requests/{request_id}**
   - View any facility request
   - Requires: Admin authentication
   - Returns: Full request details

7. **PATCH /api/v1/admin/facility-requests/{request_id}/approve**
   - Approve a facility request
   - Requires: Admin authentication
   - Body: { "admin_notes": "optional" }
   - Sends approval email
   - Creates notification

8. **PATCH /api/v1/admin/facility-requests/{request_id}/reject**
   - Reject a facility request
   - Requires: Admin authentication
   - Body: { "admin_notes": "reason" }
   - Sends rejection email
   - Creates notification

9. **DELETE /api/v1/admin/facility-requests/{request_id}**
   - Admin delete any PENDING request
   - Requires: Admin authentication
   - Returns: Success confirmation

### Router Registration

**File**: `backend/app/main.py`

Added to application:
```python
from app.routers import facility_requests

app.include_router(
    facility_requests.router,
    prefix="/api/v1/facility-requests",
    tags=["facility-requests"]
)
```

---

## 3. Configuration Changes

### Email Settings

**File**: `backend/app/config.py`

**New Settings Added**:
- SMTP server configuration (host, port, credentials)
- Email sender information
- TLS/SSL options
- Admin email list for notifications

**Environment Variables Required**:
```bash
# Required for email functionality
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourclub.com
SMTP_FROM_NAME=Gaelic Gym Booker
ADMIN_EMAILS=admin1@club.com,admin2@club.com

# Optional (have defaults)
SMTP_USE_TLS=True
SMTP_USE_SSL=False
```

---

## 4. Key Features

### Request Lifecycle

1. **Creation**
   - Member submits request with facility type, dates, and purpose
   - System validates member is active
   - Creates request in PENDING status
   - Sends confirmation email to member
   - Notifies all admins via email
   - Creates in-app notification

2. **Review (Admin)**
   - Admin views all pending requests
   - Can filter by status (PENDING/APPROVED/REJECTED)
   - Reviews request details and member information
   - Can approve or reject with optional notes

3. **Approval**
   - Status changed to APPROVED
   - Reviewer recorded
   - Timestamp recorded
   - Email sent to member
   - In-app notification created

4. **Rejection**
   - Status changed to REJECTED
   - Reviewer and reason recorded
   - Email sent to member with reason
   - In-app notification created

5. **Deletion**
   - Members can delete their own PENDING requests
   - Admins can delete any PENDING request
   - Approved/Rejected requests cannot be deleted (audit trail)

### Email Notifications

**User Emails**:
- Request submitted confirmation
- Request approved notification
- Request rejected notification
- Registration confirmation
- Membership approved
- Membership suspended
- Membership reactivated

**Admin Emails**:
- New facility request alert
- New user registration alert

**Email Features**:
- Professional HTML templates
- Responsive design
- Clear call-to-action
- Request details included
- Proper error handling
- Fallback to logging if email disabled

### Security & Permissions

**Member Access**:
- Create facility requests (active members only)
- View own requests
- Delete own PENDING requests
- Cannot approve/reject requests
- Cannot view others' requests

**Admin Access**:
- View all facility requests
- Filter by status
- Approve requests
- Reject requests with reason
- Delete PENDING requests
- View admin notes

**Data Validation**:
- Active membership required to create requests
- End date must be after start date
- Only PENDING requests can be deleted
- Only PENDING requests can be approved/rejected
- Request ID and member ID validated

### Audit Trail

**Tracked Information**:
- Request creator (member + user)
- Creation timestamp
- Status changes (PENDING → APPROVED/REJECTED)
- Reviewer identity
- Review timestamp
- Admin notes/reasons
- Update timestamps

**Cannot Be Modified**:
- Original request details (after submission)
- Creator information
- Creation timestamp
- Review history

---

## 5. Testing Recommendations

### Manual Testing Checklist

**Member Workflows**:
- [ ] Register new member account
- [ ] Verify registration email received
- [ ] Admin approves membership
- [ ] Verify approval email received
- [ ] Login as approved member
- [ ] Create facility request
- [ ] Verify submission email received
- [ ] View own facility requests
- [ ] Delete own PENDING request
- [ ] Attempt to delete APPROVED request (should fail)
- [ ] Attempt to view other member's request (should fail)

**Admin Workflows**:
- [ ] Login as admin
- [ ] Verify new request email received
- [ ] View all facility requests
- [ ] Filter by status (PENDING, APPROVED, REJECTED)
- [ ] View request details
- [ ] Approve request with notes
- [ ] Verify approval email sent to member
- [ ] Reject request with reason
- [ ] Verify rejection email sent to member
- [ ] Delete PENDING request
- [ ] Attempt to approve APPROVED request (should fail)

**Email Functionality**:
- [ ] Configure SMTP settings in environment
- [ ] Verify email service initializes successfully
- [ ] Test all email notification types
- [ ] Verify emails have correct formatting
- [ ] Test with missing SMTP config (should log warning)
- [ ] Verify admin email distribution list works

**Error Handling**:
- [ ] Create request as suspended member (should fail)
- [ ] Create request with end_date before start_date (should fail)
- [ ] Approve already approved request (should fail)
- [ ] Delete approved request (should fail)
- [ ] Access request without permission (should fail)

### Automated Testing (Recommended)

**Unit Tests** (create in `backend/tests/`):
```python
# test_facility_request_service.py
- test_create_facility_request_success
- test_create_facility_request_inactive_member
- test_create_facility_request_invalid_dates
- test_approve_facility_request
- test_reject_facility_request
- test_approve_already_approved
- test_delete_pending_request
- test_delete_approved_request_fails

# test_facility_request_routes.py
- test_create_request_authenticated
- test_create_request_unauthenticated
- test_get_own_requests
- test_cannot_get_others_requests
- test_admin_get_all_requests
- test_admin_approve_request
- test_admin_reject_request

# test_email_service.py
- test_email_service_initialization
- test_send_facility_request_submitted
- test_send_facility_request_approved
- test_send_facility_request_rejected
- test_notify_admins_new_facility_request
- test_email_disabled_graceful_failure
```

---

## 6. Files Changed/Created

### New Files

**Models**:
- `backend/app/models/facility_request.py`

**Schemas**:
- `backend/app/schemas/facility_request.py`

**Services**:
- `backend/app/services/facility_request_service.py`
- `backend/app/services/email_service.py`

**Routers**:
- `backend/app/routers/facility_requests.py`

**Migrations**:
- `backend/alembic/versions/d3acf1f6eba2_add_facility_requests_table.py`
- `backend/alembic/versions/c6d669a195eb_add_facility_request_to_notifications.py`

### Modified Files

**Configuration**:
- `backend/app/config.py` - Added SMTP and email settings

**Models**:
- `backend/app/models/member.py` - Added facility_requests relationship
- `backend/app/models/notification.py` - Added facility request notification types

**Routers**:
- `backend/app/routers/admin.py` - Added email notifications to approval/suspension endpoints
- `backend/app/main.py` - Registered facility_requests router

**Services**:
- `backend/app/services/auth_service.py` - Integrated email notifications for registration

---

## 7. API Documentation

### Request Examples

#### Create Facility Request
```http
POST /api/v1/facility-requests
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "facility_type": "PITCH",
  "start_date": "2026-04-15T09:00:00Z",
  "end_date": "2026-04-15T17:00:00Z",
  "purpose": "Team training session for under-16s"
}

Response 201:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "member_id": "456e7890-e89b-12d3-a456-426614174111",
  "member_name": "John Doe",
  "facility_type": "PITCH",
  "start_date": "2026-04-15T09:00:00Z",
  "end_date": "2026-04-15T17:00:00Z",
  "purpose": "Team training session for under-16s",
  "status": "PENDING",
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

#### List Member's Requests
```http
GET /api/v1/facility-requests?status=PENDING
Authorization: Bearer <access_token>

Response 200:
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "facility_type": "PITCH",
    "start_date": "2026-04-15T09:00:00Z",
    "end_date": "2026-04-15T17:00:00Z",
    "purpose": "Team training session",
    "status": "PENDING",
    "created_at": "2026-03-10T14:30:00Z"
  }
]
```

#### Admin Approve Request
```http
PATCH /api/v1/admin/facility-requests/{request_id}/approve
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "admin_notes": "Approved for the specified date. Please ensure cleanup after use."
}

Response 200:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "APPROVED",
  "reviewed_by": "789e0123-e89b-12d3-a456-426614174222",
  "reviewed_by_name": "Admin User",
  "reviewed_at": "2026-03-11T10:00:00Z",
  "admin_notes": "Approved for the specified date. Please ensure cleanup after use.",
  "message": "Facility request approved successfully"
}
```

#### Admin Reject Request
```http
PATCH /api/v1/admin/facility-requests/{request_id}/reject
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "admin_notes": "Pitch already booked for this date. Please choose another time slot."
}

Response 200:
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "REJECTED",
  "reviewed_by": "789e0123-e89b-12d3-a456-426614174222",
  "reviewed_by_name": "Admin User",
  "reviewed_at": "2026-03-11T10:00:00Z",
  "admin_notes": "Pitch already booked for this date. Please choose another time slot.",
  "message": "Facility request rejected"
}
```

---

## 8. Deployment Checklist

### Environment Setup

1. **Database Migration**
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Environment Variables**
   Add to `.env` or Replit Secrets:
   ```bash
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM_EMAIL=noreply@yourclub.com
   SMTP_FROM_NAME=Gaelic Gym Booker
   ADMIN_EMAILS=admin1@club.com,admin2@club.com
   ```

3. **Gmail App Password Setup** (if using Gmail)
   - Enable 2-factor authentication
   - Generate app-specific password
   - Use app password as SMTP_PASSWORD

4. **Test Email Service**
   - Restart application
   - Check logs for "Email service initialized successfully"
   - If disabled, verify SMTP settings

5. **Verify Dependencies**
   Ensure `fastapi-mail` is installed:
   ```bash
   pip install fastapi-mail
   ```

### Verification Steps

1. Backend running without errors
2. Email service initialized (check logs)
3. Database migrations applied successfully
4. API endpoints accessible at `/api/v1/facility-requests`
5. Admin endpoints accessible at `/api/v1/admin/facility-requests`
6. Test email delivery with new registration

---

## 9. Future Enhancements (Recommendations)

### Backend
- [ ] Add pagination to facility requests list
- [ ] Add date range filtering for admin
- [ ] Add facility request calendar view
- [ ] Implement request modification (before approval)
- [ ] Add bulk approve/reject functionality
- [ ] Add request templates for common purposes
- [ ] Implement automatic conflict detection
- [ ] Add request priority levels
- [ ] Add request attachment support (documents, images)

### Email
- [ ] Add email templates customization
- [ ] Implement email queue for reliability
- [ ] Add email delivery status tracking
- [ ] Support multiple languages
- [ ] Add email preferences for users
- [ ] Implement digest emails for admins

### Notifications
- [ ] Add push notifications
- [ ] Add SMS notifications (optional)
- [ ] Add notification preferences
- [ ] Add notification batching
- [ ] Add real-time notifications (WebSocket)

### Analytics
- [ ] Track request approval rates
- [ ] Monitor popular facility types
- [ ] Track request response times
- [ ] Generate admin reports
- [ ] Add dashboard widgets

---

## 10. Support and Troubleshooting

### Common Issues

**Email Not Sending**:
1. Check SMTP credentials in environment
2. Verify SMTP_HOST and SMTP_PORT are correct
3. Check firewall/network allows SMTP
4. Review application logs for detailed errors
5. Test with simple email client first

**Request Creation Fails**:
1. Verify member is ACTIVE status
2. Check date format (ISO 8601)
3. Ensure end_date > start_date
4. Verify authentication token is valid

**Admin Cannot See Requests**:
1. Verify user has ADMIN role
2. Check database for requests
3. Review API response for errors
4. Check browser console for errors

### Logging

Email and request operations are logged:
```python
# Email service logs
logger.info("Email sent successfully to {recipients}: {subject}")
logger.warning("Email service disabled. Would have sent: {subject}")
logger.error("Failed to send email to {to_email}: {error}")

# Request service logs
logger.info("Facility request created: {request_id} by member {member_id}")
logger.info("Facility request {request_id} approved by admin {admin_id}")
logger.info("Facility request {request_id} rejected by admin {admin_id}")
```

---

## 11. Summary

This implementation adds a complete facility request management system to the Gaelic Gym Booker application with the following capabilities:

**For Members**:
- Submit facility requests with detailed purpose
- Track request status (PENDING/APPROVED/REJECTED)
- Receive email notifications
- View request history
- Delete pending requests

**For Admins**:
- View all facility requests
- Filter by status
- Approve/reject with notes
- Email notifications for new requests
- Full audit trail

**System Features**:
- Comprehensive email notification system
- In-app notifications
- Database audit trail
- Secure API endpoints
- Role-based access control
- Graceful error handling

The feature is production-ready and follows all existing code patterns and best practices in the application.

---

**Implementation Completed**: March 10, 2026
**Documented By**: Development Team
**Version**: 1.0.0
