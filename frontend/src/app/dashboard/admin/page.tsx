"use client";

/**
 * Admin Dashboard Page
 * 
 * Provides administrators with:
 * - Overview statistics (members, bookings)
 * - Quick navigation to member/booking management
 * - Pending approvals summary
 * 
 * This page is only accessible to users with ADMIN role.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/api";
import { AdminStats } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminDashboardPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Stats data
  const [stats, setStats] = useState<AdminStats | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins (only after auth check completes)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, authLoading, router]);

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Failed to load statistics");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // Don't render for non-admins
  if (!isAdmin) {
    return <LoadingSpinner fullScreen text="Redirecting..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage members and bookings</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-12">
          <LoadingSpinner text="Loading statistics..." />
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Members */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_members}</p>
                </div>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_members}</p>
                </div>
              </div>
            </div>

            {/* Active Members */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_members}</p>
                </div>
              </div>
            </div>

            {/* Today's Bookings */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Today&apos;s Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_bookings_today}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Approvals Alert */}
          {stats.pending_members > 0 && (
            <Alert
              type="warning"
              message={`You have ${stats.pending_members} member${stats.pending_members > 1 ? "s" : ""} waiting for approval.`}
            />
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Members Management Card */}
            <Link href="/dashboard/admin/members" className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manage Members</h3>
                  <p className="text-gray-600 mt-1">
                    View all members, approve registrations, and manage membership status.
                  </p>
                  <span className="inline-block mt-3 text-primary-600 font-medium text-sm">
                    View Members &rarr;
                  </span>
                </div>
              </div>
            </Link>

            {/* Bookings Management Card */}
            <Link href="/dashboard/admin/bookings" className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manage Bookings</h3>
                  <p className="text-gray-600 mt-1">
                    View all bookings, cancel sessions, and monitor gym usage.
                  </p>
                  <span className="inline-block mt-3 text-blue-600 font-medium text-sm">
                    View Bookings &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
