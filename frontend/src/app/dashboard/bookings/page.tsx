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

import React, { useState, useEffect, useCallback } from "react";
import { bookingApi } from "@/lib/api";
import { Booking } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import EditBookingModal from "@/components/EditBookingModal";
import CancelBookingModal from "@/components/CancelBookingModal";
import DeleteCancelledButton from "@/components/DeleteCancelledButton";

type FilterType = "upcoming" | "past" | "all";

export default function MyBookingsPage() {
  // Bookings data
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Filter state
  const [filter, setFilter] = useState<FilterType>("upcoming");
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Fetch bookings based on current filter
   */
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let params: { upcoming?: boolean; status?: string } = {};

      if (filter === "upcoming") {
        params.upcoming = true;
      }
      // For "past" and "all", we fetch all and filter client-side

      const data = await bookingApi.getBookings(params);

      // Filter past bookings client-side
      if (filter === "past") {
        const now = new Date();
        setBookings(data.filter((b) => new Date(b.end_time) < now));
      } else {
        setBookings(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

      {/* Bookings List */}
      <div className="card">
        {/* Loading state */}
        {isLoading && (
          <div className="py-12">
            <LoadingSpinner text="Loading bookings..." />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && bookings.length === 0 && (
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
        {!isLoading && bookings.length > 0 && (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Facility</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const start = formatDateTime(booking.start_time);
                    const end = formatDateTime(booking.end_time);

                    return (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="font-medium text-gray-900">{start.date}</span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {start.time} - {end.time}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {booking.resource_name || "Main Gym"}
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {bookings.map((booking) => {
                const start = formatDateTime(booking.start_time);
                const end = formatDateTime(booking.end_time);

                return (
                  <div
                    key={booking.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{start.date}</div>
                        <div className="text-sm text-gray-600">
                          {start.time} - {end.time}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {booking.resource_name || "Main Gym"}
                          {" • "}
                          {booking.booking_type === "TEAM"
                            ? `Team (${booking.party_size} people)`
                            : "Individual"}
                        </div>
                      </div>
                      <span className={`badge ${getStatusBadge(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>

                    {canCancel(booking) && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="mt-3 w-full py-2 text-red-600 border border-red-200
                                   rounded-lg text-sm font-medium hover:bg-red-50
                                   disabled:opacity-50 transition-colors"
                      >
                        {cancellingId === booking.id ? "Cancelling..." : "Cancel Booking"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
