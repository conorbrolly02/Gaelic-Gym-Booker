#!/bin/bash
# Quick Test Commands for Pitch Booking API
# Run these commands after logging in and saving cookies

# CONFIGURATION
API_URL="http://localhost:8000/api/v1"
PITCH_ID="ff302317-1c3b-4cd5-88d3-25ecb10b6a05"  # Update with actual Main Pitch ID
DATE="2026-02-26"  # Update with tomorrow's date

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  Pitch Booking API - Quick Tests"
echo "========================================"
echo

# 1. LOGIN (Save cookies)
echo "${YELLOW}1. Login (Update email/password)${NC}"
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
echo
echo

# 2. LIST PITCHES
echo "${YELLOW}2. List All Pitches${NC}"
curl -s -b cookies.txt "$API_URL/pitches" | jq .
echo
echo

# 3. GET AVAILABILITY
echo "${YELLOW}3. Get Availability for $DATE${NC}"
curl -s -b cookies.txt "$API_URL/pitches/$PITCH_ID/availability?date=$DATE" | jq .
echo
echo

# 4. CREATE WHOLE BOOKING
echo "${YELLOW}4. Book Whole Pitch (17:00-18:00)${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T17:00:00+00:00\",
    \"end\": \"${DATE}T18:00:00+00:00\",
    \"title\": \"Full Pitch Training\",
    \"requester_name\": \"John Smith\",
    \"team_name\": \"Gaelic Warriors\",
    \"notes\": \"Please set up goals\",
    \"area\": \"whole\"
  }" | jq .
echo
echo

# 5. BOOK HALF-LEFT
echo "${YELLOW}5. Book Half-Left (18:00-19:00)${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T18:00:00+00:00\",
    \"end\": \"${DATE}T19:00:00+00:00\",
    \"title\": \"Left Side Practice\",
    \"requester_name\": \"Jane Doe\",
    \"area\": \"half-left\"
  }" | jq .
echo
echo

# 6. BOOK HALF-RIGHT (Same time - should succeed)
echo "${YELLOW}6. Book Half-Right (18:00-19:00) - Should Succeed${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T18:00:00+00:00\",
    \"end\": \"${DATE}T19:00:00+00:00\",
    \"title\": \"Right Side Practice\",
    \"requester_name\": \"Bob Wilson\",
    \"area\": \"half-right\"
  }" | jq .
echo
echo

# 7. TEST CONFLICT
echo "${YELLOW}7. Try Conflicting Booking - Should Fail (409)${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T17:00:00+00:00\",
    \"end\": \"${DATE}T18:00:00+00:00\",
    \"title\": \"Should Fail\",
    \"requester_name\": \"Test User\",
    \"area\": \"quarter-tl\"
  }" | jq .
echo
echo

# 8. BOOK QUARTERS
echo "${YELLOW}8. Book Quarter TL (19:00-20:00)${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T19:00:00+00:00\",
    \"end\": \"${DATE}T20:00:00+00:00\",
    \"title\": \"Quarter Training TL\",
    \"requester_name\": \"Alice Brown\",
    \"area\": \"quarter-tl\"
  }" | jq .
echo
echo

echo "${YELLOW}9. Book Quarter TR (19:00-20:00) - Should Succeed${NC}"
curl -s -b cookies.txt -X POST "$API_URL/pitches/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"pitch_id\": \"$PITCH_ID\",
    \"start\": \"${DATE}T19:00:00+00:00\",
    \"end\": \"${DATE}T20:00:00+00:00\",
    \"title\": \"Quarter Training TR\",
    \"requester_name\": \"Charlie Davis\",
    \"area\": \"quarter-tr\"
  }" | jq .
echo
echo

# 10. FINAL AVAILABILITY CHECK
echo "${YELLOW}10. Final Availability Check${NC}"
curl -s -b cookies.txt "$API_URL/pitches/$PITCH_ID/availability?date=$DATE" | jq .
echo
echo

echo "${GREEN}========================================"
echo "  All Tests Complete!"
echo "========================================${NC}"
echo
echo "Expected Results:"
echo "  - 17:00-18:00: Status 'booked' (whole)"
echo "  - 18:00-19:00: Status 'booked' (both halves)"
echo "  - 19:00-20:00: Status 'partial' (2 quarters)"
echo "  - 20:00-22:00: Status 'free'"
