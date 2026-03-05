"use client";

/**
 * Member Profile Page
 * =============================================================================
 * PURPOSE:
 *  - Display member profile information with role and QR code
 *  - Show comprehensive booking analytics and statistics
 *  - Allow QR code upload for gym access
 *  - Link to settings page for profile edits
 *
 * FEATURES:
 *  - Booking statistics by facility type
 *  - Total hours booked across all facilities
 *  - Membership duration tracking
 *  - QR code upload and display
 *  - Quick link to settings
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { memberApi } from "@/lib/api";
import { MemberAnalytics } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function ProfilePage() {
  const { user, member } = useAuth();

  // Analytics state
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // QR code state
  const [qrCode, setQrCode] = useState<string | null>(member?.qr_code || null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrSuccess, setQrSuccess] = useState<string | null>(null);

  // Fetch analytics on mount
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoadingAnalytics(true);
        setError(null);
        const data = await memberApi.getAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load analytics");
      } finally {
        setLoadingAnalytics(false);
      }
    }

    fetchAnalytics();
  }, []);

  // Update QR code display when member changes
  useEffect(() => {
    setQrCode(member?.qr_code || null);
  }, [member]);

  // Handle QR code file upload
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB");
      return;
    }

    try {
      setUploadingQr(true);
      setError(null);
      setQrSuccess(null);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        // Save to backend
        await memberApi.updateProfile({ qr_code: base64 });

        setQrCode(base64);
        setQrSuccess("QR code uploaded successfully!");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err?.message ?? "Failed to upload QR code");
    } finally {
      setUploadingQr(false);
    }
  };

  // Handle QR code removal
  const handleQrRemove = async () => {
    try {
      setUploadingQr(true);
      setError(null);
      await memberApi.updateProfile({ qr_code: null });
      setQrCode(null);
      setQrSuccess("QR code removed successfully!");
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove QR code");
    } finally {
      setUploadingQr(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Role badge colors
  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800 border-red-200";
      case "COACH":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  if (loadingAnalytics) {
    return <LoadingSpinner fullScreen text="Loading your profile..." />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          View your booking statistics and manage your gym access QR code.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Success Alert */}
      {qrSuccess && (
        <Alert type="success" message={qrSuccess} onClose={() => setQrSuccess(null)} />
      )}

      {/* Profile Overview Card */}
      <section className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{member?.full_name}</h2>
            <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
            {member?.phone && (
              <p className="text-sm text-gray-600">{member.phone}</p>
            )}

            {/* Role Badge */}
            <div className="mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user?.role)}`}>
                {user?.role || "MEMBER"}
              </span>
            </div>

            {/* Member Since */}
            {analytics && (
              <p className="text-sm text-gray-500 mt-3">
                Member since {formatDate(analytics.member_since)} ({analytics.days_as_member} days)
              </p>
            )}
          </div>

          {/* Settings Link */}
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </section>

      {/* QR Code Card */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gym Access QR Code</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload your QR code for quick gym access at the front desk.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* QR Code Display */}
          <div className="flex-shrink-0">
            {qrCode ? (
              <div className="relative group">
                <img
                  src={qrCode}
                  alt="Gym Access QR Code"
                  className="w-48 h-48 object-contain border-2 border-gray-200 rounded-lg bg-white"
                />
                <button
                  onClick={handleQrRemove}
                  disabled={uploadingQr}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
                  title="Remove QR code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <div className="text-center p-4">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-xs text-gray-500">No QR code uploaded</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <label className="block">
              <span className="sr-only">Choose QR code file</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                disabled={uploadingQr}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG, GIF up to 2MB
            </p>
            {uploadingQr && (
              <p className="text-sm text-primary-600 mt-2">Uploading...</p>
            )}
          </div>
        </div>
      </section>

      {/* Booking Analytics */}
      {analytics && (
        <>
          {/* Overview Stats */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Overview</h2>

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
