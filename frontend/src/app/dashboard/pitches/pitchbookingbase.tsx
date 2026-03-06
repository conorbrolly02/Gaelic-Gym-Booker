"use client";

import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { pitchApi } from "@/lib/api";
import Alert from "@/components/Alert";
import { useAuth } from "@/context/AuthContext";
import GaaPitchSvg, {
  AreaMode,
  AreaSelection,
  areaLabel,
} from "@/components/GaaPitchSvg";

/* -------------------------------------------
   TYPES
-------------------------------------------- */
type AvailabilitySlot = {
  start: string;
  end: string;
  status: "free" | "partial" | "booked";
};

type NewBookingPayload = {
  pitch_id: string;
  start: string;
  end: string;
  title: string;
  requester_name: string;
  team_name?: string | null;
  notes?: string | null;
  area: string;
  booking_type: "SINGLE" | "TEAM";
  party_size: number;
  changing_room_ids?: string[] | null;
};

/* -------------------------------------------
   COMPONENT
-------------------------------------------- */
export default function PitchBookingBase({
  pitchId,
  title,
  subtitle,
  flipX = false,
  flipY = false,
}: {
  pitchId: number | string;
  title: string;
  subtitle: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  // Get current user info
  const { member } = useAuth();

  // Date & availability
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Area selection
  const [areaMode, setAreaMode] = useState<AreaMode>("whole");
  const [area, setArea] = useState<AreaSelection>("whole");

  // Booking modal
  const [modalOpen, setModalOpen] = useState(false);
  const [slotToBook, setSlotToBook] = useState<AvailabilitySlot | null>(null);

  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingRequester, setBookingRequester] = useState("");
  const [bookingTeam, setBookingTeam] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  /* -------------------------------------------
     LOAD AVAILABILITY
  -------------------------------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingSlots(true);
        setError(null);
        const daySlots = await pitchApi.getPitchAvailability(String(pitchId), date);
        if (mounted) setSlots(daySlots ?? []);
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? "Failed to load availability.");
          setSlots([]);
        }
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pitchId, date]);

  /* -------------------------------------------
     AREA MODE DEFAULTS
  -------------------------------------------- */
  useEffect(() => {
    // When switching mode, pick a sensible default zone
    if (areaMode === "whole") setArea("whole");
    if (areaMode === "half") setArea(flipX ? "half-right" : "half-left");
    if (areaMode === "quarter") setArea(flipX ? "quarter-tr" : "quarter-tl");
  }, [areaMode, flipX]);

  /* -------------------------------------------
     HANDLERS
  -------------------------------------------- */
  const onClickSlot = (slot: AvailabilitySlot) => {
    if (slot.status !== "free") return;
    setSlotToBook(slot);
    setBookingError(null);
    setBookingSuccess(null);
    // Default requester name to current user's name
    setBookingRequester(member?.full_name || "");
    setModalOpen(true);
  };

  const onSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotToBook) return;

    if (!bookingTitle.trim()) {
      setBookingError("Please enter a booking title.");
      return;
    }
    if (!bookingRequester.trim()) {
      setBookingError("Please enter the requester name.");
      return;
    }

    const notesWithArea = bookingNotes
      ? `${bookingNotes.trim()} | Area: ${areaLabel(area)}`
      : `Area: ${areaLabel(area)}`;

    const payload: NewBookingPayload = {
      pitch_id: String(pitchId),
      start: slotToBook.start,
      end: slotToBook.end,
      title: bookingTitle.trim(),
      requester_name: bookingRequester.trim(),
      team_name: bookingTeam.trim() || null,
      notes: notesWithArea,
      area,
      booking_type: "SINGLE",
      party_size: 1,
    };

    try {
      setBookingSubmitting(true);
      await pitchApi.createPitchBooking(payload);
      setBookingSuccess("Booking created successfully.");
      const refreshed = await pitchApi.getPitchAvailability(String(pitchId), date);
      setSlots(refreshed ?? []);

      setTimeout(() => {
        setModalOpen(false);
        setSlotToBook(null);
        setBookingTitle("");
        setBookingRequester("");
        setBookingTeam("");
        setBookingNotes("");
      }, 600);
    } catch (err: any) {
      setBookingError(err?.message ?? "Failed to create booking.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  /* -------------------------------------------
     UI
  -------------------------------------------- */
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </header>

      {/* Pitch SVG + area selector */}
      <section className="card p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Select area</h2>

        <div className="flex flex-wrap gap-2 mb-3">
          <Toggle
            active={areaMode === "whole"}
            onClick={() => setAreaMode("whole")}
            label="Whole"
          />
          <Toggle
            active={areaMode === "half"}
            onClick={() => setAreaMode("half")}
            label="Half"
          />
          <Toggle
            active={areaMode === "quarter"}
            onClick={() => setAreaMode("quarter")}
            label="Quarter"
          />
        </div>

        <GaaPitchSvg
          areaMode={areaMode}
          selected={area}
          onSelect={setArea}
          flipX={flipX}
          flipY={flipY}
          className="max-w-3xl mx-auto"
        />

        {/* Secondary chip controls for precision / accessibility */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {areaMode === "whole" && (
            <Chip active={area === "whole"} onClick={() => setArea("whole")}>
              Whole pitch
            </Chip>
          )}
          {areaMode === "half" && (
            <>
              <Chip
                active={area === (flipX ? "half-right" : "half-left")}
                onClick={() => setArea(flipX ? "half-right" : "half-left")}
              >
                {flipX ? "Right half" : "Left half"}
              </Chip>
              <Chip
                active={area === (flipX ? "half-left" : "half-right")}
                onClick={() => setArea(flipX ? "half-left" : "half-right")}
              >
                {flipX ? "Left half" : "Right half"}
              </Chip>
            </>
          )}
          {areaMode === "quarter" && (
            <>
              <Chip
                active={area === (flipX ? "quarter-tr" : "quarter-tl")}
                onClick={() => setArea(flipX ? "quarter-tr" : "quarter-tl")}
              >
                {flipX ? "Top-right" : "Top-left"}
              </Chip>
              <Chip
                active={area === (flipX ? "quarter-tl" : "quarter-tr")}
                onClick={() => setArea(flipX ? "quarter-tl" : "quarter-tr")}
              >
                {flipX ? "Top-left" : "Top-right"}
              </Chip>
              <Chip
                active={area === (flipX ? "quarter-br" : "quarter-bl")}
                onClick={() => setArea(flipX ? "quarter-br" : "quarter-bl")}
              >
                {flipX ? "Bottom-right" : "Bottom-left"}
              </Chip>
              <Chip
                active={area === (flipX ? "quarter-bl" : "quarter-br")}
                onClick={() => setArea(flipX ? "quarter-bl" : "quarter-br")}
              >
                {flipX ? "Bottom-left" : "Bottom-right"}
              </Chip>
            </>
          )}
        </div>

        <p className="mt-2 text-center text-sm text-gray-600">
          Selected area: <span className="font-medium">{areaLabel(area)}</span>
        </p>
      </section>

      {/* Date selector */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            className="mt-1 rounded-md border-gray-300 focus:ring-primary-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Availability */}
      <section className="card p-4">
        <h2 className="text-lg font-semibold text-gray-900">Availability</h2>
        <p className="text-sm text-gray-500 mb-3">
          Click a <span className="text-green-700 font-medium">free</span> slot to book.
        </p>

        {loadingSlots ? (
          <div className="py-10">
            <LoadingSpinner text="Loading availability…" />
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500">No slots available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map((s) => {
              const now = new Date();
              const slotEnd = new Date(s.end);
              const isPast = slotEnd < now;
              const isFree = s.status === "free" && !isPast;

              const bg = isPast
                ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                : s.status === "free"
                  ? "bg-green-50 border-green-400 hover:shadow hover:scale-[1.01]"
                  : s.status === "partial"
                  ? "bg-yellow-50 border-yellow-400 opacity-80"
                  : "bg-red-50 border-red-400 opacity-80";

              return (
                <button
                  key={`${s.start}-${s.end}`}
                  onClick={() => isFree && onClickSlot(s)}
                  disabled={!isFree}
                  className={`text-left p-3 rounded-lg border transition ${bg}`}
                >
                  <p className="font-medium">
                    {new Date(s.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(s.end).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs mt-1">
                    {isPast
                      ? "Past"
                      : isFree
                        ? "Free"
                        : s.status === "partial"
                          ? "Partially booked"
                          : "Booked"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Booking modal */}
      {modalOpen && slotToBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !bookingSubmitting && setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg p-6 bg-white rounded-2xl shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">Confirm booking</h3>
            <p className="text-sm text-gray-600 mb-4">
              {new Date(slotToBook.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
              –{" "}
              {new Date(slotToBook.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
              · {areaLabel(area)}
            </p>

            {bookingError && (
              <div className="mb-3">
                <Alert type="error" message={bookingError} onClose={() => setBookingError(null)} />
              </div>
            )}
            {bookingSuccess && (
              <div className="mb-3">
                <Alert type="success" message={bookingSuccess} onClose={() => setBookingSuccess(null)} />
              </div>
            )}

            <form onSubmit={onSubmitBooking} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  className="mt-1 w-full rounded-md border-gray-300 focus:ring-primary-500"
                  placeholder="e.g. U13 training"
                  value={bookingTitle}
                  onChange={(e) => setBookingTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Requester</label>
                  <input
                    className="mt-1 w-full rounded-md border-gray-300 focus:ring-primary-500"
                    placeholder="e.g. Conor Brolly"
                    value={bookingRequester}
                    onChange={(e) => setBookingRequester(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Team (optional)</label>
                  <input
                    className="mt-1 w-full rounded-md border-gray-300 focus:ring-primary-500"
                    placeholder="e.g. Minors"
                    value={bookingTeam}
                    onChange={(e) => setBookingTeam(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-md border-gray-300 focus:ring-primary-500"
                  rows={3}
                  placeholder="Additional info for admins"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                    bookingSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary-600 hover:bg-primary-700"
                  }`}
                >
                  {bookingSubmitting ? "Booking…" : "Confirm booking"}
                </button>
                <button
                  type="button"
                  disabled={bookingSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------
   SMALL UI PIECES
-------------------------------------------- */

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition
        ${active ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
      `}
    >
      {label}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition
        ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
      `}
    >
      {children}
    </button>
  );
}
