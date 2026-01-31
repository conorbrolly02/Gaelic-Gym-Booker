/**
 * Root Layout Component
 * 
 * This is the root layout that wraps all pages in the application.
 * It provides:
 * - HTML structure with proper metadata
 * - Global CSS imports
 * - Authentication context provider
 * - Common layout elements (if any)
 * 
 * App Router in Next.js uses this layout for all routes.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

// Configure the Inter font for the application
// Inter is a clean, modern font that works well for UI
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Use swap to prevent FOIT (Flash of Invisible Text)
  variable: "--font-inter", // CSS variable for custom usage
});

/**
 * Page Metadata
 * Defines the default metadata for all pages
 * Individual pages can override these values
 */
export const metadata: Metadata = {
  title: {
    template: "%s | Eoghan Rua CLG Gym",
    default: "Eoghan Rua CLG Gym Booking",
  },
  description: "Book your gym time slots at Eoghan Rua CLG",
  keywords: ["gym", "booking", "eoghan rua", "clg", "fitness"],
  // Viewport settings for mobile responsiveness
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1, // Prevent zoom on input focus on iOS
  },
};

/**
 * Root Layout Props
 */
interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * RootLayout Component
 * 
 * The outermost layout component that wraps the entire application.
 * This layout persists across all page navigations.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-gray-50 antialiased`}>
        {/* AuthProvider wraps the app to provide authentication context */}
        <AuthProvider>
          {/* Main content area */}
          <div className="flex min-h-screen flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
