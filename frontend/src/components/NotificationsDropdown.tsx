"use client";

/**
 * NotificationsDropdown
 * =====================
 * Bell icon + dropdown panel showing notifications for the current user.
 * Shown to ALL authenticated users (not just admins).
 *
 * Features:
 * - Unread badge count on the bell icon
 * - Dropdown listing recent notifications with type-coloured badges
 * - "Mark all read" button
 * - Delete individual notification
 * - Polls every 60 seconds for new notifications
 * - Closes on outside click or Escape key
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { notificationsApi } from "@/lib/api";
import { Notification, NotificationType } from "@/types";

interface NotificationsDropdownProps {
  /** Called when the dropdown closes so callers can react if needed */
  onClose?: () => void;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type BadgeStyle = { bg: string; text: string; label: string };

function getTypeBadge(type: NotificationType): BadgeStyle {
  switch (type) {
    case "BOOKING_APPROVED":
      return { bg: "bg-green-100", text: "text-green-800", label: "Approved" };
    case "BOOKING_REJECTED":
      return { bg: "bg-red-100", text: "text-red-800", label: "Declined" };
    case "MEMBERSHIP_APPROVED":
      return { bg: "bg-blue-100", text: "text-blue-800", label: "Membership" };
    case "MEMBERSHIP_SUSPENDED":
      return { bg: "bg-yellow-100", text: "text-yellow-800", label: "Suspended" };
    case "MEMBERSHIP_REACTIVATED":
      return { bg: "bg-green-100", text: "text-green-800", label: "Reactivated" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800", label: "Info" };
  }
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── Data fetching ──────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail – badge just won't update
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll unread count every 60 s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // When dropdown opens, fetch full list
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // ── Outside click / Escape ──────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        onClose?.();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // ── Actions ────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleDelete = async (id: string, wasUnread: boolean) => {
    await notificationsApi.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleToggle = () => setIsOpen((v) => !v);

  // ── Render ─────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-white hover:bg-white/10 transition-colors"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen ? "true" : "false"}
      >
        {/* Bell icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[480px] flex flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#903838] hover:text-[#7d2f2f] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-[#903838] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <svg
                  className="w-8 h-8 text-gray-300 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const badge = getTypeBadge(n.type);
                  return (
                    <li
                      key={n.id}
                      className={[
                        "px-4 py-3 flex gap-3 items-start transition-colors",
                        n.is_read ? "bg-white" : "bg-blue-50/50",
                      ].join(" ")}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        {!n.is_read ? (
                          <span className="block w-2 h-2 rounded-full bg-[#903838]" />
                        ) : (
                          <span className="block w-2 h-2" />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {n.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id, !n.is_read)}
                        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
