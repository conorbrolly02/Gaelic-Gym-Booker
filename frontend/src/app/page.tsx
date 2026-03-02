"use client";

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header with Logo */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.jpeg"
                alt="Eoghan Rua Logo"
                width={150}
                height={150}
                className="rounded-full shadow-lg"
                priority
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Eoghan Rua Facility Booker
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-2">
              Book Your Training Sessions with Ease
            </p>
            <p className="text-lg text-gray-500">
              Gaelic Gym, Pitches & Handball Court Booking System
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <Link
              href="/login"
              className="bg-green-700 hover:bg-green-800 text-white font-semibold py-4 px-10 rounded-lg transition-colors duration-200 w-full sm:w-auto text-lg shadow-md"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-white hover:bg-gray-50 text-green-700 font-semibold py-4 px-10 rounded-lg border-2 border-green-700 transition-colors duration-200 w-full sm:w-auto text-lg shadow-md"
            >
              Register Now
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4 text-center">📅</div>
              <h3 className="text-xl font-bold mb-3 text-center text-gray-900">
                Easy Booking
              </h3>
              <p className="text-gray-600 text-center">
                Reserve your gym, pitch, or handball court time slots quickly and efficiently
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4 text-center">👥</div>
              <h3 className="text-xl font-bold mb-3 text-center text-gray-900">
                Team Bookings
              </h3>
              <p className="text-gray-600 text-center">
                Book facilities for individual training or full team sessions
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4 text-center">🔄</div>
              <h3 className="text-xl font-bold mb-3 text-center text-gray-900">
                Recurring Sessions
              </h3>
              <p className="text-gray-600 text-center">
                Set up weekly recurring booking patterns for regular training
              </p>
            </div>
          </div>

          {/* Facilities Section */}
          <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-10 rounded-xl shadow-xl mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              Available Facilities
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🏋️</div>
                <h3 className="text-xl font-semibold mb-2">Gaelic Gym</h3>
                <p className="text-green-100">
                  Fully equipped training facility for strength and conditioning
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">⚽</div>
                <h3 className="text-xl font-semibold mb-2">Training Pitches</h3>
                <p className="text-green-100">
                  Main and minor pitches available for team training sessions
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤾</div>
                <h3 className="text-xl font-semibold mb-2">Handball Court</h3>
                <p className="text-green-100">
                  Professional handball court for singles and doubles play
                </p>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-green-50 p-10 rounded-xl shadow-md mb-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-green-700 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl mx-auto mb-4 shadow-lg">
                  1
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Register</h3>
                <p className="text-gray-600">
                  Create your account with your member details and wait for admin approval
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-700 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl mx-auto mb-4 shadow-lg">
                  2
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Book Your Slot</h3>
                <p className="text-gray-600">
                  Choose your preferred facility, date, and time for your training session
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-700 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl mx-auto mb-4 shadow-lg">
                  3
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Train</h3>
                <p className="text-gray-600">
                  Show up at your reserved time and enjoy your training session
                </p>
              </div>
            </div>
          </div>

          {/* Member Benefits */}
          <div className="bg-white p-10 rounded-xl shadow-lg mb-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Member Benefits
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="flex items-start space-x-3">
                <span className="text-green-700 text-2xl">✓</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    24/7 Online Booking
                  </h4>
                  <p className="text-gray-600">
                    Book facilities anytime, anywhere from your device
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-700 text-2xl">✓</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Manage Your Schedule
                  </h4>
                  <p className="text-gray-600">
                    View and manage all your bookings in one place
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-700 text-2xl">✓</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Capacity Management
                  </h4>
                  <p className="text-gray-600">
                    Real-time availability ensures safe facility usage
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-700 text-2xl">✓</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Recurring Bookings
                  </h4>
                  <p className="text-gray-600">
                    Set up weekly patterns for consistent training schedules
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-gradient-to-r from-green-700 to-green-800 text-white p-12 rounded-xl shadow-xl">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-green-100">
              Join Eoghan Rua members in booking your training sessions today
            </p>
            <Link
              href="/register"
              className="bg-white text-green-700 hover:bg-green-50 font-bold py-4 px-10 rounded-lg transition-colors duration-200 inline-block text-lg shadow-lg"
            >
              Create Your Account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg mb-2">Eoghan Rua CLG</p>
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} Eoghan Rua Facility Booker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
