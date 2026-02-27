# Pitch Booking - Manual Test Guide

## 📋 Pre-Test Setup

### 1. Start Servers

**Backend:**
```bash
cd C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker\frontend
npm run dev
```

### 2. Verify Backend Health

```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

---

## 🧪 Test Checklist

### ✅ Step 1: Verify Pitches Exist

**Test:** List all available pitches

```bash
curl -X GET "http://localhost:8000/api/v1/pitches" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "name": "Main Pitch",
    "surface": null,
    "location": null,
    "type": "PITCH",
    "capacity": 1,
    "buffer_mins": 0,
    "is_active": true
  },
  {
    "id": "67146e16-28ed-49fb-8bd6-a626348106cd",
    "name": "Minor Pitch",
    "surface": null,
    "location": null,
    "type": "PITCH",
    "capacity": 1,
    "buffer_mins": 0,
    "is_active": true
  }
]
```

**✅ Success Criteria:**
- Returns 2 pitches: "Main Pitch" and "Minor Pitch"
- Both have `is_active: true`

**❌ If Pitches Missing:**
```bash
cd backend
python seed_pitches.py
```

**⚠️ Note:** You must be logged in (have a valid `access_token` cookie). See "Authentication Setup" below.

---

### ✅ Step 2: Check Availability (All Slots Free)

**Test:** Get availability for tomorrow

```bash
# Replace PITCH_ID with actual UUID from Step 1
# Replace DATE with tomorrow's date in YYYY-MM-DD format

curl -X GET "http://localhost:8000/api/v1/pitches/ff302317-1c3b-4cd5-88d3-25ecb10b6a05/availability?date=2026-02-26" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

**Expected Response (200 OK):**
```json
{
  "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
  "date": "2026-02-26",
  "slots": [
    {
      "start": "2026-02-26T17:00:00Z",
      "end": "2026-02-26T18:00:00Z",
      "status": "free",
      "booked_areas": null
    },
    {
      "start": "2026-02-26T18:00:00Z",
      "end": "2026-02-26T19:00:00Z",
      "status": "free",
      "booked_areas": null
    },
    {
      "start": "2026-02-26T19:00:00Z",
      "end": "2026-02-26T20:00:00Z",
      "status": "free",
      "booked_areas": null
    },
    {
      "start": "2026-02-26T20:00:00Z",
      "end": "2026-02-26T21:00:00Z",
      "status": "free",
      "booked_areas": null
    },
    {
      "start": "2026-02-26T21:00:00Z",
      "end": "2026-02-26T22:00:00Z",
      "status": "free",
      "booked_areas": null
    }
  ]
}
```

**✅ Success Criteria:**
- Returns 5 slots (17:00-22:00, configured as PITCH_OPEN_TIME to PITCH_CLOSE_TIME)
- All slots have `status: "free"`
- All `booked_areas` are `null`

**📝 Timezone Notes:**
- Times are returned in **UTC** (Z suffix)
- Configuration uses **Europe/London** timezone
- Slots are generated in local time (17:00-22:00 UK time) then converted to UTC
- During BST (British Summer Time, Mar-Oct): 17:00 UK = 16:00 UTC
- During GMT (Nov-Feb): 17:00 UK = 17:00 UTC

---

### ✅ Step 3: Create Booking (Whole Pitch)

**Test:** Book the entire pitch for the first slot

```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T17:00:00+00:00",
    "end": "2026-02-26T18:00:00+00:00",
    "title": "Team Training Session",
    "requester_name": "John Smith",
    "team_name": "Gaelic Warriors",
    "notes": "Full pitch training",
    "area": "whole"
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": "NEW_BOOKING_UUID",
  "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
  "start": "2026-02-26T17:00:00+00:00",
  "end": "2026-02-26T18:00:00+00:00",
  "title": "Team Training Session",
  "requester_name": "John Smith",
  "team_name": "Gaelic Warriors",
  "notes": "Full pitch training",
  "area": "whole",
  "created_at": "2026-02-25T17:30:00+00:00",
  "member_id": "YOUR_MEMBER_UUID",
  "status": "CONFIRMED"
}
```

**✅ Success Criteria:**
- Returns `201 Created` status
- Response includes all submitted fields
- `status` is `"CONFIRMED"`

**Now re-check availability:**

```bash
curl -X GET "http://localhost:8000/api/v1/pitches/ff302317-1c3b-4cd5-88d3-25ecb10b6a05/availability?date=2026-02-26" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

**Expected Change:**
```json
{
  "start": "2026-02-26T17:00:00Z",
  "end": "2026-02-26T18:00:00Z",
  "status": "booked",
  "booked_areas": ["whole"]
}
```

**✅ Success Criteria:**
- 17:00-18:00 slot now shows `status: "booked"`
- `booked_areas: ["whole"]`

---

### ✅ Step 4: Create Partial Booking (Different Halves)

**Test:** Book left half, then right half (same time slot)

**Book Left Half:**
```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T18:00:00+00:00",
    "end": "2026-02-26T19:00:00+00:00",
    "title": "Left Side Practice",
    "requester_name": "Jane Doe",
    "area": "half-left"
  }'
