"use client";

/**
 * BookingsTabs.tsx
 * =============================================================================
 * PURPOSE:
 *   Reusable dashboard widget that shows two panels: Upcoming and Past bookings.
 *   - DESKTOP: tabs to switch panels
 *   - MOBILE: tabs + swipe left/right to switch panels
 *
 * HOW IT WORKS:
 *   - Fetches the current user's bookings from /api/bookings/me (customize if needed)
 *   - Filters by "now" using booking END time
 *   - Sorts Upcoming ascending (soonest first), Past descending (most recent past first)
 *
 * A11Y:
 *   - Implements WAI-ARIA tabs: tablist / tab / tabpanel
 *   - Left/Right arrow keys move focus between tabs
 *
 * CUSTOMIZATION:
 *   - If your backend fields differ, adjust the mapper in fetchMyBookings()
 *   - You can pass pre-fetched bookings via props to avoid a network call
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
// If you already have a shared Booking type, uncomment next import and remove the local type below.
// import type { Booking } from "@/types";

/** Local fallback type; replace with your "@/types" Booking if you prefer */
type Booking = {
  id: string | number;
  start: string;   // ISO string, e.g. "2026-02-25T18:30:00Z"
  end: string;     // ISO string
  facility: string;
  title?: string;
  status?: string;
  notes?: string;
};

/* ============================================================================
   DATA ACCESS
   Replace the endpoint with your own. If you already have bookings in context,
   you can pass them to this component via the `bookings` prop and skip fetch.
============================================================================ */
async function fetchMyBookings(): Promise<Booking[]> {
  const res = await fetch("/api/bookings/me", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load bookings");

  const json = await res.json();

  // Map your backend → local Booking shape. Adjust field names if needed.
  return (json ?? []).map((b: any) => ({
    id: b.id ?? b.booking_id ?? `${b.resource ?? b.facility}-${b.start ?? b.start_time}`,
    start: b.start ?? b.start_time ?? b.startTime,
    end: b.end ?? b.end_time ?? b.endTime,
    facility: b.facility ?? b.resource_name ?? b.resource ?? b.room ?? "Facility",
    title: b.title ?? `${b.facility ?? b.resource ?? "Booking"}`,
    status: b.status,
    notes: b.notes,
  }));
}

/* ============================================================================
   UTILS
============================================================================ */
const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));
const fmt = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/* ============================================================================
   PRESENTATION: a small booking card
============================================================================ */
function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{booking.facility}</div>
          <div className="mt-1 font-medium text-gray-900">
            {booking.title ?? "Booking"}
          </div>
        </div>
        {booking.status && (
          <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700">
            {booking.status}
          </span>
        )}
      </div>
      <div className="mt-3 text-sm text-gray-700">
        <div>
          <span className="text-gray-500">Start:</span> {fmt(booking.start)}
        </div>
        <div>
          <span className="text-gray-500">End:</span> {fmt(booking.end)}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN COMPONENT
