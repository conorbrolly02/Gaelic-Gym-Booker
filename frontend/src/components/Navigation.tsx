"use client";

/**
 * Navigation Component (Next.js App Router)
 * =============================================================================
 * PURPOSE
 *   App-wide top navigation bar used in the dashboard layout.
 *
 * FEATURES
 *   - Desktop + mobile navigation.
 *   - Book Facility dropdown (DESKTOP: click-to-toggle; MOBILE: collapsible).
 *   - User dropdown (DESKTOP: click-to-toggle; MOBILE: collapsible) with:
 *       • My Bookings
 *       • User settings  ← navigates to /dashboard/settings
 *       • Admin Settings (admins only)
 *       • Logout
 *
 * UX / THEME
 *   - Maroon bar, white default link text, active pill style (white bg + dark text).
 *   - Order: Dashboard → Book Facility (dropdown). User menu on the right.
 *
 * ACCESSIBILITY
 *   - Dropdown triggers are <button> with aria-haspopup="menu" and aria-expanded.
 *   - Menus have role="menu"/role="menuitem".
 *   - Close on Escape, outside click, and when route changes.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/api";
import ApprovalsModal from "./ApprovalsModal";

/** Minimal interface for items we link to */
interface NavLinkItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

export default function Navigation() {
  // ---------------------------------------------------------------------------
  // AUTH & ROUTING CONTEXT
  // ---------------------------------------------------------------------------
  const { user, member, isAdmin, isCoach, isMember, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();

  // Display name for the header (never show email here)
  const displayName = member?.full_name || "User";

  // ---------------------------------------------------------------------------
  // DESKTOP DROPDOWN STATE + refs for outside-click handling
  // ---------------------------------------------------------------------------
  const [isFacilitiesOpenDesktop, setIsFacilitiesOpenDesktop] = useState(false);
  const [isUserOpenDesktop, setIsUserOpenDesktop] = useState(false);

  const facilitiesRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------------
  // MOBILE MENU STATE (hamburger panel + collapsibles)
  // ---------------------------------------------------------------------------
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileFacilitiesOpen, setIsMobileFacilitiesOpen] = useState(false);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // APPROVALS MODAL STATE (for admins)
  // ---------------------------------------------------------------------------
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Fetch pending approvals count for admins
  useEffect(() => {
    // Only fetch if user is authenticated, not loading, and is an admin
    if (isAuthenticated && !isLoading && isAdmin) {
      fetchPendingApprovalsCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingApprovalsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isLoading, isAdmin]);

  const fetchPendingApprovalsCount = async () => {
    // Triple check authentication before making API call
    if (!isAuthenticated || isLoading || !isAdmin) return;

    try {
      const data = await adminApi.getPendingApprovals();
      const count = data.pending_members.length + data.pending_bookings.length;
      setPendingApprovalsCount(count);
    } catch (error) {
      console.error("Failed to fetch pending approvals count:", error);
      // Reset count on error to avoid showing stale data
      setPendingApprovalsCount(0);
    }
  };

  const handleApprovalsComplete = () => {
    fetchPendingApprovalsCount();
  };

  // ---------------------------------------------------------------------------
  // LOGOUT HANDLER
  // ---------------------------------------------------------------------------
  const handleLogout = async () => {
    await logout();
    // If your AuthContext handles redirect, remove the manual redirect below:
    window.location.href = "/login";
  };

  // ---------------------------------------------------------------------------
  // FACILITY DROPDOWN ITEMS
  // Filter based on user role:
  // - MEMBER: Gym, Ball Wall, Clubhouse only
  // - COACH: All facilities (with approval required for pitches)
  // - ADMIN: All facilities
  // ---------------------------------------------------------------------------
  const allFacilityItems: NavLinkItem[] = [
    { href: "/dashboard/book", label: "Gym" },
    { href: "/dashboard/pitches/main", label: "Main Pitch" },
    { href: "/dashboard/pitches/minor", label: "Minor Pitch" },
    { href: "/dashboard/ball-wall", label: "Ball Wall" },
    { href: "/dashboard/clubhouse", label: "Clubhouse Room" },
  ];

  // Filter facilities based on user role
  const facilityItems = useMemo(() => {
    if (isAdmin || isCoach) {
      // Admins and Coaches can see all facilities
      return allFacilityItems;
    } else {
      // Regular members can only see Gym, Ball Wall, and Clubhouse
      return allFacilityItems.filter((item) =>
        item.href === "/dashboard/book" || // Gym
        item.href === "/dashboard/ball-wall" || // Ball Wall
        item.href === "/dashboard/clubhouse" // Clubhouse
      );
    }
  }, [isAdmin, isCoach]);

  // ---------------------------------------------------------------------------
  // DESKTOP TOP-LEVEL LINKS (center area)
  // Order: Dashboard → Book Facility (dropdown).
  // (My Bookings & Admin Settings live inside the user dropdown)
  // ---------------------------------------------------------------------------
  const topLevelLinks: NavLinkItem[] = [{ href: "/dashboard", label: "Dashboard" }];

  // ---------------------------------------------------------------------------
  // ACTIVE STATE HELPERS
  // ---------------------------------------------------------------------------
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // "Book Facility" parent is active if ANY facility child path matches
  const isFacilitiesActive = useMemo(() => {
    const facilityPaths = [
      "/dashboard/book",
      "/dashboard/pitches",
      "/dashboard/ball-wall",
      "/dashboard/clubhouse",
    ];
    return facilityPaths.some((p) => pathname.startsWith(p));
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // DESKTOP: Close dropdowns on route change (ensures clean state after nav)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setIsFacilitiesOpenDesktop(false);
    setIsUserOpenDesktop(false);
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // DESKTOP: Close dropdowns on Escape key
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFacilitiesOpenDesktop(false);
        setIsUserOpenDesktop(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---------------------------------------------------------------------------
  // DESKTOP: Close dropdowns on outside click
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isFacilitiesOpenDesktop &&
        facilitiesRef.current &&
        !facilitiesRef.current.contains(target)
      ) {
        setIsFacilitiesOpenDesktop(false);
      }
      if (isUserOpenDesktop && userRef.current && !userRef.current.contains(target)) {
        setIsUserOpenDesktop(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isFacilitiesOpenDesktop, isUserOpenDesktop]);

  return (
    <nav className="bg-[#903838] border-b border-[#7d2f2f] sticky top-0 z-50">
      {/* ============================== CONTAINER ============================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================ MAIN BAR ROW =========================== */}
        <div className="flex justify-between h-16">
          {/* -------------------------- LEFT: BRAND/LOGO ----------------------- */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* Club logo (use next/image if you prefer) */}
              <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/40">
                <img src="/logo.jpeg" alt="Eoghan Rua GAC" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-semibold text-white hidden sm:block">
                Eoghan Rua Facility Booker
              </span>
            </Link>
          </div>

          {/* ----------------------- CENTER: DESKTOP NAV LINKS ------------------ */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* (1) DASHBOARD (appears BEFORE Book Facility) */}
            {topLevelLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "text-sm font-medium transition-colors",
                    !active && "text-white hover:text-gray-100",
                    active
                      ? "bg-white text-gray-800 shadow-sm rounded-md px-3 py-2"
                      : "px-0 py-2",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* (2) BOOK FACILITY (DESKTOP CLICK-TO-TOGGLE DROPDOWN) */}
            <div ref={facilitiesRef} className="relative">
              {/* Trigger: click toggles the menu; we also give "active pill" if on any facility page */}
              <button
                type="button"
                onClick={() =>
                  setIsFacilitiesOpenDesktop((open) => {
                    if (!open) setIsUserOpenDesktop(false); // close the other dropdown if opening this one
                    return !open;
                  })
                }
                className={[
                  "flex items-center gap-1 text-sm font-medium transition-colors",
                  isFacilitiesActive || isFacilitiesOpenDesktop
                    ? "bg-white text-gray-800 shadow-sm rounded-md px-3 py-2"
                    : "text-white hover:text-gray-100 px-0 py-2",
                ].join(" ")}
                aria-haspopup="menu"
                aria-expanded={isFacilitiesOpenDesktop ? "true" : "false"}
                aria-controls="desktop-facilities-menu"
              >
                <span>Book Facility</span>
                <svg
                  className={[
                    "w-4 h-4 transition-transform",
                    (isFacilitiesActive || isFacilitiesOpenDesktop)
                      ? "text-gray-700"
                      : "text-white/90",
                    isFacilitiesOpenDesktop ? "rotate-180" : "",
                  ].join(" ")}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Menu panel (shown only when open) */}
              {isFacilitiesOpenDesktop && (
                <div
                  id="desktop-facilities-menu"
                  role="menu"
                  aria-label="Book Facility"
                  className="absolute left-0 mt-2 min-w-[220px] rounded-md bg-white shadow-lg ring-1 ring-black/5 p-1"
                >
                  {facilityItems.map((item) => {
                    const key = `${item.href}::${item.label}`;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={key}
                        href={item.href}
                        role="menuitem"
                        className={[
                          "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                        ].join(" ")}
                        onClick={() => setIsFacilitiesOpenDesktop(false)} // close after selection
                      >
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------- RIGHT: USER DROPDOWN --------------------- */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Approvals Button (Admins only) */}
            {isAdmin && (
              <button
                onClick={() => setShowApprovalsModal(true)}
                className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-white hover:text-gray-100 transition-colors"
                aria-label="Pending approvals"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span>Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}

            <div ref={userRef} className="relative">
              {/* Trigger: click toggles the user menu */}
              <button
                type="button"
                onClick={() =>
                  setIsUserOpenDesktop((open) => {
                    if (!open) setIsFacilitiesOpenDesktop(false); // close the other dropdown if opening this one
                    return !open;
                  })
                }
                className="flex items-center gap-2 text-sm font-medium text-white hover:text-gray-100 px-0 py-2"
                aria-haspopup="menu"
                aria-expanded={isUserOpenDesktop ? "true" : "false"}
                aria-controls="desktop-user-menu"
              >
                <span>{displayName}</span>
                <svg
                  className={[
                    "w-4 h-4 text-white/90 transition-transform",
                    isUserOpenDesktop ? "rotate-180" : "",
                  ].join(" ")}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Menu panel (shown only when open) */}
              {isUserOpenDesktop && (
                <div
                  id="desktop-user-menu"
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 mt-2 min-w-[220px] rounded-md bg-white shadow-lg ring-1 ring-black/5 p-1"
                >
                  {/* My Bookings */}
                  <Link
                    href="/dashboard/bookings"
                    role="menuitem"
                    className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setIsUserOpenDesktop(false)}
                  >
                    My Bookings
                  </Link>

                  {/* Schedule */}
                  <Link
                    href="/dashboard/schedule"
                    role="menuitem"
                    className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setIsUserOpenDesktop(false)}
                  >
                    Schedule
                  </Link>

                  {/* User settings (this is the item you asked to navigate) */}
                  <Link
                    href="/dashboard/settings"
                    role="menuitem"
                    className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setIsUserOpenDesktop(false)}
                  >
                    User settings
                  </Link>

                  {/* Admin Settings (admins only) */}
                  {isAdmin && (
                    <Link
                      href="/dashboard/admin"
                      role="menuitem"
                      className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      onClick={() => setIsUserOpenDesktop(false)}
                    >
                      Admin Settings
                    </Link>
                  )}

                  {/* Logout */}
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* --------------------------- MOBILE: TOGGLER ----------------------- */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-white hover:bg-white/10 hover:text-gray-100"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                // Close (X)
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =============================== MOBILE PANEL ========================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#7d2f2f] bg-[#903838] animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {/* (1) DASHBOARD */}
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={[
                "block px-3 py-2 rounded-lg text-base font-medium transition-colors",
                pathname === "/dashboard"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-white hover:text-gray-100 hover:bg-white/10",
              ].join(" ")}
            >
              Dashboard
            </Link>

            {/* (2) BOOK FACILITY (collapsible) */}
            <button
              onClick={() => setIsMobileFacilitiesOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium text-white hover:text-gray-100 hover:bg-white/10"
              aria-expanded={isMobileFacilitiesOpen ? "true" : "false"}
            >
              <span>Book Facility</span>
              <svg
                className={[
                  "w-5 h-5 transition-transform",
                  isMobileFacilitiesOpen ? "rotate-180" : "",
                ].join(" ")}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Facility children */}
            {isMobileFacilitiesOpen && (
              <div className="pl-2">
                {facilityItems.map((item) => {
                  const key = `${item.href}::${item.label}`;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={key}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={[
                        "block px-3 py-2 rounded-md text-base transition-colors",
                        active
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-white hover:text-gray-100 hover:bg-white/10",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            <hr className="my-2 border-white/20" />

            {/* APPROVALS BUTTON (Admins only - Mobile) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setShowApprovalsModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium text-white hover:text-gray-100 hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span>Pending Approvals</span>
                </div>
                {pendingApprovalsCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}

            <hr className="my-2 border-white/20" />

            {/* (3) USER (collapsible) */}
            <button
              onClick={() => setIsMobileUserOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium text-white hover:text-gray-100 hover:bg-white/10"
              aria-expanded={isMobileUserOpen ? "true" : "false"}
            >
              <span>{displayName}</span>
              <svg
                className={[
                  "w-5 h-5 transition-transform",
                  isMobileUserOpen ? "rotate-180" : "",
                ].join(" ")}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* User dropdown items (mobile) */}
            {isMobileUserOpen && (
              <div className="pl-2">
                {/* My Bookings */}
                <Link
                  href="/dashboard/bookings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base text-white hover:text-gray-100 hover:bg-white/10"
                >
                  My Bookings
                </Link>

                {/* Schedule */}
                <Link
                  href="/dashboard/schedule"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base text-white hover:text-gray-100 hover:bg-white/10"
                >
                  Schedule
                </Link>

                {/* User settings  ← This navigates to the User Settings page */}
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base text-white hover:text-gray-100 hover:bg-white/10"
                >
                  User settings
                </Link>

                {/* Admin Settings (admins only) */}
                {isAdmin && (
                  <Link
                    href="/dashboard/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base text-white hover:text-gray-100 hover:bg-white/10"
                  >
                    Admin Settings
                  </Link>
                )}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-base text-red-50 hover:text-white hover:bg-red-500/20"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============================== APPROVALS MODAL ====================== */}
      {isAdmin && (
        <ApprovalsModal
          isOpen={showApprovalsModal}
          onClose={() => setShowApprovalsModal(false)}
          onApprovalComplete={handleApprovalsComplete}
        />
      )}
    </nav>
  );
}