"use client";

/**
 * Dashboard Layout
 * 
 * This layout wraps all dashboard pages and provides:
 * - Navigation bar
 * - Authentication protection
 * - Consistent layout structure
 * 
 * Only authenticated users can access dashboard routes.
 * Unauthenticated users are redirected to login.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navigation from "@/components/Navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, member } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return <LoadingSpinner fullScreen text="Redirecting to login..." />;
  }

  // Check if member is pending approval
  if (member?.membership_status === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h1>
          <p className="text-gray-600 mb-6">
            Your membership is awaiting admin approval. You&apos;ll be able to access 
            the gym booking system once your account is approved.
          </p>
          <button
            onClick={() => {
              // Use the auth context logout
              window.location.href = "/login";
            }}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if member is suspended
  if (member?.membership_status === "SUSPENDED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Membership Suspended</h1>
          <p className="text-gray-600 mb-6">
            Your membership has been suspended. Please contact the club administrator 
            for more information.
          </p>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation bar */}
      <Navigation />

      {/* Main content area */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
