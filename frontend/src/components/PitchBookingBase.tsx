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

import React, { useState, useEffect } from "react";
import { AreaSelection, AREA_LABELS } from "@/constants/pitches";
import { pitchApi } from "@/lib/api";

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
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<AreaSelection>("whole");
  const [availability, setAvailability] = useState<PitchAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Booking form state
  const [title, setTitle] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingType, setBookingType] = useState<"SINGLE" | "TEAM">("SINGLE");
  const [partySize, setPartySize] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability();
    }
  }, [selectedDate, pitchId]);

  const fetchAvailability = async () => {
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
  };

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
      alert("Booking created successfully!");
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

      {/* Availability Grid */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Available Time Slots</h2>

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
    </div>
  );
}