```

**Expected:** `201 Created`

**Check Availability (After Left Half Booked):**
```bash
curl -X GET "http://localhost:8000/api/v1/pitches/ff302317-1c3b-4cd5-88d3-25ecb10b6a05/availability?date=2026-02-26" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

**Expected 18:00-19:00 Slot:**
```json
{
  "start": "2026-02-26T18:00:00Z",
  "end": "2026-02-26T19:00:00Z",
  "status": "partial",
  "booked_areas": ["half-left"]
}
```

**✅ Success Criteria:**
- Status is `"partial"` (not fully booked)
- `booked_areas` shows `["half-left"]`

**Now Book Right Half (Same Time):**
```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T18:00:00+00:00",
    "end": "2026-02-26T19:00:00+00:00",
    "title": "Right Side Practice",
    "requester_name": "Bob Wilson",
    "area": "half-right"
  }'
```

**Expected:** `201 Created` (No conflict because opposite halves)

**Check Availability Again:**
```json
{
  "start": "2026-02-26T18:00:00Z",
  "end": "2026-02-26T19:00:00Z",
  "status": "booked",
  "booked_areas": ["half-left", "half-right"]
}
```

**✅ Success Criteria:**
- Both halves booked → Status changes to `"booked"`
- `booked_areas` contains both halves

---

### ✅ Step 5: Test Quarter Bookings (Non-Conflicting)

**Test:** Book opposite quarters (should succeed)

**Book Top-Left Quarter:**
```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T19:00:00+00:00",
    "end": "2026-02-26T20:00:00+00:00",
    "title": "Quarter Training TL",
    "requester_name": "Alice Brown",
    "area": "quarter-tl"
  }'
```

**Expected:** `201 Created`

**Book Top-Right Quarter (Same Time):**
```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T19:00:00+00:00",
    "end": "2026-02-26T20:00:00+00:00",
    "title": "Quarter Training TR",
    "requester_name": "Charlie Davis",
    "area": "quarter-tr"
  }'
```

**Expected:** `201 Created` (Opposite quarters, no conflict)

**Check Availability:**
```json
{
  "start": "2026-02-26T19:00:00Z",
  "end": "2026-02-26T20:00:00Z",
  "status": "partial",
  "booked_areas": ["quarter-tl", "quarter-tr"]
}
```

**✅ Success Criteria:**
- Status is `"partial"` (only 2 of 4 quarters booked)
- Both quarters shown in `booked_areas`

---

### ✅ Step 6: Test Conflict Detection

**Test 6a: Quarter Conflicts with Whole**

Try to book any quarter in the 17:00-18:00 slot (already has "whole" booked):

```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T17:00:00+00:00",
    "end": "2026-02-26T18:00:00+00:00",
    "title": "Should Fail",
    "requester_name": "Test User",
    "area": "quarter-tl"
  }'
```

**Expected Response (409 Conflict):**
```json
{
  "detail": "Area 'quarter-tl' conflicts with existing booking (area: whole, time: 2026-02-26 17:00:00+00:00 - 2026-02-26 18:00:00+00:00)"
}
```

**✅ Success Criteria:**
- Returns `409 Conflict` status
- Error message explains the conflict

---

**Test 6b: Quarter Conflicts with Its Half**

Try to book a quarter that's already covered by a half booking:

```bash
# half-left was booked for 18:00-19:00
# Try to book quarter-tl (which is part of half-left)

curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T18:00:00+00:00",
    "end": "2026-02-26T19:00:00+00:00",
    "title": "Should Fail",
    "requester_name": "Test User",
    "area": "quarter-tl"
  }'
```

**Expected:** `409 Conflict`

**✅ Success Criteria:**
- Booking fails with conflict error
- Mentions "half-left" in error message

---

**Test 6c: Same Quarter Conflicts**

Try to book the same quarter twice:

```bash
# quarter-tl was booked for 19:00-20:00
# Try to book it again

curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T19:00:00+00:00",
    "end": "2026-02-26T20:00:00+00:00",
    "title": "Should Fail",
    "requester_name": "Test User",
    "area": "quarter-tl"
  }'
```

**Expected:** `409 Conflict`

---

**Test 6d: Half Conflicts with Quarter in Same Half**

Try to book half-left when quarter-tl is already booked:

```bash
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T19:00:00+00:00",
    "end": "2026-02-26T20:00:00+00:00",
    "title": "Should Fail",
    "requester_name": "Test User",
    "area": "half-left"
  }'
```

