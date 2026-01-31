"use client";

/**
 * Member Dashboard Page
 * 
 * The main dashboard view for members showing:
 * - Welcome message
 * - Quick stats (upcoming bookings, etc.)
 * - Quick action buttons
 * - Today's bookings
 * 
 * This is the first page members see after login.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { bookingApi } from "@/lib/api";
import { Booking } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function DashboardPage() {
  const { member, isAdmin } = useAuth();

  // State for bookings
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch upcoming bookings on mount
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookings = await bookingApi.getBookings({ upcoming: true });
        setUpcomingBookings(bookings.slice(0, 5)); // Show max 5
      } catch (err: any) {
        setError(err.message || "Failed to load bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  /**
   * Format date and time for display
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-IE", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  /**
   * Check if a booking is today
   */
  const isToday = (dateString: string) => {
    const today = new Date();
    const bookingDate = new Date(dateString);
    return today.toDateString() === bookingDate.toDateString();
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {getGreeting()}, {member?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-primary-100 mt-1">
          Ready to book your gym session?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Book Slot */}
        <Link
          href="/dashboard/book"
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">Book Slot</span>
        </Link>

        {/* My Bookings */}
        <Link
          href="/dashboard/bookings"
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">My Bookings</span>
        </Link>

        {/* View Schedule */}
        <Link
          href="/dashboard/book"
          className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">View Schedule</span>
        </Link>

        {/* Admin (only for admins) */}
        {isAdmin ? (
          <Link
            href="/dashboard/admin"
            className="card hover:shadow-md transition-shadow flex flex-col items-center text-center p-4"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Admin</span>
          </Link>
        ) : (
          <div className="card flex flex-col items-center text-center p-4 bg-gray-50 opacity-50">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Profile</span>
          </div>
        )}
      </div>

      {/* Upcoming Bookings Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
          <Link
            href="/dashboard/bookings"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-8">
            <LoadingSpinner text="Loading bookings..." />
          </div>
        )}

        {/* Error state */}
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {/* Empty state */}
        {!isLoading && !error && upcomingBookings.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No upcoming bookings</p>
            <Link
              href="/dashboard/book"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg 
                         hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Book a Slot
            </Link>
          </div>
        )}

        {/* Bookings list */}
        {!isLoading && !error && upcomingBookings.length > 0 && (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => {
              const { date, time } = formatDateTime(booking.start_time);
              const endTime = formatDateTime(booking.end_time).time;
              const today = isToday(booking.start_time);

              return (
                <div
                  key={booking.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    today ? "border-primary-200 bg-primary-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {/* Date indicator */}
                  <div className={`text-center min-w-[60px] ${today ? "text-primary-700" : "text-gray-600"}`}>
                    <div className="text-xs font-medium uppercase">{date.split(",")[0]}</div>
                    <div className="text-lg font-bold">{date.split(" ")[1]}</div>
                  </div>

                  {/* Divider */}
                  <div className={`w-px h-10 ${today ? "bg-primary-200" : "bg-gray-300"}`} />

                  {/* Time and details */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {time} - {endTime}
                    </div>
                    {today && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 
                                       text-xs font-medium rounded-full">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className="badge badge-success">
                    {booking.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
