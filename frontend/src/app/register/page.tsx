"use client";

/**
 * Registration Page
 * 
 * Allows new users to create an account.
 * Features:
 * - Form validation (password requirements)
 * - Success message explaining approval process
 * - Error handling
 * - Link to login page
 */

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function RegisterPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  /**
   * Validate form before submission
   */
  const validateForm = (): string | null => {
    // Check password match
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }

    // Check password length
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt registration
      await authApi.register({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
      });

      // Show success message
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Show success message after registration
  if (success) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Your account has been created. An administrator will review and 
            approve your membership. You&apos;ll be able to login once approved.
          </p>

          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-primary-600 text-white font-medium 
                       rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Join the Club</h1>
          <p className="text-gray-600 mt-1">Create your gym membership account</p>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {/* Info Alert */}
          <div className="mb-6">
            <Alert
              type="info"
              message="After registration, an admin will review and approve your membership."
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Murphy"
                className="input"
                disabled={isSubmitting}
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input"
                disabled={isSubmitting}
              />
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+353 1234 5678"
                className="input"
                disabled={isSubmitting}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="input"
                disabled={isSubmitting}
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
                className="input"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>

        {/* Back to Home */}
        <p className="text-center text-sm text-gray-500 mt-3">
          <Link href="/" className="hover:text-gray-700">
            &larr; Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