**Expected:** `409 Conflict`

---

### ✅ Step 7: Test All 4 Quarters = Booked

**Test:** Book all 4 quarters for a slot

```bash
# Book quarter-bl (19:00-20:00)
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T19:00:00+00:00",
    "end": "2026-02-26T20:00:00+00:00",
    "title": "Quarter Training BL",
    "requester_name": "Eve Foster",
    "area": "quarter-bl"
  }'

# Book quarter-br (19:00-20:00)
curl -X POST "http://localhost:8000/api/v1/pitches/bookings" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -d '{
    "pitch_id": "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
    "start": "2026-02-26T19:00:00+00:00",
    "end": "2026-02-26T20:00:00+00:00",
    "title": "Quarter Training BR",
    "requester_name": "Frank Green",
    "area": "quarter-br"
  }'
```

**Check Availability:**
```json
{
  "start": "2026-02-26T19:00:00Z",
  "end": "2026-02-26T20:00:00Z",
  "status": "booked",
  "booked_areas": ["quarter-bl", "quarter-br", "quarter-tl", "quarter-tr"]
}
```

**✅ Success Criteria:**
- All 4 quarters booked → Status becomes `"booked"`
- All quarters listed in `booked_areas`

---

## 🌐 Frontend UI Testing

### Navigate to Pitch Booking Pages

1. **Login to Application:**
   - Go to `http://localhost:5000/login`
   - Login with active member credentials

2. **View Pitches:**
   - Navigate to pitches section (once implemented in frontend)
   - Should see "Main Pitch" and "Minor Pitch"

3. **Select Pitch:**
   - Click on "Main Pitch"
   - Should see availability calendar/grid

4. **Select Area (SVG Interaction):**
   - Visual pitch diagram with clickable areas:
     - Click entire pitch for "whole"
     - Click left/right half for "half-left"/"half-right"
     - Click quarters for specific quarter selection

5. **Select Time Slot:**
   - See slots 17:00-22:00
   - Free slots shown in green
   - Partial slots shown in yellow/orange
   - Booked slots shown in red/gray (disabled)

6. **Create Booking:**
   - Click free/partial slot
   - Modal opens with booking form
   - Fill in: title, requester name, team name (optional), notes (optional)
   - Area pre-selected from SVG click
   - Click "Confirm Booking"
   - Success message shown
   - Availability grid refreshes showing updated status

7. **View Booking Conflicts:**
   - Try to select a conflicting area/time
   - Should show error message: "This area is already booked for this time"
   - Booking button disabled for conflicting combinations

---

## 📊 Interpreting Status Values

### Status: "free"
- **Meaning:** No bookings exist for this time slot
- **Available Areas:** All areas (whole, both halves, all quarters)
- **Visual:** Green/Available

### Status: "partial"
- **Meaning:** Some areas booked but not entire pitch
- **Examples:**
  - 1 half booked → Other half still available
  - 1-3 quarters booked → Remaining quarters available
  - Opposite halves available for quarter bookings
- **Visual:** Yellow/Orange/Partially Available
- **Check:** `booked_areas` array shows which areas are taken

### Status: "booked"
- **Meaning:** Entire pitch unavailable
- **Conditions:**
  - `"whole"` area is booked, OR
  - Both `"half-left"` AND `"half-right"` are booked, OR
  - All 4 quarters are booked
- **Visual:** Red/Gray/Unavailable

---

## ⏰ Timezone Handling

### Configuration
- **Server Timezone:** UTC (for storage)
- **Display Timezone:** Europe/London (configured in `settings.TIMEZONE`)
- **Slot Times:** 17:00-22:00 UK local time

### Time Conversions

**During GMT (November - March):**
- 17:00 UK = 17:00 UTC
- Slot: `"2026-02-26T17:00:00Z"`

**During BST (March - October):**
- 17:00 UK = 16:00 UTC
- Slot: `"2026-07-15T16:00:00Z"`

### API Request Times
Always send **timezone-aware datetimes** in UTC:
```json
{
  "start": "2026-02-26T17:00:00+00:00",
  "end": "2026-02-26T18:00:00+00:00"
}
```

Or in ISO format with Z suffix:
```json
{
  "start": "2026-02-26T17:00:00Z",
  "end": "2026-02-26T18:00:00Z"
}
```

### Frontend Display
- Convert UTC times to local browser timezone for display
- Use libraries like `date-fns` or `dayjs` with timezone support
- Example:
  ```javascript
  const utcTime = "2026-02-26T17:00:00Z";
  const localTime = new Date(utcTime).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit'
  });
  // Displays: "17:00"
  ```

---

## 🔐 Authentication Setup

To test the API endpoints, you need a valid authentication token.

