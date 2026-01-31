"use client";

/**
 * Book Slot Page
 * 
 * Allows members to:
 * - Select a date to view available slots
 * - See slot availability (how many spots remain)
 * - Book a new gym session
 * 
 * Features:
 * - Date picker for selecting booking date
 * - Time slot grid showing availability
 * - One-click booking
 * - Visual feedback for full/available slots
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { bookingApi } from "@/lib/api";
import { Booking } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Time slot definition
 * Gym operates in 1-hour slots from 6 AM to 10 PM
 */
interface TimeSlot {
  startHour: number;
  endHour: number;
  label: string;
}

/**
 * Generate available time slots (6 AM to 10 PM, 1-hour each)
 */
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 6; hour < 22; hour++) {
    slots.push({
      startHour: hour,
      endHour: hour + 1,
      label: `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1).toString().padStart(2, "0")}:00`,
    });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const MAX_CAPACITY = 20; // Maximum people per slot

export default function BookSlotPage() {
  const router = useRouter();

  // Selected date (default to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Existing bookings for the selected date
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  
  // User's own bookings for the date (to prevent double booking)
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState<string | null>(null); // Tracks which slot is being booked
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Fetch bookings for the selected date
   */
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch user's upcoming bookings
        const bookings = await bookingApi.getBookings({ upcoming: true });
        setMyBookings(bookings);

        // Note: In a real app, you might have an endpoint to get all bookings
        // for capacity checking. For now, we'll check availability per slot.
        setExistingBookings([]);
      } catch (err: any) {
        setError(err.message || "Failed to load bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [selectedDate]);

  /**
   * Check if user already has a booking for this slot
   */
  const hasMyBooking = (slot: TimeSlot): boolean => {
    const slotStart = new Date(`${selectedDate}T${slot.startHour.toString().padStart(2, "0")}:00:00`);
    const slotEnd = new Date(`${selectedDate}T${slot.endHour.toString().padStart(2, "0")}:00:00`);

    return myBookings.some((booking) => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      // Check for overlap
      return bookingStart < slotEnd && bookingEnd > slotStart && booking.status === "CONFIRMED";
    });
  };

  /**
   * Check if slot is in the past
   */
  const isPast = (slot: TimeSlot): boolean => {
    const now = new Date();
    const slotStart = new Date(`${selectedDate}T${slot.startHour.toString().padStart(2, "0")}:00:00`);
    return slotStart < now;
  };

  /**
   * Handle booking a slot
   */
  const handleBook = async (slot: TimeSlot) => {
    setError(null);
    setSuccess(null);
    setIsBooking(slot.label);

    try {
      // Create ISO date strings for the booking
      const startTime = new Date(`${selectedDate}T${slot.startHour.toString().padStart(2, "0")}:00:00`);
      const endTime = new Date(`${selectedDate}T${slot.endHour.toString().padStart(2, "0")}:00:00`);

      await bookingApi.createBooking({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });

      setSuccess(`Successfully booked ${slot.label}!`);

      // Refresh bookings
      const bookings = await bookingApi.getBookings({ upcoming: true });
      setMyBookings(bookings);
    } catch (err: any) {
      setError(err.message || "Failed to book slot");
    } finally {
      setIsBooking(null);
    }
  };

  /**
   * Get minimum date (today)
   */
  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  /**
   * Get maximum date (1 year from now)
   */
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split("T")[0];
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book a Gym Slot</h1>
        <p className="text-gray-600 mt-1">Select a date and time to book your workout session</p>
      </div>

      {/* Date Picker Card */}
      <div className="card">
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={getMinDate()}
          max={getMaxDate()}
          className="input max-w-xs"
        />
        <p className="text-sm text-gray-500 mt-2">
          Showing slots for: <span className="font-medium">{formatSelectedDate()}</span>
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Time Slots Grid */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Time Slots</h2>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary-100 border border-primary-300 rounded" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
            <span className="text-gray-600">Your Booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
            <span className="text-gray-600">Past</span>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-8">
            <LoadingSpinner text="Loading slots..." />
          </div>
        )}

        {/* Time slots grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {TIME_SLOTS.map((slot) => {
              const past = isPast(slot);
              const booked = hasMyBooking(slot);
              const isCurrentlyBooking = isBooking === slot.label;

              return (
                <div
                  key={slot.label}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    past
                      ? "bg-gray-50 border-gray-200 opacity-50"
                      : booked
                      ? "bg-blue-50 border-blue-300"
                      : "bg-primary-50 border-primary-200 hover:border-primary-400"
                  }`}
                >
                  {/* Time label */}
                  <div className="font-medium text-gray-900 mb-2">{slot.label}</div>

                  {/* Status or action */}
                  {past ? (
                    <span className="text-sm text-gray-500">Past</span>
                  ) : booked ? (
                    <span className="text-sm text-blue-600 font-medium">Booked</span>
                  ) : (
                    <button
                      onClick={() => handleBook(slot)}
                      disabled={isCurrentlyBooking}
                      className="w-full py-2 px-3 bg-primary-600 text-white text-sm font-medium 
                                 rounded-lg hover:bg-primary-700 disabled:opacity-50 
                                 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCurrentlyBooking ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" />
                          Booking...
                        </span>
                      ) : (
                        "Book Slot"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900">Booking Information</h3>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>Maximum {MAX_CAPACITY} people per time slot</li>
              <li>You can book up to 1 year in advance</li>
              <li>Cancel anytime before your session</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
