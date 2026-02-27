"use client";

import { useState } from "react";
import { bookingApi } from "@/lib/api";

export default function DeleteCancelledButton({
  bookingId,
  onDeleted,
}: {
  bookingId: string;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm("Are you sure you want to permanently delete this cancelled booking?")) {
      return;
    }

    setLoading(true);
    await bookingApi.deleteCancelled(bookingId);
    setLoading(false);
    onDeleted();
  }

  return (
    <button
      className="px-3 py-1 bg-red-700 text-white rounded text-sm"
      disabled={loading}
      onClick={del}
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}