============================================================================ */
export default function BookingsTabs(props: {
  /** Optional: pass pre-fetched bookings to avoid internal fetch */
  bookings?: Booking[];
  /** Optional: set initial tab; default = "upcoming" */
  initialTab?: "upcoming" | "past";
  /** Optional: show a CTA in empty states */
  showBookCta?: boolean;
}) {
  // -------------------------- STATE -----------------------------------------
  const [loading, setLoading] = useState(!props.bookings);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(props.bookings ?? []);
  const [activeIndex, setActiveIndex] = useState<0 | 1>(
    props.initialTab === "past" ? 1 : 0
  );
  const [now, setNow] = useState<Date>(new Date()); // drives upcoming/past filter

  // -------------------------- TIME TICK --------------------------------------
  // Refresh "now" every minute so items can move between panels naturally
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // -------------------------- FETCH -----------------------------------------
  useEffect(() => {
    if (props.bookings) return; // caller supplied data
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMyBookings();
        if (mounted) setBookings(data);
      } catch (err: any) {
        if (mounted) setErrorMsg(err?.message ?? "Failed to load bookings");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [props.bookings]);

  // -------------------------- FILTER + SORT ---------------------------------
  const { upcoming, past } = useMemo(() => {
    const nowTs = now.getTime();

    const upcomingList = bookings
      .filter((b) => toDate(b.end).getTime() >= nowTs)
      .sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());

    const pastList = bookings
      .filter((b) => toDate(b.end).getTime() < nowTs)
      .sort((a, b) => toDate(b.start).getTime() - toDate(a.start).getTime())
      .reverse();

    return { upcoming: upcomingList, past: pastList };
  }, [bookings, now]);

  const counts = { upcoming: upcoming.length, past: past.length };

  // -------------------------- SWIPE (MOBILE) --------------------------------
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const THRESHOLD = 50; // px to trigger a swipe

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = startXRef.current;
    if (startX == null) return;
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) >= THRESHOLD) {
      setActiveIndex(delta < 0 ? 1 : 0); // left → Past, right → Upcoming
    }
    startXRef.current = null;
  };

  // -------------------------- KEYBOARD NAV FOR TABS --------------------------
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      setActiveIndex(1);
    } else if (e.key === "ArrowLeft") {
      setActiveIndex(0);
    }
  };

  // -------------------------- RENDER ----------------------------------------
  const isUpcoming = activeIndex === 0;
  const isPast = activeIndex === 1;

  return (
    <section aria-labelledby="bookings-section-title" className="mt-6">
      {/* Section Header */}
      <div className="mb-4">
        <h2 id="bookings-section-title" className="text-xl font-semibold text-gray-900">
          Your Bookings
        </h2>
        <p className="text-sm text-gray-500">
          Review upcoming sessions and browse your booking history.
        </p>
      </div>

      {/* Tabs (accessible, desktop & mobile) */}
      <div
        role="tablist"
        aria-label="Bookings tabs"
        className="flex items-center gap-2 border-b border-gray-200"
        onKeyDown={onTabKeyDown}
      >
        <button
          role="tab"
          id="tab-upcoming"
          aria-selected={isUpcoming}
          aria-controls="panel-upcoming"
          onClick={() => setActiveIndex(0)}
          className={[
            "px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
            isUpcoming
              ? "bg-white text-gray-900 border border-gray-200 border-b-white"
              : "text-gray-600 hover:text-gray-900",
          ].join(" ")}
        >
          Upcoming{" "}
          <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {counts.upcoming}
          </span>
        </button>

        <button
          role="tab"
          id="tab-past"
          aria-selected={isPast}
          aria-controls="panel-past"
          onClick={() => setActiveIndex(1)}
          className={[
            "px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
            isPast
              ? "bg-white text-gray-900 border border-gray-200 border-b-white"
              : "text-gray-600 hover:text-gray-900",
          ].join(" ")}
        >
          Past{" "}
          <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {counts.past}
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
        {/* On mobile we animate horizontally; on md+ we just show the active panel */}
        <div
          className={[
            "mt-0 transition-transform duration-300 ease-out",
            // Use CSS to snap to panel on small screens; md+ no horizontal shift
            isUpcoming ? "translate-x-0" : "-translate-x-full",
            "md:translate-x-0",
            // Layout: put both panels side-by-side only on small screens
            "flex md:block w-[200%] md:w-auto",
          ].join(" ")}
        >
          {/* UPCOMING PANEL */}
          <section
            role="tabpanel"
            id="panel-upcoming"
            aria-labelledby="tab-upcoming"
            hidden={!isUpcoming && typeof window !== "undefined" && window.innerWidth >= 768}
            className="w-1/2 md:w-auto bg-white border border-gray-200 rounded-b-md p-4 md:mr-0 mr-2"
          >
            {loading ? (
              <div className="text-sm text-gray-500">Loading upcoming bookings…</div>
            ) : errorMsg ? (
              <div className="text-sm text-red-600">{errorMsg}</div>
            ) : upcoming.length === 0 ? (
              <div className="text-sm text-gray-700">
                No upcoming bookings found.
                {props.showBookCta && (
                  <div className="mt-3">
                    <a
                      href="/dashboard/book"
                      className="text-primary-700 hover:underline"
                    >
                      Book a slot
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </section>

          {/* PAST PANEL */}
          <section
            role="tabpanel"
            id="panel-past"
            aria-labelledby="tab-past"
            hidden={!isPast && typeof window !== "undefined" && window.innerWidth >= 768}
            className="w-1/2 md:w-auto bg-white border border-gray-200 rounded-b-md p-4 md:ml-0 ml-2"
          >
            {loading ? (
              <div className="text-sm text-gray-500">Loading past bookings…</div>
            ) : errorMsg ? (
              <div className="text-sm text-red-600">{errorMsg}</div>
            ) : past.length === 0 ? (
              <div className="text-sm text-gray-700">No past bookings found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}