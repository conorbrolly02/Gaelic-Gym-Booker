"use client";

/**
 * Member Dashboard Page
 * =============================================================================
 * WHAT'S NEW:
 *  - Two booking panels: "Upcoming" and "Past".
 *  - DESKTOP: click tabs to switch panel.
 *  - MOBILE: tap tabs OR swipe left/right to switch panels.
 *  - Upcoming = end_time >= now; Past = end_time < now.
 *  - Sorting: Upcoming by start_time ASC; Past by start_time DESC.
 *
 * STRUCTURE:
 *  1) Welcome header
 *  2) Quick actions (unchanged)
 *  3) Bookings Tabs + Panels (NEW)
 *
 * API NOTES:
 *  - This calls:
 *      bookingApi.getBookings({ upcoming: true })
 *      bookingApi.getBookings({ past: true })  // <-- ensure your API supports this
 *    If your API doesn’t support `{ past: true }`, you can:
 *      a) expose a `getBookings({ mine: true })` endpoint and filter client-side, or
 *      b) add a `/api/bookings/me?range=past` route.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { bookingApi, pitchApi, clubhouseApi } from "@/lib/api";
import { Booking } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function DashboardPage() {
  const { member, isAdmin, isCoach } = useAuth();
  const router = useRouter();

  // -------------------------------- STATE -----------------------------------
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingPast, setLoadingPast] = useState(true);
  const [errorUpcoming, setErrorUpcoming] = useState<string | null>(null);
  const [errorPast, setErrorPast] = useState<string | null>(null);

  // Active tab: "upcoming" or "past"
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");

  // Facility selection modal
  const [showFacilityModal, setShowFacilityModal] = useState(false);

  // ------------------------------- HELPERS -----------------------------------
  /**
   * Group clubhouse bookings that were created together (multi-room bookings).
   * Bookings with same start_time, end_time, and member_id are merged into one,
   * combining room names with " + " separator.
   */
  const groupClubhouseBookings = useCallback((bookings: Booking[]): Booking[] => {
    const grouped: { [key: string]: Booking } = {};

    bookings.forEach(booking => {
      // Only group clubhouse bookings (those with changing rooms, committee room, etc.)
      const isClubhouseBooking = booking.resource_name &&
        (booking.resource_name.toLowerCase().includes('changing room') ||
         booking.resource_name.toLowerCase().includes('committee room') ||
         booking.resource_name.toLowerCase().includes('kitchen'));

      if (isClubhouseBooking) {
        // Create unique key for bookings that should be grouped together
        const groupKey = `${booking.member_id}_${booking.start_time}_${booking.end_time}`;

        if (grouped[groupKey]) {
          // Merge room names - but avoid duplicates
          const existingRooms = grouped[groupKey].resource_name?.split(' + ') || [];
          const newRoom = booking.resource_name || '';

          // Only add if this room isn't already in the list
          if (!existingRooms.includes(newRoom)) {
            grouped[groupKey].resource_name = `${grouped[groupKey].resource_name} + ${newRoom}`;
          }
        } else {
          // First booking in this group - clone it
          grouped[groupKey] = { ...booking };
        }
      } else {
        // Non-clubhouse bookings - keep as-is with unique key
        const uniqueKey = `${booking.id}`;
        grouped[uniqueKey] = booking;
      }
    });

    return Object.values(grouped);
  }, []);

  // ------------------------------- DATA FETCH --------------------------------
  const fetchUpcoming = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      setErrorUpcoming(null);

      // Fetch all types of bookings: gym, pitch, and clubhouse
      const [gymBookings, pitchBookings, clubhouseBookings] = await Promise.all([
        bookingApi.getBookings({}).catch(() => []),
        pitchApi.getMemberPitchBookings({ upcoming: true }).catch(() => []),
        clubhouseApi.getMemberBookings({ upcoming_only: true }).catch(() => []),
      ]);

      // Normalize pitch bookings to match Booking type (start -> start_time, end -> end_time)
      const normalizedPitchBookings = pitchBookings.map((b: any) => ({
        ...b,
        start_time: b.start || b.start_time,
        end_time: b.end || b.end_time,
      }));

      // Normalize clubhouse bookings to match Booking type
      const normalizedClubhouseBookings = clubhouseBookings.map((b: any) => ({
        ...b,
        start_time: b.start_time || b.start,
        end_time: b.end_time || b.end,
      }));

      // Combine all bookings
      const allBookings = [...gymBookings, ...normalizedPitchBookings, ...normalizedClubhouseBookings];

      // Group clubhouse multi-room bookings to prevent duplication
      const groupedBookings = groupClubhouseBookings(allBookings);

      // Filter for upcoming only (start_time >= now OR currently in progress)
      const now = Date.now();
      const upcoming = groupedBookings.filter(b => {
        const startTime = new Date(b.start_time).getTime();
        const endTime = new Date(b.end_time).getTime();
        // Show if hasn't started yet, OR if currently in progress
        return startTime >= now || (startTime < now && endTime >= now);
      });

      // Sort: soonest first by start_time
      const sorted = upcoming.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setUpcoming(sorted);
    } catch (err: any) {
      setErrorUpcoming(err?.message ?? "Failed to load upcoming bookings");
    } finally {
      setLoadingUpcoming(false);
    }
  }, [groupClubhouseBookings]);

  const fetchPast = useCallback(async () => {
    try {
      setLoadingPast(true);
      setErrorPast(null);

      // Fetch all types of bookings: gym, pitch, and clubhouse
      const [gymBookings, pitchBookings, clubhouseBookings] = await Promise.all([
        bookingApi.getBookings({}).catch(() => []),
        pitchApi.getMemberPitchBookings({ past: true }).catch(() => []),
        clubhouseApi.getMemberBookings({}).catch(() => []),
      ]);

      // Normalize pitch bookings to match Booking type (start -> start_time, end -> end_time)
      const normalizedPitchBookings = pitchBookings.map((b: any) => ({
        ...b,
        start_time: b.start || b.start_time,
        end_time: b.end || b.end_time,
      }));

      // Normalize clubhouse bookings to match Booking type
      const normalizedClubhouseBookings = clubhouseBookings.map((b: any) => ({
        ...b,
        start_time: b.start_time || b.start,
        end_time: b.end_time || b.end,
      }));

      // Combine all bookings
      const allBookings = [...gymBookings, ...normalizedPitchBookings, ...normalizedClubhouseBookings];

      // Group clubhouse multi-room bookings to prevent duplication
      const groupedBookings = groupClubhouseBookings(allBookings);

      // Filter for past only (end_time < now - booking has fully completed)
      const now = Date.now();
      const past = groupedBookings.filter(b => new Date(b.end_time).getTime() < now);

      // Sort: most recent past first by start_time
      const sorted = past
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .reverse();
      setPast(sorted);
    } catch (err: any) {
      setErrorPast(err?.message ?? "Failed to load past bookings");
    } finally {
      setLoadingPast(false);
    }
  }, [groupClubhouseBookings]);

  useEffect(() => {
    fetchUpcoming();
    fetchPast();
  }, [fetchUpcoming, fetchPast]);

  // ------------------------------- HELPERS -----------------------------------
  /** Format date/time nicely (IE locale) with month and year */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-IE", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  /** Whether a datetime is today (for highlighting rows) */
  const isToday = (dateString: string) => {
    const today = new Date();
    const d = new Date(dateString);
    return today.toDateString() === d.toDateString();
  };

  /** Greeting based on current hour */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  /** Get facility badge color */
  const getFacilityBadgeColor = (booking: Booking): string => {
    const facilityName = booking.resource_name?.toLowerCase() || "";

    // Gym - Blue
    if (facilityName.includes("gym")) return "bg-blue-100 text-blue-800 border border-blue-200";

    // Main Pitch - Green
    if (facilityName.includes("main pitch")) return "bg-green-100 text-green-800 border border-green-200";

    // Minor Pitch - Orange
    if (facilityName.includes("minor pitch")) return "bg-orange-100 text-orange-800 border border-orange-200";

    // Ball Wall - Sky Blue
    if (facilityName.includes("ball wall")) return "bg-sky-100 text-sky-800 border border-sky-200";

    // Clubhouse rooms - Purple
    if (facilityName.includes("changing room") || facilityName.includes("committee") || facilityName.includes("kitchen")) {
      return "bg-purple-100 text-purple-800 border border-purple-200";
    }

    return "bg-gray-100 text-gray-800 border border-gray-200";
  };

  /** Get facility row background color */
  const getFacilityRowColor = (booking: Booking): string => {
    const facilityName = booking.resource_name?.toLowerCase() || "";

    // Gym - Blue
    if (facilityName.includes("gym")) return "bg-blue-50/50";

    // Main Pitch - Green
    if (facilityName.includes("main pitch")) return "bg-green-50/50";

    // Minor Pitch - Orange
    if (facilityName.includes("minor pitch")) return "bg-orange-50/50";

    // Ball Wall - Sky Blue
    if (facilityName.includes("ball wall")) return "bg-sky-50/50";

    // Clubhouse rooms - Purple
    if (facilityName.includes("changing room") || facilityName.includes("committee") || facilityName.includes("kitchen")) {
      return "bg-purple-50/50";
    }

    return "bg-gray-50/50";
  };

  /** Get unique facility types from bookings */
  const facilityTypes = useMemo(() => {
    const allBookings = [...upcoming, ...past];
    const types = new Set(allBookings.map(b => b.resource_name?.toLowerCase() || "unknown"));
    return Array.from(types).sort();
  }, [upcoming, past]);

  /** Apply search and filter */
  const applyFilters = (bookings: Booking[]) => {
    let filtered = bookings;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.resource_name?.toLowerCase().includes(query) ||
        b.team_name?.toLowerCase().includes(query) ||
        b.requester_name?.toLowerCase().includes(query) ||
        b.title?.toLowerCase().includes(query) ||
        formatDateTime(b.start_time).date.toLowerCase().includes(query)
      );
    }

    // Apply facility filter
    if (facilityFilter !== "all") {
      filtered = filtered.filter(b =>
        b.resource_name?.toLowerCase() === facilityFilter.toLowerCase()
      );
    }

    return filtered;
  };

  /** Client-side safeguards: only include true upcoming/past based on end_time vs current time */
  const filteredUpcoming = useMemo(
    () => applyFilters((upcoming ?? []).filter(b => new Date(b.end_time).getTime() >= Date.now())),
    [upcoming, searchQuery, facilityFilter]
  );
  const filteredPast = useMemo(
    () => applyFilters((past ?? []).filter(b => new Date(b.end_time).getTime() < Date.now())),
    [past, searchQuery, facilityFilter]
  );

  // ------------------------------ MOBILE SWIPE -------------------------------
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50; // px to trigger tab change

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = startXRef.current;
    if (startX == null) return;
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      setActiveTab(delta < 0 ? "past" : "upcoming"); // left → past, right → upcoming
    }
    startXRef.current = null;
  };

  // ------------------------------ RENDER UTILS -------------------------------
  /** Row for a single booking - mobile-optimized compact design */
  const BookingRow: React.FC<{ booking: Booking }> = ({ booking }) => {
    const { date, time } = formatDateTime(booking.start_time);
    const endTime = formatDateTime(booking.end_time).time;
    const today = isToday(booking.start_time);

    // Parse the full date string (e.g., "Mon, Jan 15, 2026")
    const dateParts = date.split(", ");
    const weekday = dateParts[0]; // "Mon"
    const monthDay = dateParts[1]; // "Jan 15"
    const year = dateParts[2]; // "2026"

    return (
      <div
        key={booking.id}
        className={`rounded-lg border p-2.5 sm:p-3 ${
          today ? "border-primary-200 bg-primary-50" : `border-gray-200 ${getFacilityRowColor(booking)}`
        }`}
      >
        {/* Mobile: Stacked layout, Desktop: Side-by-side */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          {/* Date & Time Section - Compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Compact date indicator */}
            <div className={`text-center min-w-[50px] sm:min-w-[60px] ${today ? "text-primary-700" : "text-gray-600"}`}>
              <div className="text-[10px] sm:text-xs font-medium uppercase leading-tight">{weekday}</div>
              <div className="text-xs sm:text-sm font-semibold leading-tight">{monthDay}</div>
              <div className="text-[9px] sm:text-xs text-gray-500 leading-tight">{year}</div>
            </div>

            {/* Divider - hidden on mobile */}
            <div className={`hidden sm:block w-px h-10 ${today ? "bg-primary-200" : "bg-gray-300"}`} />

            {/* Time */}
            <div className="flex-1 sm:flex-none">
              <div className="font-medium text-sm sm:text-base text-gray-900">
                {time} - {endTime}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="flex-1 min-w-0">
            {/* Facility name with color badge */}
            {booking.resource_name ? (
              <div className="mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getFacilityBadgeColor(booking)} break-words`}>
                  {booking.resource_name}
                </span>
              </div>
            ) : null}

            {/* Team/Requester info */}
            {(booking.team_name || booking.requester_name) && (
              <div className="text-[11px] sm:text-xs text-gray-600 truncate">
                {booking.team_name && <span className="font-medium">{booking.team_name}</span>}
                {booking.team_name && booking.requester_name && <span className="mx-1">·</span>}
                {booking.requester_name && <span>{booking.requester_name}</span>}
              </div>
            )}

            {/* Today badge */}
            {today && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] sm:text-xs font-medium rounded-full">
                Today
              </span>
            )}
          </div>

          {/* Status badge - Smaller on mobile, hidden if confirmed */}
          {booking.status !== "CONFIRMED" && (
            <span className="self-start sm:self-center badge badge-success text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              {booking.status}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Tab state helpers
  const isUpcomingTab = activeTab === "upcoming";
  const isPastTab = activeTab === "past";

  return (
    <div className="space-y-6">
      {/* -------------------------------- HEADER -------------------------------- */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-black">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {getGreeting()}, {member?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-primary-100 mt-1">Ready to get started?</p>
      </div>

      {/* ----------------------------- QUICK ACTIONS ---------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Book Slot */}
        <button
          onClick={() => setShowFacilityModal(true)}
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">Book Slot</span>
        </button>

        {/* My Bookings (kept as a quick action) */}
        <Link
          href="/dashboard/bookings"
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">My Bookings</span>
        </Link>

        {/* View Schedule */}
        <Link
          href="/dashboard/schedule"
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">View Schedule</span>
        </Link>

        {/* Profile or Admin */}
        {isAdmin ? (
          <Link
            href="/dashboard/admin"
            className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Admin</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/profile"
            className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Profile</span>
          </Link>
        )}
      </div>

      {/* ---------------------------- BOOKINGS TABS ----------------------------- */}
      <section aria-labelledby="bookings-section-title" className="card p-0 overflow-hidden">
        {/* Tabs header */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="bookings-section-title" className="text-lg font-semibold text-gray-900">
                Your Bookings
              </h2>
              <p className="text-sm text-gray-500">Upcoming sessions and booking history.</p>
            </div>
            {/* "View all" goes to the full bookings page */}
            <Link href="/dashboard/bookings" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </Link>
          </div>

          {/* Search and Filter Controls */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by facility, team, requester, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Facility Filter */}
              <div className="sm:w-48">
                <select
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Facilities</option>
                  {facilityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery || facilityFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFacilityFilter("all");
                  }}
                  className="sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {(searchQuery || facilityFilter !== "all") && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Remove search filter"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {facilityFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                    Facility: {facilityFilter.charAt(0).toUpperCase() + facilityFilter.slice(1)}
                    <button
                      onClick={() => setFacilityFilter("all")}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Remove facility filter"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab buttons (accessible) */}
        <div role="tablist" aria-label="Bookings tabs" className="mt-3 px-4 flex items-center gap-2 border-b border-gray-200">
          <button
            role="tab"
            id="tab-upcoming"
            aria-selected={activeTab === "upcoming"}
            aria-controls="panel-upcoming"
            onClick={() => setActiveTab("upcoming")}
            className={[
              "px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
              activeTab === "upcoming"
                ? "bg-white text-gray-900 border border-gray-200 border-b-white"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Upcoming{" "}
            <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {filteredUpcoming.length}
            </span>
          </button>

          <button
            role="tab"
            id="tab-past"
            aria-selected={activeTab === "past"}
            aria-controls="panel-past"
            onClick={() => setActiveTab("past")}
            className={[
              "px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
              activeTab === "past"
                ? "bg-white text-gray-900 border border-gray-200 border-b-white"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Past{" "}
            <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {filteredPast.length}
            </span>
          </button>
        </div>

        {/* Panels wrapper (enables mobile swipe) */}
        <div
          ref={swipeRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative"
        >
          {/* Panels container:
              - On mobile we slide horizontally between panels.
              - On md+ we render the selected panel without horizontal shift. */}
          <div
            className={[
              "transition-transform duration-300 ease-out",
              activeTab === "upcoming" ? "translate-x-0" : "-translate-x-1/2",
              "md:translate-x-0",
              "flex md:block w-[200%] md:w-auto",
            ].join(" ")}
          >
            {/* UPCOMING PANEL */}
            <section
              role="tabpanel"
              id="panel-upcoming"
              aria-labelledby="tab-upcoming"
              hidden={activeTab !== "upcoming" && typeof window !== "undefined" && window.innerWidth >= 768}
              className="w-1/2 md:w-auto px-4 pb-4"
            >
              {/* Loading / Error / Empty / List */}
              {loadingUpcoming ? (
                <div className="py-8">
                  <LoadingSpinner text="Loading upcoming bookings..." />
                </div>
              ) : errorUpcoming ? (
                <div className="px-1 py-3">
                  <Alert type="error" message={errorUpcoming} onClose={() => setErrorUpcoming(null)} />
                </div>
              ) : filteredUpcoming.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {searchQuery || facilityFilter !== "all" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      )}
                    </svg>
                  </div>
                  {searchQuery || facilityFilter !== "all" ? (
                    <>
                      <p className="text-gray-600 mb-4">No bookings match your filters</p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setFacilityFilter("all");
                        }}
                        className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Clear Filters
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4">No upcoming bookings</p>
                      <Link
                        href="/dashboard/book"
                        className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        Book a Slot
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUpcoming.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </section>

            {/* PAST PANEL */}
            <section
              role="tabpanel"
              id="panel-past"
              aria-labelledby="tab-past"
              hidden={activeTab !== "past" && typeof window !== "undefined" && window.innerWidth >= 768}
              className="w-1/2 md:w-auto px-4 pb-4"
            >
              {/* Loading / Error / Empty / List */}
              {loadingPast ? (
                <div className="py-8">
                  <LoadingSpinner text="Loading past bookings..." />
                </div>
              ) : errorPast ? (
                <div className="px-1 py-3">
                  <Alert type="error" message={errorPast} onClose={() => setErrorPast(null)} />
                </div>
              ) : filteredPast.length === 0 ? (
                <div className="text-center py-8">
                  {searchQuery || facilityFilter !== "all" ? (
                    <>
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-4">No bookings match your filters</p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setFacilityFilter("all");
                        }}
                        className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Clear Filters
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">No past bookings found.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPast.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      {/* ------------------------ FACILITY SELECTION MODAL ----------------------- */}
      {showFacilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Choose Facility to Book</h3>
                <button
                  onClick={() => setShowFacilityModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3">
              {/* Gym */}
              <button
                onClick={() => {
                  setShowFacilityModal(false);
                  router.push("/dashboard/book");
                }}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900">Gym</h4>
                  <p className="text-sm text-gray-600">Book a gym time slot</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Pitches & Ball Wall - Only for Coaches and Admins */}
              {(isCoach || isAdmin) && (
                <>
                  {/* Main Pitch */}
                  <button
                    onClick={() => {
                      setShowFacilityModal(false);
                      router.push("/dashboard/pitches/main");
                    }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-900">Main Pitch</h4>
                      <p className="text-sm text-gray-600">Book main pitch time slots</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Minor Pitch */}
                  <button
                    onClick={() => {
                      setShowFacilityModal(false);
                      router.push("/dashboard/pitches/minor");
                    }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-900">Minor Pitch</h4>
                      <p className="text-sm text-gray-600">Book minor pitch time slots</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Ball Wall */}
                  <button
                    onClick={() => {
                      setShowFacilityModal(false);
                      router.push("/dashboard/ball-wall");
                    }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-900">Ball Wall</h4>
                      <p className="text-sm text-gray-600">Book ball wall practice time</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Clubhouse */}
              <button
                onClick={() => {
                  setShowFacilityModal(false);
                  router.push("/dashboard/clubhouse");
                }}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900">Clubhouse Rooms</h4>
                  <p className="text-sm text-gray-600">Book committee room, changing rooms, kitchen</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={() => setShowFacilityModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}