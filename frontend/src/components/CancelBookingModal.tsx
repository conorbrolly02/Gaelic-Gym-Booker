"use client";

import { useState } from "react";
import { bookingApi } from "@/lib/api";
import { CancelBookingRequest, Booking } from "@/types";

export default function CancelBookingModal({
  booking,
  onClose,
  onCancelled,
}: {
  booking: Booking;
  onClose: () => void;
  onCancelled: (b: Booking) => void;
}) {
  const [form, setForm] = useState<CancelBookingRequest>({
    reason_code: "MEMBER_REQUEST",
    note: "",
  });

  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      const cancelled = await bookingApi.cancel(booking.id, form);
      onCancelled(cancelled);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">

        <h2 className="text-xl font-semibold mb-4">Cancel Booking</h2>

        <label className="block text-sm font-medium mb-2">Reason</label>
        <select
          className="border p-2 rounded w-full"
          value={form.reason_code ?? ""}
          onChange={(e) => setForm({ ...form, reason_code: e.target.value })}
        >
          <option value="MEMBER_REQUEST">Member Request</option>
          <option value="LATE_CANCELLATION">Late Cancellation</option>
          <option value="WEATHER">Weather</option>
          <option value="OTHER">Other</option>
        </select>

        <label className="block mt-4 mb-2 text-sm font-medium">Note (optional)</label>
        <textarea
          className="border p-2 rounded w-full"
          value={form.note ?? ""}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        {error && <div className="text-red-600 text-sm mt-3">{error}</div>}

        <div className="flex justify-end mt-6 gap-2">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>
            Close
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded"
            onClick={submit}
          >
            Cancel Booking
          </button>
        </div>

      </div>
    </div>
  );
}