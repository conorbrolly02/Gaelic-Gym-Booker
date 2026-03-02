"use client";

/**
 * MonthlyCalendar Component
 *
 * A traditional monthly calendar view showing bookings across all facilities.
 * Features:
 * - Month/year navigation
 * - Visual booking indicators
 * - Click on day to see all bookings
 * - Color-coded by facility type
 * - Shows booking count per day
 */

import React, { useState, useEffect } from "react";
import { Booking } from "@/types";
import { bookingApi } from "@/lib/api";

interface MonthlyCalendarProps {
  onDayClick?: (date: Date, bookings: Booking[]) => void;
}

export default function MonthlyCalendar({ onDayClick }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Swipe handling for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

  // Fetch bookings for current month
  useEffect(() => {
    fetchMonthBookings();
  }, [currentMonth, currentYear]);

  const fetchMonthBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Determine if we're viewing a past, current, or future month
      const today = new Date();
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      // Check if this month is in the past
      const isPastMonth = monthEnd < today;

      // Fetch appropriate bookings
      let data: any[];
      if (isPastMonth) {
        // For past months, fetch past bookings
        data = await bookingApi.getBookings({ past: true });
      } else {
        // For current/future months, fetch upcoming bookings
        data = await bookingApi.getBookings({ upcoming: true });
      }

      // Filter to current month
      const filtered = data.filter((booking) => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });

      setBookings(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  // Navigate to previous month
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days for the current month
  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date): Booking[] => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_time);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is in the past
  const isPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  // Get facility color for booking indicator
  const getFacilityColor = (booking: Booking): string => {
    const facilityName = booking.resource_name?.toLowerCase() || "";

    // Gym - Blue
    if (facilityName.includes("gym")) return "bg-blue-600";

    // Main Pitch - Green
    if (facilityName.includes("main pitch")) return "bg-green-600";

    // Minor Pitch - Lime
    if (facilityName.includes("minor pitch")) return "bg-lime-600";

    // Ball Wall - Sky Blue
    if (facilityName.includes("ball wall")) return "bg-sky-500";

    // Committee Rooms - Purple/Violet
    if (facilityName.includes("room a")) return "bg-purple-600";
    if (facilityName.includes("room b")) return "bg-violet-600";
    if (facilityName.includes("room")) return "bg-purple-500";

    return "bg-gray-500";
  };

  // Touch handlers for swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextMonth(); // Swipe left = next month
    }
    if (isRightSwipe) {
      previousMonth(); // Swipe right = previous month
    }
  };

  const calendarDays = getCalendarDays();
  const monthName = currentDate.toLocaleDateString("en-IE", { month: "long", year: "numeric" });

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-[#903838] to-[#7d2f2f] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{monthName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-white/90">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-600 border border-white/20"></div>
            <span className="font-medium">Gym</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-600 border border-white/20"></div>
            <span className="font-medium">Main Pitch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-lime-600 border border-white/20"></div>
            <span className="font-medium">Minor Pitch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sky-500 border border-white/20"></div>
            <span className="font-medium">Ball Wall</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-600 border border-white/20"></div>
            <span className="font-medium">Room A</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-violet-600 border border-white/20"></div>
            <span className="font-medium">Room B</span>
          </div>
        </div>
      </div>

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-gray-600 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#903838]"></div>
          <p className="mt-2 text-gray-600">Loading calendar...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="border border-gray-100 bg-gray-50 aspect-square" />;
            }

            const dayBookings = getBookingsForDate(date);
            const isTodayDate = isToday(date);
            const isPastDate = isPast(date);

            return (
              <div
                key={index}
                onClick={() => onDayClick && onDayClick(date, dayBookings)}
                className={`
                  border border-gray-100 p-2 min-h-[100px] aspect-square
                  transition-colors cursor-pointer
                  ${isTodayDate ? "bg-red-50 border-red-300" : "bg-white hover:bg-gray-50"}
                  ${isPastDate && !isTodayDate ? "opacity-60" : ""}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm font-semibold
                      ${isTodayDate ? "text-red-700" : isPastDate ? "text-gray-400" : "text-gray-700"}
                    `}
                  >
                    {date.getDate()}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {dayBookings.length}
                    </span>
                  )}
                </div>

                {/* Booking indicators */}
                {dayBookings.length > 0 && (
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map((booking, idx) => (
                      <div
                        key={booking.id}
                        className="text-xs truncate flex items-center gap-1"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getFacilityColor(booking)}`}></div>
                        <span className="text-gray-700 truncate">
                          {new Date(booking.start_time).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
