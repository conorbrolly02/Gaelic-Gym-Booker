"use client";

/**
 * Book Gym Slot Page
 *
 * Allows members to:
 * - Book gym slots with custom start and end times
 * - See real-time availability and capacity
 * - Choose between individual or team bookings
 *
 * Features:
 * - Date picker for selecting booking date
 * - Custom time selection (any minute precision)
 * - Real-time capacity checking
 * - Visual feedback for conflicts
 * - Warning messages for overlapping bookings
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { bookingApi } from "@/lib/api";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import RecurringBookingModal, { RecurringBookingData } from "@/components/RecurringBookingModal";

const MAX_CAPACITY = 20; // Maximum people per slot

export default function BookSlotPage() {
  const router = useRouter();

  // Selected date (default to tomorrow)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  // Time selection
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Booking type state
  const [bookingType, setBookingType] = useState<"SINGLE" | "TEAM">("SINGLE");
  const [partySize, setPartySize] = useState<number>(1);

  // Availability state
  const [availability, setAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

  // UI state
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  /**
   * Reset party size when booking type changes
   */
  useEffect(() => {
    if (bookingType === "SINGLE") {
      setPartySize(1);
    } else if (partySize < 1) {
      setPartySize(2);
    }
  }, [bookingType, partySize]);

  /**
   * Check availability when times change
   */
  useEffect(() => {
    const checkAvailability = async () => {
      if (!startTime || !endTime) {
        setAvailability(null);
        setAvailabilityMessage(null);
        return;
      }

      // Validate times
      const start = new Date(`${selectedDate}T${startTime}:00`);
      const end = new Date(`${selectedDate}T${endTime}:00`);

      if (end <= start) {
        setAvailabilityMessage("⚠️ End time must be after start time");
        setAvailability(null);
        return;
      }

      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      if (durationMinutes < 15) {
        setAvailabilityMessage("⚠️ Booking must be at least 15 minutes");
        setAvailability(null);
        return;
      }

      if (durationMinutes > 480) {
        setAvailabilityMessage("⚠️ Booking cannot exceed 8 hours");
        setAvailability(null);
        return;
      }

      // Check with backend
      setCheckingAvailability(true);
      try {
        const startDateTime = `${selectedDate}T${startTime}:00Z`;
        const endDateTime = `${selectedDate}T${endTime}:00Z`;

        const data = await bookingApi.checkAvailability(startDateTime, endDateTime);
        setAvailability(data);

        const spotsNeeded = partySize;
        const currentBookings = data.current_bookings || 0;
        const spotsAvailable = MAX_CAPACITY - currentBookings;

        if (spotsAvailable < spotsNeeded) {
          setAvailabilityMessage(
            `❌ Not enough capacity. ${spotsAvailable} of ${MAX_CAPACITY} spots available, but you need ${spotsNeeded}. ` +
            `There ${currentBookings === 1 ? 'is' : 'are'} ${currentBookings} ${currentBookings === 1 ? 'person' : 'people'} already booked during this time.`
          );
        } else if (currentBookings === 0) {
          setAvailabilityMessage(`✅ Fully available! All ${MAX_CAPACITY} spots open for this time.`);
        } else {
          setAvailabilityMessage(
            `⚠️ ${spotsAvailable} of ${MAX_CAPACITY} spots available. ` +
            `${currentBookings} ${currentBookings === 1 ? 'person is' : 'people are'} already booked during this time, ` +
            `but there's enough capacity for your booking of ${spotsNeeded}.`
          );
        }
      } catch (err: any) {
        console.error("Availability check error:", err);
        setAvailabilityMessage("⚠️ Unable to check availability. You can still try to book.");
        setAvailability(null);
      } finally {
        setCheckingAvailability(false);
      }
    };

    const debounceTimer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [startTime, endTime, selectedDate, partySize]);

  /**
   * Handle recurring booking submission
   */
  const handleRecurringBooking = async (data: RecurringBookingData) => {
    try {
      const result = await bookingApi.createRecurringPattern({
        pattern_type: data.pattern_type,
        days_of_week: data.days_of_week,
        start_time: data.start_time,
        duration_mins: data.duration_mins,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
      });

      setSuccess(
        `Recurring booking created! ${result.bookings_created} bookings created successfully.` +
        (result.conflicts_skipped > 0 ? ` ${result.conflicts_skipped} skipped due to conflicts.` : "")
      );

      setShowRecurringModal(false);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/bookings");
      }, 2000);
    } catch (err: any) {
      throw new Error(err.message || "Failed to create recurring booking");
    }
  };

  /**
   * Handle booking submission
   */
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsBooking(true);

    try {
      // Final validation
      if (!startTime || !endTime) {
        throw new Error("Please select start and end times");
      }

      const start = new Date(`${selectedDate}T${startTime}:00`);
      const end = new Date(`${selectedDate}T${endTime}:00`);

      if (end <= start) {
        throw new Error("End time must be after start time");
      }

      // Check if we have availability data and if it's insufficient
      if (availability) {
        const spotsNeeded = partySize;
        const spotsAvailable = MAX_CAPACITY - (availability.current_bookings || 0);

        if (spotsAvailable < spotsNeeded) {
          throw new Error(
            `Insufficient capacity. Only ${spotsAvailable} spots available, but you need ${spotsNeeded}.`
          );
        }
      }

      const startDateTime = `${selectedDate}T${startTime}:00Z`;
      const endDateTime = `${selectedDate}T${endTime}:00Z`;

      await bookingApi.createBooking({
        start_time: startDateTime,
        end_time: endDateTime,
        booking_type: bookingType,
        party_size: partySize,
      });

      setSuccess(
        `Booking created successfully for ${startTime} - ${endTime} on ${selectedDate}!`
      );

      // Reset form
      setStartTime("");
      setEndTime("");
      setBookingType("SINGLE");
      setPartySize(1);
      setAvailability(null);
      setAvailabilityMessage(null);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/bookings");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create booking");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book Gym Slot</h1>
        <p className="text-gray-600 mt-1">
          Select a date and custom time to book your gym session
        </p>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess(null)} />}

      {/* Recurring Booking Button */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Need a regular booking?
            </h3>
            <p className="text-sm text-blue-800">
              Create a recurring booking to reserve the same time slot every week or daily
            </p>
          </div>
          <button
            onClick={() => setShowRecurringModal(true)}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
          >
            Create Recurring
          </button>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleBook} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Selection <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
              />
              <p className="text-xs text-gray-500 mt-1">Any time (e.g., 15:15)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
              />
              <p className="text-xs text-gray-500 mt-1">Any time (e.g., 16:45)</p>
            </div>
          </div>

          {/* Availability Status */}
          {checkingAvailability && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="inline-block animate-spin mr-2">⏳</span>
                Checking availability...
              </p>
            </div>
          )}

          {!checkingAvailability && availabilityMessage && (
            <div
              className={`mt-3 p-3 border rounded-md ${
                availabilityMessage.startsWith("✅")
                  ? "bg-green-50 border-green-200"
                  : availabilityMessage.startsWith("❌")
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <p
                className={`text-sm ${
                  availabilityMessage.startsWith("✅")
                    ? "text-green-800"
                    : availabilityMessage.startsWith("❌")
                    ? "text-red-800"
                    : "text-yellow-800"
                }`}
              >
                {availabilityMessage}
              </p>
            </div>
          )}
        </div>

        {/* Booking Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Booking Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setBookingType("SINGLE")}
              className={`p-4 border-2 rounded-lg transition-all ${
                bookingType === "SINGLE"
                  ? "border-[#903838] bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">👤</div>
                <div className="font-medium text-gray-900">Individual</div>
                <div className="text-xs text-gray-500 mt-1">Just yourself</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBookingType("TEAM")}
              className={`p-4 border-2 rounded-lg transition-all ${
                bookingType === "TEAM"
                  ? "border-[#903838] bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium text-gray-900">Team</div>
                <div className="text-xs text-gray-500 mt-1">Multiple people</div>
              </div>
            </button>
          </div>
        </div>

        {/* Party Size (for team bookings) */}
        {bookingType === "TEAM" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of People <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
              min={1}
              max={MAX_CAPACITY}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum {MAX_CAPACITY} people</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBooking || checkingAvailability || (availabilityMessage?.startsWith("❌") ?? false)}
            className="flex-1 px-4 py-2 bg-[#903838] text-white rounded-md hover:bg-[#7d2f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Booking Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• You can book any custom time (e.g., 15:15 to 16:45)</li>
          <li>• Minimum booking duration is 15 minutes</li>
          <li>• Maximum booking duration is 8 hours</li>
          <li>• Gym capacity is {MAX_CAPACITY} people at any given time</li>
          <li>• If your time overlaps with existing bookings, remaining capacity will be shown</li>
        </ul>
      </div>

      {/* Recurring Booking Modal */}
      {showRecurringModal && (
        <RecurringBookingModal
          onClose={() => setShowRecurringModal(false)}
          onSubmit={handleRecurringBooking}
          selectedTime={startTime}
          minDate={selectedDate}
        />
      )}
    </div>
  );
}
