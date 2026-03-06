"use client";

/**
 * My Bookings Page
 * 
 * Displays all bookings for the logged-in member.
 * Features:
 * - Filter by upcoming/past bookings
 * - Cancel upcoming bookings
 * - View booking details
 * - Responsive table/card layout
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { bookingApi, pitchApi, clubhouseApi } from "@/lib/api";
import { Booking } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import EditBookingModal from "@/components/EditBookingModal";
import CancelBookingModal from "@/components/CancelBookingModal";
import DeleteCancelledButton from "@/components/DeleteCancelledButton";

type FilterType = "upcoming" | "past" | "all";
type FacilityFilter = "all" | "gym" | "main_pitch" | "minor_pitch" | "ball_wall" | "clubhouse";
type StatusFilter = "all" | "CONFIRMED" | "CANCELLED";

export default function MyBookingsPage() {
  // Bookings data - store all bookings
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  // Filter state
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<FacilityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Touch/swipe state for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Group clubhouse bookings that were created together (multi-room bookings).
   * Prevents showing duplicate entries for the same booking.
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

  /**
   * Fetch all bookings from all sources
   */
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch bookings from all three sources (fetch all, not filtered by time)
      const [gymBookings, pitchBookings, clubhouseBookings] = await Promise.all([
        bookingApi.getBookings({}),
        pitchApi.getMemberPitchBookings({}),
        clubhouseApi.getMemberBookings({}),
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
      const combined = [...gymBookings, ...normalizedPitchBookings, ...normalizedClubhouseBookings];

      // Group clubhouse multi-room bookings to prevent duplication
      const groupedData = groupClubhouseBookings(combined);

      // Store all bookings (filtering happens in useMemo)
      setAllBookings(groupedData);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [groupClubhouseBookings]);

  // Fetch on mount
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /**
   * Filter and search bookings based on current filters
   */
  const filteredBookings = useMemo(() => {
    let filtered = [...allBookings];
    const now = new Date();

    // Time filter (upcoming/past/all)
    if (filter === "upcoming") {
      filtered = filtered.filter(b => new Date(b.end_time) > now);
    } else if (filter === "past") {
      filtered = filtered.filter(b => new Date(b.end_time) < now);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // Facility filter
    if (facilityFilter !== "all") {
      filtered = filtered.filter(b => {
        const facilityName = b.resource_name?.toLowerCase() || "";
        switch (facilityFilter) {
          case "gym":
            return facilityName.includes("gym");
          case "main_pitch":
            return facilityName.includes("main pitch");
          case "minor_pitch":
            return facilityName.includes("minor pitch");
          case "ball_wall":
            return facilityName.includes("ball wall");
          case "clubhouse":
            return facilityName.includes("changing room") ||
                   facilityName.includes("committee") ||
                   facilityName.includes("kitchen");
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.team_name?.toLowerCase().includes(query) ||
        b.requester_name?.toLowerCase().includes(query) ||
        b.resource_name?.toLowerCase().includes(query) ||
        b.title?.toLowerCase().includes(query)
      );
    }

    // Sort by start time
    filtered.sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return filter === "past" ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [allBookings, filter, statusFilter, facilityFilter, searchQuery]);

  /**
   * Handle editing a booking
   */
  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
  };

  /**
   * Handle booking updated after edit
   */
  const handleBookingUpdated = async (updatedBooking: Booking) => {
    setSuccess("Booking updated successfully");
    setEditingBooking(null);
    // Refresh bookings to show updated data
    await fetchBookings();
  };

  /**
   * Handle cancelling a booking
   */
  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    setCancellingId(bookingId);
    setError(null);
    setSuccess(null);

    try {
      await bookingApi.cancelBooking(bookingId);
      setSuccess("Booking cancelled successfully");

      // Refresh bookings
      await fetchBookings();
    } catch (err: any) {
      setError(err.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * Format date and time for display
   */
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

  /**
   * Check if booking can be cancelled (is in the future)
   */
  const canCancel = (booking: Booking) => {
    return (
      booking.status === "CONFIRMED" &&
      new Date(booking.start_time) > new Date()
    );
  };

  /**
   * Check if booking can be edited (is in the future and confirmed)
   */
  const canEdit = (booking: Booking) => {
    return (
      booking.status === "CONFIRMED" &&
      new Date(booking.start_time) > new Date()
    );
  };

  /**
   * Get status badge style
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "badge-success";
      case "CANCELLED":
        return "badge-error";
      case "COMPLETED":
        return "badge-gray";
      default:
        return "badge-info";
    }
  };

  /**
   * Handle touch start for swipe detection
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  /**
   * Handle touch move for swipe detection
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  /**
   * Handle touch end to detect swipe direction and change tab
   */
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    // Swipe left (next tab)
    if (diff > threshold) {
      if (filter === "upcoming") setFilter("past");
      else if (filter === "past") setFilter("all");
    }

    // Swipe right (previous tab)
    if (diff < -threshold) {
      if (filter === "all") setFilter("past");
      else if (filter === "past") setFilter("upcoming");
    }

    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  /**
   * Get facility badge color
   */
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

    // Clubhouse rooms - Purple/Pink
    if (facilityName.includes("changing room") || facilityName.includes("committee") || facilityName.includes("kitchen")) {
      return "bg-purple-100 text-purple-800 border border-purple-200";
    }

    return "bg-gray-100 text-gray-800 border border-gray-200";
  };

  /**
   * Get facility row background color (lighter shade for table rows)
   */
  const getFacilityRowColor = (booking: Booking): string => {
    const facilityName = booking.resource_name?.toLowerCase() || "";

    // Gym - Blue
    if (facilityName.includes("gym")) return "bg-blue-50/50 hover:bg-blue-50";

    // Main Pitch - Green
    if (facilityName.includes("main pitch")) return "bg-green-50/50 hover:bg-green-50";

    // Minor Pitch - Orange
    if (facilityName.includes("minor pitch")) return "bg-orange-50/50 hover:bg-orange-50";

    // Ball Wall - Sky Blue
    if (facilityName.includes("ball wall")) return "bg-sky-50/50 hover:bg-sky-50";

    // Clubhouse rooms - Purple/Pink
    if (facilityName.includes("changing room") || facilityName.includes("committee") || facilityName.includes("kitchen")) {
      return "bg-purple-50/50 hover:bg-purple-50";
    }

    return "bg-gray-50/50 hover:bg-gray-50";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">View and manage your gym bookings</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(["upcoming", "past", "all"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Search and Filters */}
      <div className="card space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by facility, team, or requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Facility Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Facility</label>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value as FacilityFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Facilities</option>
              <option value="gym">Gym</option>
              <option value="main_pitch">Main Pitch</option>
              <option value="minor_pitch">Minor Pitch</option>
              <option value="ball_wall">Ball Wall</option>
              <option value="clubhouse">Clubhouse Rooms</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div
        className="card"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="py-12">
            <LoadingSpinner text="Loading bookings..." />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
            <p className="text-gray-600">
              {filter === "upcoming"
                ? "You don't have any upcoming bookings."
                : filter === "past"
                ? "You don't have any past bookings."
                : "You haven't made any bookings yet."}
            </p>
          </div>
        )}

        {/* Bookings table/cards */}
        {!isLoading && filteredBookings.length > 0 && (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Facility</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Team/Requester</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const start = formatDateTime(booking.start_time);
                    const end = formatDateTime(booking.end_time);

                    return (
                      <tr key={booking.id} className={`border-b border-gray-100 ${getFacilityRowColor(booking)}`}>
                        <td className="py-4 px-4">
                          <span className="font-medium text-gray-900">{start.date}</span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {start.time} - {end.time}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getFacilityBadgeColor(booking)}`}>
                            {booking.resource_name || "Main Gym"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {booking.team_name ? (
                            <div>
                              <div className="font-medium text-gray-900">{booking.team_name}</div>
                              {booking.requester_name && (
                                <div className="text-xs text-gray-500">{booking.requester_name}</div>
                              )}
                            </div>
                          ) : booking.requester_name ? (
                            <div className="text-gray-900">{booking.requester_name}</div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {booking.booking_type === "TEAM"
                            ? `Team (${booking.party_size})`
                            : "Individual"}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`badge ${getStatusBadge(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit(booking) && (
                              <button
                                onClick={() => handleEdit(booking)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                              >
                                Edit
                              </button>
                            )}
                            {canCancel(booking) && (
                              <button
                                onClick={() => handleCancel(booking.id)}
                                disabled={cancellingId === booking.id}
                                className="text-red-600 hover:text-red-700 font-medium text-sm
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {filteredBookings.map((booking) => {
                const start = formatDateTime(booking.start_time);
                const end = formatDateTime(booking.end_time);

                return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-lg border ${getFacilityRowColor(booking)} ${
                      booking.resource_name?.toLowerCase().includes("gym") ? "border-blue-200" :
                      booking.resource_name?.toLowerCase().includes("main pitch") ? "border-green-200" :
                      booking.resource_name?.toLowerCase().includes("minor pitch") ? "border-orange-200" :
                      booking.resource_name?.toLowerCase().includes("ball wall") ? "border-sky-200" :
                      (booking.resource_name?.toLowerCase().includes("changing room") ||
                       booking.resource_name?.toLowerCase().includes("committee") ||
                       booking.resource_name?.toLowerCase().includes("kitchen")) ? "border-purple-200" :
                      "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{start.date}</div>
                        <div className="text-sm text-gray-600">
                          {start.time} - {end.time}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getFacilityBadgeColor(booking)}`}>
                            {booking.resource_name || "Main Gym"}
                          </span>
                          <span className="text-sm text-gray-600">
                            {booking.booking_type === "TEAM"
                              ? `Team (${booking.party_size} people)`
                              : "Individual"}
                          </span>
                        </div>
                        {(booking.team_name || booking.requester_name) && (
                          <div className="mt-2 text-sm">
                            {booking.team_name && (
                              <div className="font-medium text-gray-900">{booking.team_name}</div>
                            )}
                            {booking.requester_name && (
                              <div className="text-gray-600">{booking.requester_name}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${getStatusBadge(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>

                    {(canEdit(booking) || canCancel(booking)) && (
                      <div className="mt-3 flex gap-2">
                        {canEdit(booking) && (
                          <button
                            onClick={() => handleEdit(booking)}
                            className="flex-1 py-2 text-blue-600 border border-blue-200
                                       rounded-lg text-sm font-medium hover:bg-blue-50
                                       transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {canCancel(booking) && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="flex-1 py-2 text-red-600 border border-red-200
                                       rounded-lg text-sm font-medium hover:bg-red-50
                                       disabled:opacity-50 transition-colors"
                          >
                            {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdated={handleBookingUpdated}
        />
      )}
    </div>
  );
}
