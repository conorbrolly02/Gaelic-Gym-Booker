"use client";

import { useState } from "react";
import { bookingApi, adminApi } from "@/lib/api";
import { EditBookingRequest, Booking } from "@/types";

export default function EditBookingModal({
  booking,
  onClose,
  onUpdated,
  isAdmin = false,
}: {
  booking: Booking;
  onClose: () => void;
  onUpdated: (b: Booking) => void;
  isAdmin?: boolean;
})

{
  const [form, setForm] = useState<EditBookingRequest>({
    version: booking.version || 1,
    start_time: booking.start_time,
    end_time: booking.end_time,
    resource_id: booking.resource_id,
    party_size: booking.party_size,
    scope: "THIS",
    reason: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save() {
    setIsSubmitting(true);
    setError(null);
    try {
      // Use admin API if editing as admin, otherwise use regular booking API
      const updated = isAdmin
        ? await adminApi.editBooking(booking.id, form)
        : await bookingApi.editBooking(booking.id, form);
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Booking</h2>

        <label className="block mb-2 text-sm font-medium">Start Time</label>
        <input
          type="datetime-local"
          value={form.start_time?.slice(0, 16)}
          onChange={(e) =>
            setForm({ ...form, start_time: new Date(e.target.value).toISOString() })
          }
          className="w-full border p-2 rounded"
        />

        <label className="block mt-4 mb-2 text-sm font-medium">End Time</label>
        <input
          type="datetime-local"
          value={form.end_time?.slice(0, 16)}
          onChange={(e) =>
            setForm({ ...form, end_time: new Date(e.target.value).toISOString() })
          }
          className="w-full border p-2 rounded"
        />

        <label className="block mt-4 mb-2 text-sm font-medium">Reason (optional)</label>
        <textarea
          value={form.reason ?? ""}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full border p-2 rounded"
        />

        {error && <div className="text-red-600 mt-3 text-sm">{error}</div>}

        <div className="flex justify-end mt-6 gap-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={save}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}