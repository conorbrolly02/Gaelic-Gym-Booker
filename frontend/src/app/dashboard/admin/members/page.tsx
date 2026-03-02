"use client";

/**
 * Admin Members Management Page
 * 
 * Allows administrators to:
 * - View all registered members
 * - Filter by membership status
 * - Approve pending members
 * - Suspend/reactivate members
 * 
 * Features responsive table with mobile card view.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/api";
import { Member } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import EditMemberModal from "@/components/EditMemberModal";

type FilterType = "all" | "pending" | "active" | "suspended";

export default function AdminMembersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Members data
  const [members, setMembers] = useState<Member[]>([]);
  
  // Filter state
  const [filter, setFilter] = useState<FilterType>("all");
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Redirect non-admins (only after auth check completes)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, authLoading, router]);

  /**
   * Fetch members based on filter
   */
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: { status?: string } = {};
      if (filter !== "all") {
        params.status = filter;
      }

      const data = await adminApi.getMembers(params);
      setMembers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Fetch on mount and filter change
  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin, fetchMembers]);

  /**
   * Handle approving a member
   */
  const handleApprove = async (memberId: string) => {
    setActionId(memberId);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.approveMember(memberId);
      setSuccess("Member approved successfully");
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to approve member");
    } finally {
      setActionId(null);
    }
  };

  /**
   * Handle suspending a member
   */
  const handleSuspend = async (memberId: string) => {
    if (!confirm("Are you sure you want to suspend this member?")) {
      return;
    }

    setActionId(memberId);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.suspendMember(memberId);
      setSuccess("Member suspended");
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to suspend member");
    } finally {
      setActionId(null);
    }
  };

  /**
   * Handle reactivating a member
   */
  const handleReactivate = async (memberId: string) => {
    setActionId(memberId);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.reactivateMember(memberId);
      setSuccess("Member reactivated");
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to reactivate member");
    } finally {
      setActionId(null);
    }
  };

  /**
   * Handle member update from modal
   */
  const handleMemberUpdated = (updatedMember: Member) => {
    // Update the member in the local state
    setMembers((prevMembers) =>
      prevMembers.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    setSuccess("Member updated successfully");
  };

  /**
   * Get status badge style
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "badge-success";
      case "PENDING":
        return "badge-warning";
      case "SUSPENDED":
        return "badge-error";
      case "CANCELLED":
        return "badge-gray";
      default:
        return "badge-info";
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Don't render for non-admins
  if (!isAdmin) {
    return <LoadingSpinner fullScreen text="Redirecting..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Members</h1>
          <p className="text-gray-600 mt-1">View and manage club memberships</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap bg-gray-100 rounded-lg p-1">
          {(["all", "pending", "active", "suspended"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Members List */}
      <div className="card overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="py-12">
            <LoadingSpinner text="Loading members..." />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && members.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No members found</h3>
            <p className="text-gray-600">
              {filter === "pending"
                ? "No pending approvals at this time."
                : filter === "active"
                ? "No active members found."
                : filter === "suspended"
                ? "No suspended members."
                : "No members registered yet."}
            </p>
          </div>
        )}

        {/* Members table/cards */}
        {!isLoading && members.length > 0 && (
          <>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900">{member.full_name}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {member.phone || "-"}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge ${getStatusBadge(member.membership_status)}`}>
                          {member.membership_status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {formatDate(member.joined_at)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="px-3 py-1 text-sm font-medium text-blue-600
                                       hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          {member.membership_status === "PENDING" && (
                            <button
                              onClick={() => handleApprove(member.id)}
                              disabled={actionId === member.id}
                              className="px-3 py-1 text-sm font-medium text-green-600
                                         hover:bg-green-50 rounded-lg transition-colors
                                         disabled:opacity-50"
                            >
                              {actionId === member.id ? "..." : "Approve"}
                            </button>
                          )}
                          {member.membership_status === "ACTIVE" && (
                            <button
                              onClick={() => handleSuspend(member.id)}
                              disabled={actionId === member.id}
                              className="px-3 py-1 text-sm font-medium text-red-600
                                         hover:bg-red-50 rounded-lg transition-colors
                                         disabled:opacity-50"
                            >
                              {actionId === member.id ? "..." : "Suspend"}
                            </button>
                          )}
                          {member.membership_status === "SUSPENDED" && (
                            <button
                              onClick={() => handleReactivate(member.id)}
                              disabled={actionId === member.id}
                              className="px-3 py-1 text-sm font-medium text-blue-600
                                         hover:bg-blue-50 rounded-lg transition-colors
                                         disabled:opacity-50"
                            >
                              {actionId === member.id ? "..." : "Reactivate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet card view */}
            <div className="lg:hidden space-y-3 p-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{member.full_name}</div>
                      <div className="text-sm text-gray-600">
                        {member.phone || "No phone"}
                      </div>
                    </div>
                    <span className={`badge ${getStatusBadge(member.membership_status)}`}>
                      {member.membership_status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Joined: {formatDate(member.joined_at)}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMember(member)}
                      className="flex-1 py-2 text-sm font-medium text-blue-600 border
                                 border-blue-200 rounded-lg hover:bg-blue-50
                                 transition-colors"
                    >
                      Edit
                    </button>
                    {member.membership_status === "PENDING" && (
                      <button
                        onClick={() => handleApprove(member.id)}
                        disabled={actionId === member.id}
                        className="flex-1 py-2 text-sm font-medium text-white bg-green-600
                                   rounded-lg hover:bg-green-700 disabled:opacity-50
                                   transition-colors"
                      >
                        {actionId === member.id ? "..." : "Approve"}
                      </button>
                    )}
                    {member.membership_status === "ACTIVE" && (
                      <button
                        onClick={() => handleSuspend(member.id)}
                        disabled={actionId === member.id}
                        className="flex-1 py-2 text-sm font-medium text-red-600 border
                                   border-red-200 rounded-lg hover:bg-red-50
                                   disabled:opacity-50 transition-colors"
                      >
                        {actionId === member.id ? "..." : "Suspend"}
                      </button>
                    )}
                    {member.membership_status === "SUSPENDED" && (
                      <button
                        onClick={() => handleReactivate(member.id)}
                        disabled={actionId === member.id}
                        className="flex-1 py-2 text-sm font-medium text-blue-600 border
                                   border-blue-200 rounded-lg hover:bg-blue-50
                                   disabled:opacity-50 transition-colors"
                      >
                        {actionId === member.id ? "..." : "Reactivate"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdated={handleMemberUpdated}
        />
      )}
    </div>
  );
}
