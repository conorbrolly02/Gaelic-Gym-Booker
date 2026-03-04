"use client";

/**
 * Recurring Booking Modal Component
 *
 * Allows users to create recurring/block bookings with:
 * - Pattern type: Daily or Weekly
 * - Date range selection
 * - Day of week selection (for weekly)
 * - Time and duration
 * - Preview of bookings to be created
 */

import React, { useState, useEffect } from "react";

interface RecurringBookingModalProps {
  onClose: () => void;
  onSubmit: (data: RecurringBookingData) => Promise<void>;
  selectedTime?: string; // Pre-selected start time (HH:MM)
  minDate?: string; // Minimum selectable date (YYYY-MM-DD)
}

export interface RecurringBookingData {
  pattern_type: "daily" | "weekly";
  days_of_week: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:MM
  duration_mins: number;
  valid_from: string; // YYYY-MM-DD
  valid_until: string; // YYYY-MM-DD
  title?: string;
  requester_name?: string;
  team_name?: string;
  notes?: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function RecurringBookingModal({
  onClose,
  onSubmit,
  selectedTime,
  minDate,
}: RecurringBookingModalProps) {
  const [patternType, setPatternType] = useState<"daily" | "weekly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(selectedTime || "");
  const [durationMins, setDurationMins] = useState(60);
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [notes, setNotes] = useState("");

  // Set default dates and reset error on mount
  useEffect(() => {
    // Clear any previous errors when modal opens
    setError(null);
    setSubmitting(false);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const oneMonthStr = oneMonthLater.toISOString().split("T")[0];

    setValidFrom(minDate || tomorrowStr);
    setValidUntil(oneMonthStr);
  }, [minDate]);

  // Calculate preview count and clear errors when dates change
  useEffect(() => {
    // Clear error when user changes dates after a validation error
    if (error && (validFrom || validUntil)) {
      setError(null);
    }

    if (!validFrom || !validUntil || !startTime) {
      setPreviewCount(null);
      return;
    }

    const start = new Date(validFrom);
    const end = new Date(validUntil);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let count = 0;
    if (patternType === "daily") {
      count = daysDiff;
    } else if (patternType === "weekly" && selectedDays.length > 0) {
      const weeks = Math.ceil(daysDiff / 7);
      count = weeks * selectedDays.length;
    }

    setPreviewCount(count);
  }, [patternType, selectedDays, validFrom, validUntil, startTime, error]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(false); // Reset submitting state in case it was stuck

    // Validation
    if (!title || title.length < 3) {
      setError("Please enter a title (minimum 3 characters)");
      return;
    }

    if (!requesterName || requesterName.length < 2) {
      setError("Please enter requester name (minimum 2 characters)");
      return;
    }

    if (!startTime) {
      setError("Please select a start time");
      return;
    }

    if (patternType === "weekly" && selectedDays.length === 0) {
      setError("Please select at least one day of the week");
      return;
    }

    if (durationMins < 15) {
      setError("Duration must be at least 15 minutes");
      return;
    }

    if (durationMins > 480) {
      setError("Duration cannot exceed 8 hours");
      return;
    }

    const start = new Date(validFrom);
    const end = new Date(validUntil);
    if (end <= start) {
      setError("End date must be after start date");
      return;
    }

    const maxDays = 365;
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      setError(`Recurring bookings cannot span more than ${maxDays} days`);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        pattern_type: patternType,
        days_of_week: patternType === "daily" ? [] : selectedDays,
        start_time: startTime,
        duration_mins: durationMins,
        valid_from: validFrom,
        valid_until: validUntil,
        title,
        requester_name: requesterName,
        team_name: teamName || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create recurring booking");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Create Recurring Booking</h3>
              <p className="text-sm text-gray-600 mt-1">
                Book the same time slot repeatedly
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Details */}
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
                placeholder="e.g., Weekly Training Session"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name (Optional)
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Under 16s"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional info"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Pattern Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat Pattern <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPatternType("daily")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    patternType === "daily"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="font-medium text-gray-900">Daily</div>
                    <div className="text-xs text-gray-500 mt-1">Every day in range</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPatternType("weekly")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    patternType === "weekly"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📆</div>
                    <div className="font-medium text-gray-900">Weekly</div>
                    <div className="text-xs text-gray-500 mt-1">Specific days each week</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Day Selection (for weekly) */}
            {patternType === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Days <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`p-3 border-2 rounded-lg font-medium transition-all ${
                        selectedDays.includes(day.value)
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    Selected: {selectedDays.length} day{selectedDays.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {/* Time and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  min={minDate || new Date().toISOString().split("T")[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={validFrom}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Date Range Buttons */}
            <div>
              <p className="text-xs text-gray-600 mb-2">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "1 week", days: 7 },
                  { label: "2 weeks", days: 14 },
                  { label: "1 month", days: 30 },
                  { label: "2 months", days: 60 },
                  { label: "3 months", days: 90 },
                ].map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => {
                      const from = new Date(validFrom || Date.now());
                      const until = new Date(from);
                      until.setDate(until.getDate() + option.days);
                      setValidUntil(until.toISOString().split("T")[0]);
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewCount !== null && previewCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-semibold text-blue-900 mb-1">Preview</h4>
                <p className="text-sm text-blue-800">
                  This will create approximately <strong>{previewCount}</strong> booking
                  {previewCount > 1 ? "s" : ""} between {validFrom} and {validUntil}.
                </p>
                {patternType === "weekly" && selectedDays.length > 0 && (
                  <p className="text-xs text-blue-700 mt-2">
                    Repeating on: {selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
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
                disabled={submitting || (patternType === "weekly" && selectedDays.length === 0)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create Recurring Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
