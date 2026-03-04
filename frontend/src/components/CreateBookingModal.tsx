"use client";

/**
 * CreateBookingModal Component
 *
 * Universal booking creation modal that supports all facility types:
 * - Gym bookings (standard time slot)
 * - Pitch bookings (with area selection)
 * - Ball Wall bookings (with court selection)
 * - Committee Room bookings
 *
 * Features:
 * - Facility type selection
 * - Dynamic form fields based on facility
 * - Area/court selection for pitches and ball walls
 * - Time slot selection with availability checking
 * - Color-coded facility indicators
 */

import React, { useState, useEffect, useMemo } from "react";
import { bookingApi, pitchApi } from "@/lib/api";
import { PITCH_IDS } from "@/constants/pitches";
import { BALL_WALL_ID } from "@/constants/ballwall";
import { useAuth } from "@/context/AuthContext";

interface CreateBookingModalProps {
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}

type FacilityType = "gym" | "main-pitch" | "minor-pitch" | "ball-wall";

interface FacilityOption {
  id: string;
  name: string;
  type: FacilityType;
  color: string;
  icon: string;
  supportsAreas: boolean;
}

const FACILITIES: FacilityOption[] = [
  {
    id: "gym",
    name: "Gym",
    type: "gym",
    color: "bg-blue-600",
    icon: "💪",
    supportsAreas: false,
  },
  {
    id: PITCH_IDS.MAIN,
    name: "Main Pitch",
    type: "main-pitch",
    color: "bg-green-600",
    icon: "⚽",
    supportsAreas: true,
  },
  {
    id: PITCH_IDS.MINOR,
    name: "Minor Pitch",
    type: "minor-pitch",
    color: "bg-lime-600",
    icon: "🥅",
    supportsAreas: true,
  },
  {
    id: BALL_WALL_ID,
    name: "Ball Wall",
    type: "ball-wall",
    color: "bg-sky-500",
    icon: "🏐",
    supportsAreas: true,
  },
];

const PITCH_AREAS = [
  { value: "whole", label: "Whole Pitch" },
  { value: "half-top", label: "Half (Top)" },
  { value: "half-bottom", label: "Half (Bottom)" },
  { value: "half-left", label: "Half (Left)" },
  { value: "half-right", label: "Half (Right)" },
  { value: "quarter-tl", label: "Quarter (Top-Left)" },
  { value: "quarter-tr", label: "Quarter (Top-Right)" },
  { value: "quarter-bl", label: "Quarter (Bottom-Left)" },
  { value: "quarter-br", label: "Quarter (Bottom-Right)" },
];

const BALL_WALL_AREAS = [
  { value: "whole", label: "Both Courts" },
  { value: "half-left", label: "Left Court" },
  { value: "half-right", label: "Right Court" },
];

// Helper to format time to HH:MM
const formatTime = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

