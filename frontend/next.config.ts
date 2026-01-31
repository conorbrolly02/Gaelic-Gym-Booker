/**
 * Next.js Configuration
 * 
 * This configuration file sets up Next.js for the gym booking application.
 * Key settings:
 * - allowedDevOrigins: Allows the Replit proxy to access the dev server
 * - reactStrictMode: Enables strict mode for better development experience
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Replit domains to access the dev server
  // This is required for Replit's proxy to work
  allowedDevOrigins: [
    "https://*.replit.dev",
    "https://*.riker.replit.dev",
    "http://127.0.0.1:*",
    "http://localhost:*",
  ],
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
