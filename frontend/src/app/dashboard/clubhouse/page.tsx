"use client";

/**
 * Clubhouse Booking Page
 *
 * Allows members and coaches to book clubhouse rooms including:
 * - Committee Room
 * - Kitchen
 * - Changing Rooms 1-4
 * - Referee Changing Room
 * - Small Room
 *
 * Features:
 * - Interactive SVG floor plan
 * - Multi-room selection
 * - Time slot booking with admin-approval flow
 * - Visual feedback for selected rooms
 * - My Bookings section showing pending and confirmed reservations
 */

import React, { useState, useEffect, useCallback } from "react";
import ClubhousePlan from "@/components/ClubhousePlan";
import { useAuth } from "@/context/AuthContext";
import { clubhouseApi } from "@/lib/api";

interface ClubhouseBooking {
  id: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
  purpose?: string;
  contact_name?: string;
  created_at: string;
}

export default function ClubhousePage() {
  const { member, isAdmin } = useAuth();
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Record<string, { id: string; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [myBookings, setMyBookings] = useState<ClubhouseBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const roomIdMap: Record<string, string> = {
    Committee: "Committee Room",
    Kitchen: "Kitchen",
    CR1: "Changing Room 1",
    CR2: "Changing Room 2",
    CR3: "Changing Room 3",
    CR4: "Changing Room 4",
    RefCR: "Referee Changing Room",
    Room2: "Room 2",
  };

  const loadMyBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const data = await clubhouseApi.getMemberBookings({ upcoming_only: false });
      setMyBookings(data);
    } catch {
      // silently fail for bookings section
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Load rooms from backend on mount
  useEffect(() => {
    async function loadRooms() {
      try {
        const roomsData = await clubhouseApi.getRooms();
        const roomsMap: Record<string, { id: string; name: string }> = {};
        roomsData.forEach((room: any) => {
          const uiKey = Object.entries(roomIdMap).find(([_, name]) => name === room.name)?.[0];
          if (uiKey) {
            roomsMap[uiKey] = { id: room.id, name: room.name };
          }
        });
        setRooms(roomsMap);
      } catch (err: any) {
        setError(err.message || "Failed to load rooms");
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
    loadMyBookings();
  }, [loadMyBookings]);

  const handleRoomSelect = (roomId: string, roomName: string) => {
    setSelectedRooms((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
    setError(null);
  };

  const handleContinue = () => {
    if (selectedRooms.length === 0) {
      setError("Please select at least one room to book");
      return;
    }
    setShowBookingForm(true);
  };

  const handleBack = () => {
    setShowBookingForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!startTime || !endTime) {
      setError("Please select start and end times");
      return;
    }

    const start = new Date(`${selectedDate}T${startTime}`);
    const end = new Date(`${selectedDate}T${endTime}`);

    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    if (!purpose.trim()) {
      setError("Please provide a purpose for the booking");
      return;
    }

    setSubmitting(true);

    try {
      const roomIds = selectedRooms.map((roomKey) => rooms[roomKey]?.id).filter(Boolean);

      if (roomIds.length === 0) {
        setError("Invalid room selection");
        return;
      }

      const startDateTime = `${selectedDate}T${startTime}:00`;
      const endDateTime = `${selectedDate}T${endTime}:00`;

      await clubhouseApi.createBooking({
        room_ids: roomIds,
        start_time: startDateTime,
        end_time: endDateTime,
        purpose: purpose,
        contact_name: member?.full_name || null,
      });

      const roomNames = selectedRooms
        .map((k) => rooms[k]?.name || roomIdMap[k])
        .join(", ");

      setSuccess(
        isAdmin
          ? `Booking confirmed for ${roomNames} on ${selectedDate} from ${startTime} to ${endTime}.`
          : `Booking request submitted for ${roomNames} on ${selectedDate} from ${startTime} to ${endTime}. An admin will review and approve your request.`
      );

      setSelectedRooms([]);
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setShowBookingForm(false);

      // Refresh bookings list
      await loadMyBookings();

      setTimeout(() => setSuccess(null), 8000);
    } catch (err: any) {
      setError(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await clubhouseApi.cancelBooking(bookingId);
      await loadMyBookings();
    } catch (err: any) {
      setError(err.message || "Failed to cancel booking");
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clubhouse Rooms</h1>
        <p className="text-gray-600 mt-1">
          Book committee room, changing rooms, kitchen, and other facilities
        </p>
      </div>

      {/* Admin auto-approval notice / member approval notice */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-900">Admin approval required</p>
            <p className="text-sm text-amber-800 mt-0.5">
              Clubhouse room bookings must be reviewed and approved by an administrator before they are confirmed.
              You will receive a notification once your request has been processed.
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-green-900">
                {isAdmin ? "Booking Confirmed" : "Request Submitted"}
              </h3>
              <p className="text-sm text-green-800 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!showBookingForm ? (
        <>
          {/* Instructions Card */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Book</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click on one or more rooms on the floor plan below to select them</li>
              <li>Selected rooms will be highlighted in blue with a checkmark</li>
              <li>Click &quot;Continue to Booking&quot; to set the date and time</li>
              <li>Fill in the booking details and submit</li>
              {!isAdmin && <li>Your request will be sent to an admin for approval</li>}
            </ol>
          </div>

          {/* Floor Plan Card */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Clubhouse Floor Plan
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Click on rooms to select them for booking. You can select multiple rooms.
            </p>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <ClubhousePlan onRoomSelect={handleRoomSelect} selectedRooms={selectedRooms} />
            </div>
          </div>

          {/* Selected Rooms Summary */}
          {selectedRooms.length > 0 && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Selected Rooms ({selectedRooms.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedRooms.map((roomKey) => (
                  <span
                    key={roomKey}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {rooms[roomKey]?.name || roomIdMap[roomKey]}
                    <button
                      onClick={() => handleRoomSelect(roomKey, rooms[roomKey]?.name || roomIdMap[roomKey])}
                      className="hover:text-blue-900"
                      aria-label={`Remove ${rooms[roomKey]?.name || roomIdMap[roomKey]}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleContinue}
              disabled={selectedRooms.length === 0}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedRooms.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#903838] text-white hover:bg-[#7d2f2f]"
              }`}
            >
              Continue to Booking ({selectedRooms.length} room{selectedRooms.length !== 1 ? "s" : ""})
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Booking Form */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Floor Plan
              </button>
            </div>

            {/* Selected Rooms Display */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Booking {selectedRooms.length} Room{selectedRooms.length !== 1 ? "s" : ""}
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedRooms.map((roomKey) => (
                  <span
                    key={roomKey}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {rooms[roomKey]?.name || roomIdMap[roomKey]}
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Selection */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#903838]"
                  required
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    required
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose / Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="e.g., Team training session, Committee meeting, Event setup"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#903838]"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please provide a brief description — admins use this to review your request
                </p>
              </div>

              {/* Contact Information */}
              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  id="contact"
                  defaultValue={member?.full_name || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#903838]"
                  readOnly
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    submitting
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-[#903838] text-white hover:bg-[#7d2f2f]"
                  }`}
                >
                  {submitting
                    ? "Submitting..."
                    : isAdmin
                    ? "Confirm Booking"
                    : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* My Bookings Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Room Bookings</h3>
        {loadingBookings ? (
          <p className="text-sm text-gray-500">Loading bookings...</p>
        ) : myBookings.length === 0 ? (
          <p className="text-sm text-gray-500">You have no clubhouse bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {myBookings.map((booking) => {
              const isPending = booking.status === "PENDING_APPROVAL";
              const isCancelled = booking.status === "CANCELLED";
              return (
                <div
                  key={booking.id}
                  className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${
                    isPending
                      ? "border-amber-200 bg-amber-50"
                      : isCancelled
                      ? "border-gray-200 bg-gray-50 opacity-60"
                      : "border-green-200 bg-green-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">
                        {booking.resource_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isPending
                            ? "bg-amber-100 text-amber-800"
                            : isCancelled
                            ? "bg-gray-200 text-gray-600"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {isPending ? "Pending Approval" : isCancelled ? "Cancelled" : "Confirmed"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDateTime(booking.start_time)} –{" "}
                      {new Date(booking.end_time).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {booking.purpose && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {booking.purpose}
                      </p>
                    )}
                  </div>
                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="text-xs text-red-600 hover:text-red-800 underline whitespace-nowrap flex-shrink-0 mt-0.5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

