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
import { AdminStats, AdminAnalytics } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import ApprovalsModal from "@/components/ApprovalsModal";

export default function AdminDashboardPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Stats data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);

  // Redirect non-admins (only after auth check completes)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, authLoading, router]);

  // Fetch stats and analytics on mount
  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchAnalytics();
    }
  }, [isAdmin]);

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

  const fetchAnalytics = async () => {
    try {
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleApprovalComplete = () => {
    // Refresh stats after approval
    fetchStats();
  };

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
            <button
              onClick={() => setShowApprovalsModal(true)}
              className="card hover:shadow-lg hover:bg-gray-50 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_approvals}</p>
                  {stats.pending_approvals > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      {stats.pending_members} members, {stats.pending_bookings} bookings
                    </p>
                  )}
                </div>
              </div>
            </button>

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
          {stats.pending_approvals > 0 && (
            <Alert
              type="warning"
              message={`You have ${stats.pending_approvals} pending approval${stats.pending_approvals > 1 ? "s" : ""} (${stats.pending_members} member${stats.pending_members !== 1 ? "s" : ""}, ${stats.pending_bookings} booking${stats.pending_bookings !== 1 ? "s" : ""}).`}
            />
          )}

          {/* Booking Analytics */}
          {!loadingAnalytics && analytics && (
            <>
              {/* Overview Stats */}
              <section className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Analytics (All Members)</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Total Bookings */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="text-3xl font-bold text-blue-700">{analytics.total_bookings}</div>
                    <div className="text-sm text-blue-600 mt-1">Total Bookings</div>
                  </div>

                  {/* Upcoming */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="text-3xl font-bold text-green-700">{analytics.upcoming_bookings}</div>
                    <div className="text-sm text-green-600 mt-1">Upcoming</div>
                  </div>

                  {/* Completed */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="text-3xl font-bold text-purple-700">{analytics.completed_bookings}</div>
                    <div className="text-sm text-purple-600 mt-1">Completed</div>
                  </div>

                  {/* Hours Booked */}
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <div className="text-3xl font-bold text-amber-700">{analytics.total_hours_booked}</div>
                    <div className="text-sm text-amber-600 mt-1">Hours Booked</div>
                  </div>
                </div>

                {/* Additional time-based stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                  {/* This Week */}
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                    <div className="text-2xl font-bold text-indigo-700">{analytics.this_week_bookings}</div>
                    <div className="text-sm text-indigo-600 mt-1">This Week</div>
                  </div>

                  {/* This Month */}
                  <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
                    <div className="text-2xl font-bold text-pink-700">{analytics.this_month_bookings}</div>
                    <div className="text-sm text-pink-600 mt-1">This Month</div>
                  </div>

                  {/* Cancelled */}
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <div className="text-2xl font-bold text-red-700">{analytics.cancelled_bookings}</div>
                    <div className="text-sm text-red-600 mt-1">Cancelled</div>
                  </div>
                </div>
              </section>

              {/* Facility Breakdown */}
              <section className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Facility</h2>

                <div className="space-y-4">
                  {/* Gym */}
                  <FacilityBar
                    label="Gym"
                    count={analytics.gym_bookings}
                    total={analytics.total_bookings}
                    color="blue"
                  />

                  {/* Pitches */}
                  <FacilityBar
                    label="Pitches"
                    count={analytics.pitch_bookings}
                    total={analytics.total_bookings}
                    color="green"
                  />

                  {/* Clubhouse */}
                  <FacilityBar
                    label="Clubhouse"
                    count={analytics.clubhouse_bookings}
                    total={analytics.total_bookings}
                    color="purple"
                  />

                  {/* Ball Wall */}
                  <FacilityBar
                    label="Ball Wall"
                    count={analytics.ball_wall_bookings}
                    total={analytics.total_bookings}
                    color="sky"
                  />
                </div>
              </section>
            </>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Profile Card */}
            <Link href="/dashboard/profile" className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
                  <p className="text-gray-600 mt-1">
                    View and update your personal information and account settings.
                  </p>
                  <span className="inline-block mt-3 text-indigo-600 font-medium text-sm">
                    View Profile &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}

      {/* Approvals Modal */}
      <ApprovalsModal
        isOpen={showApprovalsModal}
        onClose={() => setShowApprovalsModal(false)}
        onApprovalComplete={handleApprovalComplete}
      />
    </div>
  );
}

// Facility progress bar component
interface FacilityBarProps {
  label: string;
  count: number;
  total: number;
  color: "blue" | "green" | "purple" | "sky";
}

function FacilityBar({ label, count, total, color }: FacilityBarProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const colorClasses = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    purple: "bg-purple-600",
    sky: "bg-sky-600",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
