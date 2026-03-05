"use client";

/**
 * Authentication Context
 *
 * This context provides authentication state and methods throughout the app.
 * It handles:
 * - User session management
 * - Login/logout functionality
 * - Loading states during auth checks
 * - Automatic session restoration on page load
 * - Inactivity timeout (15 minutes) with warning modal
 * - Automatic logout on inactivity
 *
 * Usage:
 *   const { user, member, isLoading, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api";
import { User, Member, LoginCredentials } from "@/types";

// Inactivity timeout configuration
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 60 * 1000; // Show warning 1 minute before logout

/**
 * Auth context value type definition
 */
interface AuthContextType {
  // Current authenticated user (null if not logged in)
  user: User | null;
  // Current member profile (null if not logged in)
  member: Member | null;
  // True while checking authentication status
  isLoading: boolean;
  // True if user is authenticated
  isAuthenticated: boolean;
  // True if user is an admin
  isAdmin: boolean;
  // True if user is a coach
  isCoach: boolean;
  // True if user is a regular member
  isMember: boolean;
  // True if showing inactivity warning
  showInactivityWarning: boolean;
  // Seconds remaining before auto-logout (when warning is shown)
  warningSecondsLeft: number;
  // Login function - throws on failure
  login: (credentials: LoginCredentials) => Promise<void>;
  // Logout function
  logout: () => Promise<void>;
  // Refresh user data from server
  refreshUser: () => Promise<void>;
  // Extend session (dismiss warning and reset timer)
  extendSession: () => void;
}

// Create the context with undefined default (will be provided by AuthProvider)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * 
 * Wraps the application and provides authentication context.
 * Automatically checks for existing session on mount.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // User and member state
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);

  // Loading state for initial auth check
  const [isLoading, setIsLoading] = useState(true);

  // Inactivity timeout state
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(60);

  // Refs for timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Clear all inactivity timers
   */
  const clearInactivityTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle automatic logout due to inactivity
   */
  const handleInactivityLogout = useCallback(async () => {
    clearInactivityTimers();
    setShowInactivityWarning(false);

    try {
      await authApi.logout();
    } catch (error) {
      console.error("Auto-logout error:", error);
    } finally {
      setUser(null);
      setMember(null);

      // Redirect to login with message
      router.push("/login?reason=inactivity");
    }
  }, [clearInactivityTimers, router]);

  /**
   * Show warning modal 1 minute before auto-logout
   */
  const showWarning = useCallback(() => {
    setShowInactivityWarning(true);
    setWarningSecondsLeft(60);

    // Start countdown
    let secondsLeft = 60;
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setWarningSecondsLeft(secondsLeft);

      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    }, 1000);

    // Auto-logout after warning period
    warningTimerRef.current = setTimeout(() => {
      handleInactivityLogout();
    }, WARNING_TIME);
  }, [handleInactivityLogout]);

  /**
   * Reset inactivity timer
   */
  const resetInactivityTimer = useCallback(() => {
    // Don't set timers if not authenticated
    if (!user) return;

    // Don't set timers on login/register pages
    if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
      return;
    }

    lastActivityRef.current = Date.now();

    // Clear existing timers
    clearInactivityTimers();

    // Hide warning if shown
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
    }

    // Set new timer for warning (14 minutes)
    inactivityTimerRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);
  }, [user, pathname, showInactivityWarning, clearInactivityTimers, showWarning]);

  /**
   * Extend session (user clicked "Stay Logged In")
   */
  const extendSession = useCallback(() => {
    setShowInactivityWarning(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  /**
   * Check current authentication status
   * Called on mount to restore session from cookies
   */
  const checkAuth = async () => {
    try {
      const data = await authApi.getCurrentUser();
      if (data) {
        setUser(data.user);
        setMember(data.member);
      } else {
        setUser(null);
        setMember(null);
      }
    } catch (error) {
      // Not authenticated or error - clear state
      setUser(null);
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with credentials
   * @param credentials - Email and password
   * @throws Error if login fails
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    setMember(response.member);
    // Start inactivity timer after successful login
    setTimeout(() => resetInactivityTimer(), 100);
  }, [resetInactivityTimer]);

  /**
   * Logout the current user
   * Clears local state and server-side cookies
   */
  const logout = useCallback(async () => {
    clearInactivityTimers();
    setShowInactivityWarning(false);

    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors - clear state anyway
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setMember(null);
    }
  }, [clearInactivityTimers]);

  /**
   * Refresh user data from server
   * Useful after profile updates
   */
  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.getCurrentUser();
      if (data) {
        setUser(data.user);
        setMember(data.member);
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  }, []);

  // Check authentication on mount - only once
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up inactivity tracking when user is authenticated
  useEffect(() => {
    if (!user || isLoading) return;

    // Don't track activity on login/register pages
    if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
      clearInactivityTimers();
      return;
    }

    // Activity events to track
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    // Reset timer on any activity
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInactivityTimers();
    };
  }, [user, isLoading, pathname, resetInactivityTimer, clearInactivityTimers]);

  // Compute derived state
  const isAuthenticated = user !== null;
  const isAdmin = user?.role === "ADMIN";
  const isCoach = user?.role === "COACH";
  const isMember = user?.role === "MEMBER";

  // Context value
  const value: AuthContextType = {
    user,
    member,
    isLoading,
    isAuthenticated,
    isAdmin,
    isCoach,
    isMember,
    showInactivityWarning,
    warningSecondsLeft,
    login,
    logout,
    refreshUser,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showInactivityWarning && <InactivityWarningModal />}
    </AuthContext.Provider>
  );
}

/**
 * Inactivity Warning Modal Component
 * Shows when user is about to be logged out due to inactivity
 */
function InactivityWarningModal() {
  const { warningSecondsLeft, extendSession, logout } = useAuth();
  const router = useRouter();

  const handleStayLoggedIn = () => {
    extendSession();
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login?reason=manual");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Still There?
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          You've been inactive for a while. For your security, you'll be automatically logged out in{" "}
          <span className="font-bold text-amber-600">{warningSecondsLeft} seconds</span>.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom hook to access auth context
 * 
 * @throws Error if used outside of AuthProvider
 * @returns AuthContextType
 * 
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}
