"use client";

/**
 * LoadingSpinner Component
 * 
 * A reusable loading indicator component.
 * Shows an animated spinner with optional loading text.
 * 
 * Props:
 * - size: Size of the spinner (sm, md, lg)
 * - text: Optional text to display below the spinner
 * - fullScreen: If true, centers the spinner in the full viewport
 */

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

/**
 * Size mappings for the spinner
 */
const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export default function LoadingSpinner({
  size = "md",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  // The spinner element
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Animated spinner circle */}
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-primary-600 
                    rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      
      {/* Optional loading text */}
      {text && (
        <p className="text-sm text-gray-600">{text}</p>
      )}
    </div>
  );

  // If fullScreen, wrap in a centered container
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}
