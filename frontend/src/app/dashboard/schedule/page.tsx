"use client";

/**
 * Schedule Page
 *
 * Monthly calendar view showing all upcoming bookings across all facilities.
 * Features:
 * - Monthly calendar layout with swipe support
 * - Click on day to see detailed bookings
 * - Create new bookings from calendar
 * - Color-coded by facility
 * - Visual booking indicators
 */

import React, { useState } from "react";
import MonthlyCalendar from "@/components/MonthlyCalendar";
import CreateBookingModal from "@/components/CreateBookingModal";
import { Booking } from "@/types";

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayBookings, setSelectedDayBookings] = useState<Booking[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDayClick = (date: Date, bookings: Booking[]) => {
    setSelectedDate(date);
    setSelectedDayBookings(bookings);
    setShowDayModal(true);
  };

  const handleCreateBooking = () => {
    setShowDayModal(false);
    setShowCreateModal(true);
  };

  const handleBookingCreated = () => {
    setShowCreateModal(false);
    setShowDayModal(false);
    // Refresh calendar by updating key
    setRefreshKey(prev => prev + 1);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: date.toLocaleDateString("en-GB", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };
  };

  const getFacilityBadgeColor = (booking: Booking): string => {
    const facilityName = booking.resource_name?.toLowerCase() || "";

    // Gym - Blue
    if (facilityName.includes("gym")) return "bg-blue-100 text-blue-800 border border-blue-200";

    // Main Pitch - Green
    if (facilityName.includes("main pitch")) return "bg-green-100 text-green-800 border border-green-200";

    // Minor Pitch - Lime
    if (facilityName.includes("minor pitch")) return "bg-lime-100 text-lime-800 border border-lime-200";

    // Ball Wall - Sky Blue
    if (facilityName.includes("ball wall")) return "bg-sky-100 text-sky-800 border border-sky-200";

    // Committee Room A - Purple
    if (facilityName.includes("room a")) return "bg-purple-100 text-purple-800 border border-purple-200";

    // Committee Room B - Violet
    if (facilityName.includes("room b")) return "bg-violet-100 text-violet-800 border border-violet-200";

    // Generic Room - Purple
    if (facilityName.includes("room")) return "bg-purple-100 text-purple-800 border border-purple-200";

    return "bg-gray-100 text-gray-800 border border-gray-200";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600 mt-1">View all your upcoming bookings in calendar format</p>
        </div>
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-[#903838] text-white rounded-lg hover:bg-[#7d2f2f] transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Booking
        </button>
      </div>

      {/* Facility Legend Card */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Facility Color Guide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="w-4 h-4 rounded-full bg-blue-600 flex-shrink-0"></div>
            <span className="text-sm font-medium text-blue-900">Gym</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
            <div className="w-4 h-4 rounded-full bg-green-600 flex-shrink-0"></div>
            <span className="text-sm font-medium text-green-900">Main Pitch</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-lime-50 border border-lime-200">
            <div className="w-4 h-4 rounded-full bg-lime-600 flex-shrink-0"></div>
            <span className="text-sm font-medium text-lime-900">Minor Pitch</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 border border-sky-200">
            <div className="w-4 h-4 rounded-full bg-sky-500 flex-shrink-0"></div>
            <span className="text-sm font-medium text-sky-900">Ball Wall</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
            <div className="w-4 h-4 rounded-full bg-purple-600 flex-shrink-0"></div>
            <span className="text-sm font-medium text-purple-900">Room A</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 border border-violet-200">
            <div className="w-4 h-4 rounded-full bg-violet-600 flex-shrink-0"></div>
            <span className="text-sm font-medium text-violet-900">Room B</span>
          </div>
        </div>
      </div>

      {/* Monthly Calendar */}
      <MonthlyCalendar key={refreshKey} onDayClick={handleDayClick} />

      {/* Day View Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {formatDateTime(selectedDate.toISOString()).date}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDayBookings.length} booking{selectedDayBookings.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setShowDayModal(false)}
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

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDayBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">No bookings for this day</p>
                  <button
                    onClick={handleCreateBooking}
                    className="px-4 py-2 bg-[#903838] text-white rounded-lg hover:bg-[#7d2f2f] transition-colors font-medium inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Booking
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .map((booking) => {
                      const start = formatDateTime(booking.start_time);
                      const end = formatDateTime(booking.end_time);

                      return (
                        <div
                          key={booking.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {start.time} - {end.time}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getFacilityBadgeColor(
                                    booking
                                  )}`}
                                >
                                  {booking.resource_name || "Gym"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>
                                  {booking.booking_type === "TEAM"
                                    ? `Team (${booking.party_size} people)`
                                    : "Individual"}
                                </span>
                              </div>

                              {/* Show area if it's a pitch/ball wall booking */}
                              {booking.area && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Area: {booking.area}
                                </div>
                              )}
                            </div>

                            <span
                              className={`badge ${
                                booking.status === "CONFIRMED" ? "badge-success" : "badge-gray"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>

                          {/* Additional details if available */}
                          {booking.title && (
                            <div className="text-sm text-gray-700 mt-2 font-medium">
                              {booking.title}
                            </div>
                          )}
                          {booking.creator_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              Created by: {booking.creator_name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={handleCreateBooking}
                className="flex-1 px-4 py-2 bg-[#903838] text-white rounded-lg hover:bg-[#7d2f2f] transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Booking
              </button>
              <button
                onClick={() => setShowDayModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <CreateBookingModal
          selectedDate={selectedDate || new Date()}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleBookingCreated}
        />
      )}
    </div>
  );
}
