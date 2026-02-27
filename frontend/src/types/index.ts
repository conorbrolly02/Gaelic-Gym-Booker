/**
 * TypeScript Type Definitions
 * 
 * This file contains all the type definitions used throughout the frontend.
 * These types mirror the backend API response structures for type safety.
 */

/**
 * User roles in the system
 * - MEMBER: Regular gym member who can book gym only
 * - COACH: Coach who can book all facilities including pitches
 * - ADMIN: Administrator who can manage members and all bookings
 */
export type UserRole = "MEMBER" | "COACH" | "ADMIN";

/**
 * Membership status for gym members
 * - PENDING: Newly registered, awaiting admin approval
 * - ACTIVE: Approved and can use the gym
 * - SUSPENDED: Temporarily suspended by admin
 * - CANCELLED: Membership has been cancelled
 */
export type MembershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

/**
 * Booking status
 * - CONFIRMED: Booking is active and confirmed
 * - CANCELLED: Booking has been cancelled
 * - COMPLETED: Booking time has passed (historical)
 */
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

/**
 * Recurring pattern types
 * - DAILY: Repeats every day
 * - WEEKLY: Repeats on specific days of the week
 */
export type PatternType = "DAILY" | "WEEKLY";

/**
 * User information returned from auth endpoints
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Member profile information
 */
export interface Member {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  membership_status: MembershipStatus;
  joined_at: string;
  approved_at?: string;
  approved_by?: string;
}

/**
 * Combined auth response with user and member data
 */
export interface AuthResponse {
  message: string;
  user: User;
  member: Member;
}

/**
 * Booking information
 */
export interface Booking {
  id: string;
  member_id: string;
  resource_id?: string;
  resource_name?: string;  // Name of facility (Gym, Main Pitch, Minor Pitch, etc.)
  start_time: string;
  end_time: string;
  status: BookingStatus;
  booking_type: string;
  party_size: number;
  recurring_pattern_id?: string;
  created_by: string;
  creator_name?: string;  // Email/name of user who created the booking
  cancelled_by?: string;
  cancelled_at?: string;
  created_at: string;
}

/**
 * Extended booking with member details (for admin views)
 */
export interface BookingWithMember extends Booking {
  member?: Member;
}

/**
 * Recurring booking pattern
 */
export interface RecurringPattern {
  id: string;
  member_id: string;
  pattern_type: PatternType;
  days_of_week?: number[];
  start_time: string;
  duration_mins: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Slot availability information
 */
export interface SlotAvailability {
  start_time: string;
  end_time: string;
  current_bookings: number;
  max_capacity: number;
  available_spots: number;
  is_available: boolean;
}

/**
 * Admin statistics for dashboard
 */
export interface AdminStats {
  total_members: number;
  pending_members: number;
  active_members: number;
  suspended_members: number;
  total_bookings_today: number;
  upcoming_bookings: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

/**
 * Create booking request
 */
export interface CreateBookingRequest {
  start_time: string;
  end_time: string;
  booking_type?: string;
  party_size?: number;
}

/**
 * API error response structure
 */
export interface ApiError {
  detail: string;
}
