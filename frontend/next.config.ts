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
    "*.replit.dev",
    "*.riker.replit.dev",
    "*.repl.co",
  ],
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
