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

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingApi } from "@/lib/api";
import { Booking } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function DashboardPage() {
  const { member, isAdmin } = useAuth();

  // -------------------------------- STATE -----------------------------------
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingPast, setLoadingPast] = useState(true);
  const [errorUpcoming, setErrorUpcoming] = useState<string | null>(null);
  const [errorPast, setErrorPast] = useState<string | null>(null);

  // Active tab: "upcoming" or "past"
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Keep "now" fresh so items move between panels automatically if user sits on the page
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ------------------------------- DATA FETCH --------------------------------
  useEffect(() => {
    // Fetch UPCOMING
    (async () => {
      try {
        setLoadingUpcoming(true);
        setErrorUpcoming(null);
        const data = await bookingApi.getBookings({ upcoming: true });
        // Sort: soonest first by start_time
        const sorted = [...(data ?? [])].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        setUpcoming(sorted);
      } catch (err: any) {
        setErrorUpcoming(err?.message ?? "Failed to load upcoming bookings");
      } finally {
        setLoadingUpcoming(false);
      }
    })();

    // Fetch PAST
    (async () => {
      try {
        setLoadingPast(true);
        setErrorPast(null);
        // Ensure your API supports this; otherwise switch to an "all mine" fetch and filter below.
        const data = await bookingApi.getBookings({ past: true });
        // Sort: most recent past first by start_time
        const sorted = [...(data ?? [])]
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .reverse();
        setPast(sorted);
      } catch (err: any) {
        setErrorPast(
          err?.message ??
            "Failed to load past bookings. (If your API doesn't support { past: true }, expose one or fetch all and filter by end_time < now.)"
        );
      } finally {
        setLoadingPast(false);
      }
    })();
  }, []);

  // ------------------------------- HELPERS -----------------------------------
  /** Format date/time nicely (IE locale) */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-IE", {
        weekday: "short",
        month: "short",
        day: "numeric",
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

  /** Client-side safeguards: only include true upcoming/past based on end_time vs "now" */
  const filteredUpcoming = useMemo(
    () => (upcoming ?? []).filter(b => new Date(b.end_time).getTime() >= now.getTime()),
    [upcoming, now]
  );
  const filteredPast = useMemo(
    () => (past ?? []).filter(b => new Date(b.end_time).getTime() < now.getTime()),
    [past, now]
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

  // ------------------------------ BOOKING DETAIL MODAL -------------------------------
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleBookingClick = (booking: Booking, isPast: boolean) => {
    if (isPast) return; // Don't open modal for past bookings
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const handleEditBooking = () => {
    if (selectedBooking) {
      // Navigate to bookings page where they can edit
      window.location.href = "/dashboard/bookings";
    }
  };

  // Get facility color and background
  const getFacilityColors = (booking: Booking): { bg: string; border: string; text: string; dot: string } => {
    const facilityName = booking.resource_name?.toLowerCase() || "";

    if (facilityName.includes("gym"))
      return { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", dot: "bg-blue-600" };

    if (facilityName.includes("main pitch"))
      return { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", dot: "bg-green-600" };

    if (facilityName.includes("minor pitch"))
      return { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-900", dot: "bg-lime-600" };

    if (facilityName.includes("ball wall"))
      return { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900", dot: "bg-sky-500" };

    if (facilityName.includes("room a"))
      return { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", dot: "bg-purple-600" };

    if (facilityName.includes("room b"))
      return { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900", dot: "bg-violet-600" };

    if (facilityName.includes("room"))
      return { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", dot: "bg-purple-600" };

    return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-900", dot: "bg-gray-500" };
  };

  // ------------------------------ RENDER UTILS -------------------------------
  /** Row for a single booking (keeps your original visual style) */
  const BookingRow: React.FC<{ booking: Booking; isPast: boolean }> = ({ booking, isPast }) => {
    const { date, time } = formatDateTime(booking.start_time);
    const endTime = formatDateTime(booking.end_time).time;
    const today = isToday(booking.start_time);
    const colors = getFacilityColors(booking);

    return (
      <div
        key={booking.id}
        onClick={() => handleBookingClick(booking, isPast)}
        className={`
          flex items-center gap-4 p-3 rounded-lg border transition-all
          ${isPast
            ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-300"
            : `cursor-pointer hover:shadow-md ${colors.bg} ${colors.border}`}
          ${today && !isPast ? "ring-2 ring-primary-300" : ""}
        `}
      >
        {/* Facility color indicator */}
        <div className={`w-1 h-16 rounded-full ${isPast ? "bg-gray-400" : colors.dot}`} />

        {/* Date indicator (weekday + day) */}
        <div className={`text-center min-w-[60px] ${isPast ? "text-gray-400" : colors.text}`}>
          <div className="text-xs font-medium uppercase">{date.split(",")[0]}</div>
          <div className="text-lg font-bold">{date.split(" ")[1]}</div>
        </div>

        {/* Divider */}
        <div className={`w-px h-10 ${isPast ? "bg-gray-300" : colors.border.replace("border-", "bg-")}`} />

        {/* Time & details */}
        <div className="flex-1">
          <div className={`font-medium ${isPast ? "text-gray-500" : "text-gray-900"}`}>
            {time} - {endTime}
          </div>
          {/* Facility name and booking type */}
          <div className={`text-sm mt-0.5 flex items-center gap-2 ${isPast ? "text-gray-400" : "text-gray-600"}`}>
            <span className="font-medium">{booking.resource_name || "Main Gym"}</span>
            <span>•</span>
            <span>
              {booking.booking_type === "TEAM"
                ? `Team (${booking.party_size} people)`
                : "Individual"}
            </span>
          </div>
          {today && !isPast && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              Today
            </span>
          )}
          {isPast && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
              Past
            </span>
          )}
        </div>

        {/* Status badge and click indicator */}
        <div className="flex items-center gap-2">
          <span className={`badge ${booking.status === "CONFIRMED" ? "badge-success" : "badge-gray"}`}>
            {booking.status}
          </span>
          {!isPast && (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
        <p className="text-primary-100 mt-1">Ready to book your gym session?</p>
      </div>

      {/* ----------------------------- QUICK ACTIONS ---------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Book Slot */}
        <Link
          href="/dashboard/book"
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">Book Slot</span>
        </Link>

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

        {/* Admin (only for admins) */}
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
          <div className="card flex flex-col items-center text-center p-4 bg-gray-50 opacity-50">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Profile</span>
          </div>
        )}
      </div>

      {/* ---------------------------- BOOKINGS TABS ----------------------------- */}
      <section aria-labelledby="bookings-section-title" className="card p-0 overflow-hidden">
        {/* Tabs header */}
        <div className="flex items-center justify-between px-4 pt-4">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">No upcoming bookings</p>
                  <Link
                    href="/dashboard/book"
                    className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    Book a Slot
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUpcoming.map((b) => (
                    <BookingRow key={b.id} booking={b} isPast={false} />
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
                <div className="text-sm text-gray-700 py-8 text-center">No past bookings found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredPast.map((b) => (
                    <BookingRow key={b.id} booking={b} isPast={true} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      {/* Booking Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Facility Badge */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getFacilityColors(selectedBooking).dot}`} />
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getFacilityColors(selectedBooking).bg} ${getFacilityColors(selectedBooking).border} border ${getFacilityColors(selectedBooking).text}`}>
                  {selectedBooking.resource_name || "Main Gym"}
                </span>
              </div>

              {/* Date and Time */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Date & Time</div>
                <div className="text-gray-900 font-medium">
                  {formatDateTime(selectedBooking.start_time).date}
                </div>
                <div className="text-gray-900">
                  {formatDateTime(selectedBooking.start_time).time} - {formatDateTime(selectedBooking.end_time).time}
                </div>
              </div>

              {/* Booking Type */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Booking Type</div>
                <div className="text-gray-900">
                  {selectedBooking.booking_type === "TEAM"
                    ? `Team Booking (${selectedBooking.party_size} people)`
                    : "Individual Booking"}
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <span className={`badge ${selectedBooking.status === "CONFIRMED" ? "badge-success" : "badge-gray"}`}>
                  {selectedBooking.status}
                </span>
              </div>

              {/* Creator Info */}
              {selectedBooking.creator_name && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Created By</div>
                  <div className="text-gray-900">{selectedBooking.creator_name}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-2">
              <button
                onClick={handleEditBooking}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Edit Booking
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}