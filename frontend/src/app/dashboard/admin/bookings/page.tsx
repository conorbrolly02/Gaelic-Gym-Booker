"use client";

/**
 * Admin Bookings Management Page
 * 
 * Allows administrators to:
 * - View all bookings across all members
 * - Filter by date
 * - Cancel any booking
 * - See booking statistics
 * 
 * Features responsive table with mobile card view.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/api";
import { BookingWithMember } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminBookingsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Selected date for filtering
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Bookings data
  const [bookings, setBookings] = useState<BookingWithMember[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect non-admins (only after auth check completes)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, authLoading, router]);

  /**
   * Fetch bookings for the selected date
   */
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await adminApi.getBookings({ date: selectedDate });
      setBookings(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Fetch on mount and date change
  useEffect(() => {
    if (isAdmin) {
      fetchBookings();
    }
  }, [isAdmin, fetchBookings]);

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
      await adminApi.cancelBooking(bookingId);
      setSuccess("Booking cancelled successfully");
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
      }),
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
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
   * Check if booking can be cancelled
   */
  const canCancel = (booking: BookingWithMember) => {
    return booking.status === "CONFIRMED";
  };

  /**
   * Format selected date for display
   */
  const formatSelectedDate = () => {
    const date = new Date(selectedDate + "T00:00:00");
    return date.toLocaleDateString("en-IE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Navigate to previous day
   */
  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  /**
   * Navigate to next day
   */
  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  /**
   * Go to today
   */
  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Don't render for non-admins
  if (!isAdmin) {
    return <LoadingSpinner fullScreen text="Redirecting..." />;
  }

  // Count confirmed bookings
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Bookings</h1>
        <p className="text-gray-600 mt-1">View and manage all gym bookings</p>
      </div>

      {/* Date Navigation */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousDay}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Previous day"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input max-w-[180px]"
            />

            <button
              onClick={goToNextDay}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Next day"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 
                         rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {/* Stats */}
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{confirmedCount}</span> confirmed bookings for{" "}
            <span className="font-medium">{formatSelectedDate()}</span>
          </div>
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
      <div className="card overflow-hidden">
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
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings</h3>
            <p className="text-gray-600">No bookings scheduled for this date.</p>
          </div>
        )}

        {/* Bookings table/cards */}
        {!isLoading && bookings.length > 0 && (
          <>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Member</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Facility</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Created By</th>
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
                          <span className="font-medium text-gray-900">
                            {start.time} - {end.time}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {booking.member?.full_name || "Unknown"}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {booking.resource_name || "Main Gym"}
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {booking.booking_type === "TEAM"
                            ? `Team (${booking.party_size})`
                            : "Individual"
                          }
                        </td>
                        <td className="py-4 px-4">
                          <span className={`badge ${getStatusBadge(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {booking.creator_name || "Unknown"}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {canCancel(booking) && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="px-3 py-1 text-sm font-medium text-red-600
                                         hover:bg-red-50 rounded-lg transition-colors
                                         disabled:opacity-50"
                            >
                              {cancellingId === booking.id ? "..." : "Cancel"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet card view */}
            <div className="lg:hidden space-y-3 p-4">
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
                        <div className="font-medium text-gray-900">
                          {start.time} - {end.time}
                        </div>
                        <div className="text-sm text-gray-600">
                          {booking.member?.full_name || "Unknown Member"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {booking.resource_name || "Main Gym"}
                          {" • "}
                          {booking.booking_type === "TEAM"
                            ? `Team (${booking.party_size} people)`
                            : "Individual"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Created by: {booking.creator_name || "Unknown"}
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