export default function CreateBookingModal({
  selectedDate,
  onClose,
  onSuccess,
}: CreateBookingModalProps) {
  const { isAdmin, isCoach } = useAuth();
  const [step, setStep] = useState<"facility" | "details">("facility");
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);

  // Filter facilities based on user role
  // Members: Gym and Ball Wall only
  // Coaches: All except can't directly book pitches (need approval)
  // Admins: All facilities
  const availableFacilities = useMemo(() => {
    if (isAdmin) {
      // Admins can book everything
      return FACILITIES;
    } else if (isCoach) {
      // Coaches can book all (but pitch bookings will require approval on backend)
      return FACILITIES;
    } else {
      // Regular members can only book Gym and Ball Wall
      return FACILITIES.filter(f => f.type === "gym" || f.type === "ball-wall");
    }
  }, [isAdmin, isCoach]);

  // Form state
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [area, setArea] = useState("whole");
  const [title, setTitle] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingType, setBookingType] = useState<"SINGLE" | "TEAM">("SINGLE");
  const [partySize, setPartySize] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

  const handleFacilitySelect = (facility: FacilityOption) => {
    setSelectedFacility(facility);
    setStep("details");
    setError(null);
    setAvailabilityMessage(null);

    // Reset area for facilities that don't support it
    if (!facility.supportsAreas) {
      setArea("whole");
    }
  };

  // Check availability when times change
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedFacility || !startTime || !endTime) {
        setAvailabilityMessage(null);
        return;
      }

      // Validate times
      const start = new Date(`${selectedDate.toISOString().split("T")[0]}T${startTime}:00`);
      const end = new Date(`${selectedDate.toISOString().split("T")[0]}T${endTime}:00`);

      if (end <= start) {
        setAvailabilityMessage("⚠️ End time must be after start time");
        return;
      }

      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      if (durationMinutes < 15) {
        setAvailabilityMessage("⚠️ Booking must be at least 15 minutes");
        return;
      }

      if (durationMinutes > 480) {
        setAvailabilityMessage("⚠️ Booking cannot exceed 8 hours");
        return;
      }

      // Check availability for gym bookings
      if (selectedFacility.type === "gym") {
        setChecking(true);
        try {
          const dateStr = selectedDate.toISOString().split("T")[0];
          const startDateTime = `${dateStr}T${startTime}:00Z`;
          const endDateTime = `${dateStr}T${endTime}:00Z`;

          const availability = await bookingApi.checkAvailability(startDateTime, endDateTime);

          const spotsNeeded = partySize;
          const spotsAvailable = 20 - (availability.current_bookings || 0);

          if (spotsAvailable < spotsNeeded) {
            setAvailabilityMessage(
              `❌ Not enough capacity. ${spotsAvailable} spots available, ${spotsNeeded} needed. ` +
              `This time overlaps with existing bookings.`
            );
          } else if (spotsAvailable === 20) {
            setAvailabilityMessage(`✅ Fully available (${spotsAvailable} spots)`);
          } else {
            setAvailabilityMessage(
              `⚠️ ${spotsAvailable} spots available (${availability.current_bookings} already booked). ` +
              `Enough capacity for your booking.`
            );
          }
        } catch (err: any) {
          console.error("Availability check error:", err);
          setAvailabilityMessage(null);
        } finally {
          setChecking(false);
        }
      } else {
        // For pitches/ball walls, just show a general message
        setAvailabilityMessage("ℹ️ Availability will be checked when you submit");
      }
    };

    const debounceTimer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [selectedFacility, startTime, endTime, partySize, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;

    setSubmitting(true);
    setError(null);

    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const startDateTime = `${dateStr}T${startTime}:00Z`;
      const endDateTime = `${dateStr}T${endTime}:00Z`;

      if (selectedFacility.type === "gym") {
        // Gym booking
        await bookingApi.createBooking({
          start_time: startDateTime,
          end_time: endDateTime,
          booking_type: bookingType,
          party_size: partySize,
        });
      } else {
        // Pitch or Ball Wall booking
        await pitchApi.createPitchBooking({
          pitch_id: selectedFacility.id,
          start: startDateTime,
          end: endDateTime,
          title: title || `${selectedFacility.name} Booking`,
          requester_name: requesterName || "Member",
          team_name: teamName || null,
          notes: notes || null,
          area: area,
          booking_type: bookingType,
          party_size: partySize,
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Booking creation error:", err);
      setError(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const getAreaOptions = () => {
    if (selectedFacility?.type === "ball-wall") {
      return BALL_WALL_AREAS;
    }
    return PITCH_AREAS;
  };

  const formatDate = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Create Booking</h3>
              <p className="text-sm text-gray-600 mt-1">{formatDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {step === "facility" ? (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Facility</h4>
              {!isAdmin && !isCoach && (
                <p className="text-sm text-gray-600 mb-4">
                  As a member, you can book the Gym and Ball Wall. Pitch bookings are available to coaches and admins.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableFacilities.map((facility) => (
                  <button
                    key={facility.id}
                    onClick={() => handleFacilitySelect(facility)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-12 h-12 ${facility.color} rounded-lg flex items-center justify-center text-2xl`}>
                        {facility.icon}
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#903838] transition-colors">
                          {facility.name}
                        </h5>
                        <p className="text-xs text-gray-500">
                          {facility.supportsAreas ? "Area selection available" : "Standard booking"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected Facility Display */}
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${selectedFacility?.color} rounded-lg flex items-center justify-center text-xl`}>
                    {selectedFacility?.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedFacility?.name}</p>
                    <p className="text-xs text-gray-500">Selected facility</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("facility")}
                  className="text-sm text-[#903838] hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Time Selection */}
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                      placeholder="HH:MM"
                    />
                    <p className="text-xs text-gray-500 mt-1">Choose any time (e.g., 15:15)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                      placeholder="HH:MM"
                    />
                    <p className="text-xs text-gray-500 mt-1">Choose any time (e.g., 16:15)</p>
                  </div>
                </div>

                {/* Availability Message */}
                {checking && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Checking availability...
                    </p>
                  </div>
                )}

                {!checking && availabilityMessage && (
                  <div
                    className={`mt-3 p-3 border rounded-md ${
                      availabilityMessage.startsWith("✅")
                        ? "bg-green-50 border-green-200"
                        : availabilityMessage.startsWith("❌")
                        ? "bg-red-50 border-red-200"
                        : availabilityMessage.startsWith("⚠️")
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        availabilityMessage.startsWith("✅")
                          ? "text-green-800"
                          : availabilityMessage.startsWith("❌")
                          ? "text-red-800"
                          : availabilityMessage.startsWith("⚠️")
                          ? "text-yellow-800"
                          : "text-blue-800"
                      }`}
                    >
                      {availabilityMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Area Selection (for pitches and ball wall) */}
              {selectedFacility?.supportsAreas && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area/Court <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#903838]"
                  >
                    {getAreaOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title (for pitch/ball wall bookings) */}
              {selectedFacility?.type !== "gym" && (
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
              )}

              {/* Requester Name (for pitch/ball wall bookings) */}
              {selectedFacility?.type !== "gym" && (
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
              )}

              {/* Booking Type */}
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

              {/* Party Size (for team bookings) */}
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

              {/* Team Name (optional) */}
              {selectedFacility?.type !== "gym" && (
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
              )}

              {/* Notes (optional) */}
              {selectedFacility?.type !== "gym" && (
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
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#903838] text-white rounded-md hover:bg-[#7d2f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating..." : "Create Booking"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