### Get Access Token (Login)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "your.email@example.com",
    "password": "your_password"
  }'
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "USER_UUID",
    "email": "your.email@example.com",
    "role": "MEMBER"
  },
  "member": {
    "id": "MEMBER_UUID",
    "membership_status": "ACTIVE"
  }
}
```

The `access_token` is stored in the `cookies.txt` file.

### Use Token in Subsequent Requests

**Option 1: Use cookies file**
```bash
curl -X GET "http://localhost:8000/api/v1/pitches" \
  -b cookies.txt
```

**Option 2: Extract and use manually**
```bash
# Extract token from cookies.txt
# Then use it in requests:
curl -X GET "http://localhost:8000/api/v1/pitches" \
  -H "Cookie: access_token=YOUR_TOKEN_VALUE"
```

---

## 📝 Summary of Conflict Rules

| Booking A | Booking B | Conflict? | Reason |
|-----------|-----------|-----------|---------|
| whole | anything | ✅ YES | Whole covers entire pitch |
| half-left | half-right | ❌ NO | Opposite halves |
| half-left | quarter-tl | ✅ YES | Quarter is within half |
| half-left | quarter-tr | ❌ NO | Quarter is in opposite half |
| quarter-tl | quarter-tr | ❌ NO | Different quarters, opposite sides |
| quarter-tl | quarter-bl | ❌ NO | Different quarters, same side but different rows |
| quarter-tl | quarter-tl | ✅ YES | Same quarter |
| quarter-tl | half-left | ✅ YES | Half contains this quarter |

---

## 🎯 Quick Test Script

Save this as `test_pitch_booking.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:8000/api/v1"
PITCH_ID="ff302317-1c3b-4cd5-88d3-25ecb10b6a05"
DATE="2026-02-26"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Pitch Booking API Tests ==="
echo

# Test 1: List Pitches
echo "${YELLOW}Test 1: List Pitches${NC}"
curl -s -b cookies.txt "$API_URL/pitches" | jq .
echo

# Test 2: Get Availability
echo "${YELLOW}Test 2: Get Availability${NC}"
curl -s -b cookies.txt "$API_URL/pitches/$PITCH_ID/availability?date=$DATE" | jq .
echo

# Test 3: Create Whole Booking
echo "${YELLOW}Test 3: Create Whole Booking${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T17:00:00+00:00\",
    \"end\": \"${DATE}T18:00:00+00:00\",
    \"title\": \"Test Whole Booking\",
    \"requester_name\": \"Test User\",
    \"area\": \"whole\"
  }" | jq .
echo

# Test 4: Verify Booked Status
echo "${YELLOW}Test 4: Verify Booked Status${NC}"
curl -s -b cookies.txt "$API_URL/pitches/$PITCH_ID/availability?date=$DATE" | jq '.slots[0]'
echo

echo "${GREEN}Tests Complete!${NC}"
```

**Run:**
```bash
chmod +x test_pitch_booking.sh
./test_pitch_booking.sh
```

---

## ✅ Complete Test Checklist

- [ ] Backend and Frontend servers running
- [ ] Login successful, cookies saved
- [ ] GET /api/v1/pitches returns 2 pitches
- [ ] GET availability shows all "free" initially
- [ ] POST whole booking succeeds (201)
- [ ] Availability shows slot as "booked"
- [ ] POST half-left succeeds (201)
- [ ] Availability shows "partial" status
- [ ] POST half-right succeeds (201)
- [ ] Availability shows "booked" (both halves)
- [ ] POST opposite quarters succeed (201 each)
- [ ] Availability shows "partial" (2 of 4 quarters)
- [ ] POST conflicting quarter fails (409)
- [ ] POST all 4 quarters changes status to "booked"
- [ ] Frontend displays pitch selection UI
- [ ] SVG area selection works
- [ ] Booking creation via UI succeeds
- [ ] Availability updates in real-time
- [ ] Conflict errors shown in UI

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution:** Login first and save cookies:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"your@email.com","password":"password"}'
```

### Issue: 404 Not Found on /api/v1/pitches
**Solution:** Backend needs restart to load new router:
```bash
# Stop backend (Ctrl+C)
# Restart:
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Issue: Validation Error on datetime
**Solution:** Ensure timezone-aware datetime with `+00:00` or `Z` suffix:
```json
"start": "2026-02-26T17:00:00+00:00"  ✅ Correct
"start": "2026-02-26T17:00:00"        ❌ Wrong (no timezone)
```

### Issue: No pitches returned
**Solution:** Run seed script:
```bash
cd backend
python seed_pitches.py
```

---

## 📚 Additional Resources

- **API Documentation:** http://localhost:8000/docs
- **Frontend:** http://localhost:5000
- **Database Inspection:** Use SQLite browser to view `backend/gym_booking.db`
- **Logs:** Check terminal output for both backend and frontend for errors

---

**Happy Testing! 🎉**
