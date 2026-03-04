"use client";

/**
 * PitchBookingBase Component
 *
 * Reusable pitch booking interface with:
 * - Dropdown area selector
 * - Interactive SVG pitch visualization
 * - Date-based availability grid
 * - Booking modal with form
 * - Area-based conflict detection
 */

import React, { useState, useEffect, useCallback } from "react";
import { AreaSelection, AREA_LABELS } from "@/constants/pitches";
import { pitchApi } from "@/lib/api";
import RecurringBookingModal, { RecurringBookingData } from "@/components/RecurringBookingModal";
import { useAuth } from "@/context/AuthContext";

interface PitchBookingBaseProps {
  pitchId: string;
  pitchName: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
  status: "free" | "partial" | "booked";
  available_areas: AreaSelection[];
  booked_areas: AreaSelection[];
}

interface PitchAvailability {
  pitch_id: string;
  pitch_name: string;
  date: string;
  slots: AvailabilitySlot[];
}

export default function PitchBookingBase({ pitchId, pitchName }: PitchBookingBaseProps) {
  const { isCoach } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<AreaSelection>("whole");
  const [availability, setAvailability] = useState<PitchAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringSuccess, setRecurringSuccess] = useState<string | null>(null);

  // Booking form state
  const [title, setTitle] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingType, setBookingType] = useState<"SINGLE" | "TEAM">("SINGLE");
  const [partySize, setPartySize] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Custom time state
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: PitchAvailability = await pitchApi.getPitchAvailability(pitchId, selectedDate);
      setAvailability(data);
    } catch (err: any) {
      console.error("Availability fetch error:", err);
      setError(err.message || "Error loading availability");
    } finally {
      setLoading(false);
    }
  }, [pitchId, selectedDate]);

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability();
    }
  }, [selectedDate, fetchAvailability]);

  const handleSlotClick = (slot: AvailabilitySlot) => {
    if (slot.available_areas.includes(selectedArea)) {
      setSelectedSlot(slot);
      setShowBookingModal(true);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      await pitchApi.createPitchBooking({
        pitch_id: pitchId,
        start: selectedSlot.start,
        end: selectedSlot.end,
        title,
        requester_name: requesterName,
        team_name: teamName || null,
        notes: notes || null,
        area: selectedArea,
        booking_type: bookingType,
        party_size: partySize,
      });

      // Success - close modal and refresh availability
      setShowBookingModal(false);
      setTitle("");
      setRequesterName("");
      setTeamName("");
      setNotes("");
      setBookingType("SINGLE");
      setPartySize(1);
      fetchAvailability();

      // Show appropriate message based on role
      if (isCoach) {
        alert("Booking request submitted! Your booking is pending admin approval. You will be notified once it has been reviewed.");
      } else {
        alert("Booking created successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Error creating booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecurringBooking = async (data: RecurringBookingData) => {
    try {
      const result = await pitchApi.createRecurringPitchBooking({
        pitch_id: pitchId,
        pattern_type: data.pattern_type,
        days_of_week: data.days_of_week,
        start_time: data.start_time,
        duration_mins: data.duration_mins,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        title: data.title || "Recurring Booking",
        requester_name: data.requester_name || "Unknown",
        team_name: data.team_name || null,
        notes: data.notes || null,
        area: selectedArea,
        booking_type: bookingType,
        party_size: partySize,
      });

      // Show appropriate message based on role
      if (isCoach) {
        setRecurringSuccess(
          `Recurring booking requests submitted! ${result.bookings_created} bookings are pending admin approval.` +
          (result.conflicts_skipped > 0 ? ` ${result.conflicts_skipped} skipped due to conflicts.` : "") +
          ` You will be notified once they have been reviewed.`
        );
      } else {
        setRecurringSuccess(
          `Recurring booking created! ${result.bookings_created} bookings created successfully.` +
          (result.conflicts_skipped > 0 ? ` ${result.conflicts_skipped} skipped due to conflicts.` : "")
        );
      }

      setShowRecurringModal(false);
      fetchAvailability();

      // Clear success message after 5 seconds
      setTimeout(() => setRecurringSuccess(null), 5000);
    } catch (err: any) {
      throw new Error(err.message || "Failed to create recurring booking");
    }
  };

  const handleCustomTimeBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate times
    if (!customStartTime || !customEndTime) {
      setError("Please select start and end times");
      return;
    }

    const dateStr = selectedDate;
    const start = new Date(`${dateStr}T${customStartTime}:00`);
    const end = new Date(`${dateStr}T${customEndTime}:00`);

    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      setError("Booking must be at least 15 minutes");
      return;
    }

    if (durationMinutes > 480) {
      setError("Booking cannot exceed 8 hours");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const startDateTime = `${dateStr}T${customStartTime}:00Z`;
      const endDateTime = `${dateStr}T${customEndTime}:00Z`;

      await pitchApi.createPitchBooking({
        pitch_id: pitchId,
        start: startDateTime,
        end: endDateTime,
        title,
        requester_name: requesterName,
        team_name: teamName || null,
        notes: notes || null,
        area: selectedArea,
        booking_type: bookingType,
        party_size: partySize,
      });

      // Success - close modal and refresh availability
      setShowCustomTimeModal(false);
      setTitle("");
      setRequesterName("");
      setTeamName("");
      setNotes("");
      setBookingType("SINGLE");
      setPartySize(1);
      setCustomStartTime("");
      setCustomEndTime("");
      fetchAvailability();
      alert("Custom time booking created successfully!");
    } catch (err: any) {
      setError(err.message || "Error creating booking");
    } finally {
      setSubmitting(false);
    }
  };

  const getAreaColor = (area: AreaSelection): string => {
    if (area === selectedArea) return "#903838"; // Maroon when selected
    return "#e5e7eb"; // Gray when not selected
  };

  const getAreaOpacity = (area: AreaSelection): number => {
    return area === selectedArea ? 0.8 : 0.3;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">{pitchName} Booking</h1>

      {/* Recurring Success Message */}
      {recurringSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{recurringSuccess}</p>
        </div>
      )}

      {/* Date and Area Selection */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
            />
          </div>

          {/* Area Dropdown Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area to Book
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as AreaSelection)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#903838] text-gray-800 font-medium"
            >
              {(Object.keys(AREA_LABELS) as AreaSelection[]).map((area) => (
                <option key={area} value={area}>
                  {AREA_LABELS[area]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pitch Visualization */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Pitch Layout</h2>
        <div className="flex justify-center">
          <svg
            viewBox="0 0 400 600"
            className="w-full max-w-md border-2 border-gray-300 rounded-lg"
            style={{ backgroundColor: "#10b981" }}
          >
            {/* Pitch outline */}
            <rect
              x="50"
              y="50"
              width="300"
              height="500"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />

            {/* Center line (horizontal) */}
            <line
              x1="50"
              y1="300"
              x2="350"
              y2="300"
              stroke="white"
              strokeWidth="2"
            />

            {/* Vertical center line */}
            <line
              x1="200"
              y1="50"
              x2="200"
              y2="550"
              stroke="white"
              strokeWidth="2"
            />

            {/* Whole pitch overlay */}
            {selectedArea === "whole" && (
              <rect
                x="50"
                y="50"
                width="300"
                height="500"
                fill={getAreaColor("whole")}
                opacity={getAreaOpacity("whole")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Half-top */}
            {selectedArea === "half-top" && (
              <rect
                x="50"
                y="50"
                width="300"
                height="250"
                fill={getAreaColor("half-top")}
                opacity={getAreaOpacity("half-top")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Half-bottom */}
            {selectedArea === "half-bottom" && (
              <rect
                x="50"
                y="300"
                width="300"
                height="250"
                fill={getAreaColor("half-bottom")}
                opacity={getAreaOpacity("half-bottom")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Half-left */}
            {selectedArea === "half-left" && (
              <rect
                x="50"
                y="50"
                width="150"
                height="500"
                fill={getAreaColor("half-left")}
                opacity={getAreaOpacity("half-left")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Half-right */}
            {selectedArea === "half-right" && (
              <rect
                x="200"
                y="50"
                width="150"
                height="500"
                fill={getAreaColor("half-right")}
                opacity={getAreaOpacity("half-right")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Quarter top-left */}
            {selectedArea === "quarter-tl" && (
              <rect
                x="50"
                y="50"
                width="150"
                height="250"
                fill={getAreaColor("quarter-tl")}
                opacity={getAreaOpacity("quarter-tl")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Quarter top-right */}
            {selectedArea === "quarter-tr" && (
              <rect
                x="200"
                y="50"
                width="150"
                height="250"
                fill={getAreaColor("quarter-tr")}
                opacity={getAreaOpacity("quarter-tr")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Quarter bottom-left */}
            {selectedArea === "quarter-bl" && (
              <rect
                x="50"
                y="300"
                width="150"
                height="250"
                fill={getAreaColor("quarter-bl")}
                opacity={getAreaOpacity("quarter-bl")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Quarter bottom-right */}
            {selectedArea === "quarter-br" && (
              <rect
                x="200"
                y="300"
                width="150"
                height="250"
                fill={getAreaColor("quarter-br")}
                opacity={getAreaOpacity("quarter-br")}
                stroke="#7d2f2f"
                strokeWidth="3"
              />
            )}

            {/* Labels */}
            <text x="200" y="30" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {pitchName}
            </text>

            {/* Selected area label */}
            <text x="200" y="580" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
              Selected: {AREA_LABELS[selectedArea]}
            </text>
          </svg>
        </div>
      </div>

      {/* Recurring Booking Prompt */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Need regular training sessions?
            </h3>
            <p className="text-sm text-blue-800">
              Create a recurring booking to reserve {pitchName} at the same time every week or daily
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

      {/* Availability Grid */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Available Time Slots</h2>
          <button
            onClick={() => setShowCustomTimeModal(true)}
            className="px-4 py-2 bg-[#903838] text-white rounded-lg hover:bg-[#7d2f2f] transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Custom Time
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#903838]"></div>
            <p className="mt-2 text-gray-600">Loading availability...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && availability && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availability.slots.map((slot, index) => {
              const isAvailable = slot.available_areas.includes(selectedArea);
              const startTime = new Date(slot.start).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const endTime = new Date(slot.end).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={index}
                  onClick={() => isAvailable && handleSlotClick(slot)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isAvailable
                      ? "border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 hover:shadow-md"
                      : "border-red-300 bg-red-50 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {startTime} - {endTime}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isAvailable ? (
                          <span className="text-green-700 font-medium">Available</span>
                        ) : (
                          <span className="text-red-700 font-medium">Not Available</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        slot.status === "free"
                          ? "bg-green-200 text-green-800"
                          : slot.status === "partial"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {slot.status}
                    </span>
                  </div>
                  {slot.status !== "free" && (
                    <div className="text-xs text-gray-500 mt-2">
                      {slot.booked_areas.length > 0 && (
                        <p>Booked: {slot.booked_areas.map((a) => AREA_LABELS[a]).join(", ")}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && availability && availability.slots.length === 0 && (
          <p className="text-center text-gray-500 py-8">No time slots available for this date.</p>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">Create Booking</h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Time Slot</p>
                <p className="font-semibold text-gray-800">
                  {new Date(selectedSlot.start).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(selectedSlot.end).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">Area</p>
                <p className="font-semibold text-[#903838]">{AREA_LABELS[selectedArea]}</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    minLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="e.g., Training Session"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requester Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bookingType}
                    onChange={(e) => {
                      const type = e.target.value as "SINGLE" | "TEAM";
                      setBookingType(type);
                      if (type === "SINGLE") {
                        setPartySize(1);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                  >
                    <option value="SINGLE">Individual</option>
                    <option value="TEAM">Team</option>
                  </select>
                </div>

                {bookingType === "TEAM" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of People <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                      min={1}
                      max={20}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                      placeholder="How many people?"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum 20 people</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="e.g., Under 16s"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="Any additional information..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-[#903838] text-white rounded-md hover:bg-[#7d2f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Time Booking Modal */}
      {showCustomTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">Custom Time Booking</h3>
                <button
                  onClick={() => {
                    setShowCustomTimeModal(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold text-gray-800">{selectedDate}</p>
                <p className="text-sm text-gray-600 mt-2">Area</p>
                <p className="font-semibold text-[#903838]">{AREA_LABELS[selectedArea]}</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleCustomTimeBooking} className="space-y-4">
                {/* Custom Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Selection <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                      />
                      <p className="text-xs text-gray-500 mt-1">e.g., 15:15</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                      />
                      <p className="text-xs text-gray-500 mt-1">e.g., 16:45</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    ℹ️ Choose any time - not restricted to hourly slots
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    minLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="e.g., Training Session"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requester Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bookingType}
                    onChange={(e) => {
                      const type = e.target.value as "SINGLE" | "TEAM";
                      setBookingType(type);
                      if (type === "SINGLE") {
                        setPartySize(1);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                  >
                    <option value="SINGLE">Individual</option>
                    <option value="TEAM">Team</option>
                  </select>
                </div>

                {bookingType === "TEAM" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of People <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                      min={1}
                      max={20}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                      placeholder="How many people?"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum 20 people</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="e.g., Under 16s"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                    placeholder="Any additional information..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomTimeModal(false);
                      setError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-[#903838] text-white rounded-md hover:bg-[#7d2f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Booking Modal */}
      {showRecurringModal && (
        <RecurringBookingModal
          onClose={() => setShowRecurringModal(false)}
          onSubmit={handleRecurringBooking}
          selectedTime={customStartTime}
          minDate={selectedDate}
        />
      )}
    </div>
  );
}
