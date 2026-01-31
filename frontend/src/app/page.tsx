"use client";

/**
 * Home Page (Landing Page)
 * 
 * This is the public landing page for the gym booking system.
 * It redirects authenticated users to the dashboard and shows
 * a welcome message with login/register links for guests.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Show landing page for guests
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-8 overflow-hidden bg-white">
            <img
              src="/logo.jpeg"
              alt="Eoghan Rua CLG Logo"
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* Title and description */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Eoghan Rua CLG Gym
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Book your gym time slots easily. Stay fit, stay healthy, and enjoy 
            exclusive access to our club facilities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg 
                         hover:bg-gray-100 transition-colors shadow-lg"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-primary-700 text-white font-semibold rounded-lg 
                         border-2 border-white/30 hover:bg-primary-600 transition-colors"
            >
              Join Now
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Why Choose Us?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Booking</h3>
              <p className="text-gray-600">
                Book your preferred time slots in seconds. View availability and plan ahead.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Flexible Hours</h3>
              <p className="text-gray-600">
                Access the gym on your schedule. Recurring bookings available for regulars.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Limited Capacity</h3>
              <p className="text-gray-600">
                Maximum 20 people per slot ensures a comfortable workout environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 bg-gray-50 border-t border-gray-200">
        <p className="text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Eoghan Rua CLG. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
