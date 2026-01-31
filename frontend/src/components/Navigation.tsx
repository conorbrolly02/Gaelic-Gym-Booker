"use client";

/**
 * Navigation Component
 * 
 * Provides the main navigation bar for the application.
 * Features:
 * - Responsive design (hamburger menu on mobile)
 * - Shows different links based on auth status and role
 * - Logout functionality
 * 
 * This component is used in the dashboard layout.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Navigation link item definition
 */
interface NavLink {
  href: string;
  label: string;
  adminOnly?: boolean;
}

/**
 * All available navigation links
 * Links marked with adminOnly will only show for admin users
 */
const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/book", label: "Book Slot" },
  { href: "/dashboard/bookings", label: "My Bookings" },
  { href: "/dashboard/admin", label: "Admin", adminOnly: true },
];

export default function Navigation() {
  // Get auth state from context
  const { user, member, isAdmin, logout } = useAuth();
  
  // Current path for active link highlighting
  const pathname = usePathname();
  
  // Mobile menu open/closed state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /**
   * Handle logout button click
   */
  const handleLogout = async () => {
    await logout();
    // Redirect will happen automatically via auth context
    window.location.href = "/login";
  };

  /**
   * Filter navigation links based on user role
   */
  const visibleLinks = navLinks.filter((link) => {
    // If link is admin only, check if user is admin
    if (link.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  /**
   * Check if a link is currently active
   */
  const isActive = (href: string) => {
    // Exact match for dashboard home
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // Prefix match for other routes
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* Club logo */}
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img
                  src="/logo.jpeg"
                  alt="Eoghan Rua CLG"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 hidden sm:block">
                Eoghan Rua CLG Gym
              </span>
            </Link>
          </div>

          {/* Desktop navigation links */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User menu and logout */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* User info */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {member?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {isAdmin ? "Administrator" : "Member"}
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 
                         hover:bg-gray-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                // Close icon (X)
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {/* Mobile nav links */}
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <hr className="my-2 border-gray-200" />

            {/* User info on mobile */}
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-900">
                {member?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {isAdmin ? "Administrator" : "Member"}
              </p>
            </div>

            {/* Logout button on mobile */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-base font-medium text-red-600 
                         hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
