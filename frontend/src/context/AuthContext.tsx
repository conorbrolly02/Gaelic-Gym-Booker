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
 * 
 * Usage:
 *   const { user, member, isLoading, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authApi } from "@/lib/api";
import { User, Member, LoginCredentials } from "@/types";

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
  // Login function - throws on failure
  login: (credentials: LoginCredentials) => Promise<void>;
  // Logout function
  logout: () => Promise<void>;
  // Refresh user data from server
  refreshUser: () => Promise<void>;
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
  // User and member state
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  
  // Loading state for initial auth check
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check current authentication status
   * Called on mount to restore session from cookies
   */
  const checkAuth = useCallback(async () => {
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
  }, []);

  /**
   * Login with credentials
   * @param credentials - Email and password
   * @throws Error if login fails
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    setMember(response.member);
  }, []);

  /**
   * Logout the current user
   * Clears local state and server-side cookies
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors - clear state anyway
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setMember(null);
    }
  }, []);

  /**
   * Refresh user data from server
   * Useful after profile updates
   */
  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Compute derived state
  const isAuthenticated = user !== null;
  const isAdmin = user?.role === "ADMIN";

  // Context value
  const value: AuthContextType = {
    user,
    member,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
