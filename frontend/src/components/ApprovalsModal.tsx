"use client";

import React, { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { PendingMember, PendingBooking } from "@/types";
import LoadingSpinner from "./LoadingSpinner";
import Alert from "./Alert";

interface ApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovalComplete?: () => void;
}

export default function ApprovalsModal({
  isOpen,
  onClose,
  onApprovalComplete,
}: ApprovalsModalProps) {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending approvals when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPendingApprovals();
    }
  }, [isOpen]);

  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.getPendingApprovals();
      setPendingMembers(data.pending_members);
      setPendingBookings(data.pending_bookings);
    } catch (err: any) {
      setError(err.message || "Failed to load pending approvals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      setProcessingId(memberId);
      setError(null);
      await adminApi.approveMember(memberId);
      setSuccess("Member approved successfully!");
      setPendingMembers(pendingMembers.filter((m) => m.id !== memberId));
      if (onApprovalComplete) onApprovalComplete();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to approve member");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      setProcessingId(bookingId);
      setError(null);
      await adminApi.approveBooking(bookingId);
      setSuccess("Booking approved successfully!");
      setPendingBookings(pendingBookings.filter((b) => b.id !== bookingId));
      if (onApprovalComplete) onApprovalComplete();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to approve booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      setProcessingId(bookingId);
      setError(null);
      await adminApi.cancelBooking(bookingId);
      setSuccess("Booking rejected successfully!");
      setPendingBookings(pendingBookings.filter((b) => b.id !== bookingId));
      if (onApprovalComplete) onApprovalComplete();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reject booking");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Pending Approvals
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alerts */}
            {error && (
              <Alert type="error" message={error} onClose={() => setError(null)} />
            )}
            {success && (
              <Alert
                type="success"
                message={success}
                onClose={() => setSuccess(null)}
              />
            )}

            {/* Loading */}
            {isLoading && (
              <div className="py-12">
                <LoadingSpinner text="Loading pending approvals..." />
              </div>
            )}

            {/* No pending items */}
            {!isLoading &&
              pendingMembers.length === 0 &&
              pendingBookings.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    All caught up!
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No pending approvals at this time.
                  </p>
                </div>
              )}

            {/* Pending Members Section */}
            {!isLoading && pendingMembers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Member Approvals ({pendingMembers.length})
                </h3>
                <div className="space-y-3">
                  {pendingMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {member.full_name}
                          </h4>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          {member.phone && (
                            <p className="text-sm text-gray-500">{member.phone}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Registered: {formatDateTime(member.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveMember(member.id)}
                            disabled={processingId === member.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === member.id ? "Processing..." : "Approve"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Bookings Section */}
            {!isLoading && pendingBookings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Booking Approvals ({pendingBookings.length})
                </h3>
                <div className="space-y-3">
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {booking.resource_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {booking.member_name} ({booking.member_email})
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            {formatDateTime(booking.start_time)} -{" "}
                            {new Date(booking.end_time).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {booking.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Purpose:</span> {booking.notes}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Party size: {booking.party_size}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Requested: {formatDateTime(booking.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveBooking(booking.id)}
                            disabled={processingId === booking.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === booking.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.id)}
                            disabled={processingId === booking.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === booking.id ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
