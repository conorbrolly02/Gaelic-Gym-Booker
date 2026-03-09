"use client";

/**
 * User Settings Page
 * =============================================================================
 * PURPOSE
 *  - Allow the currently authenticated user to view and update profile details.
 *  - Allow the user to change password securely.
 *
 * SECURITY
 *  - We NEVER reveal the user's existing password (not even masked).
 *  - The "eye" icon only toggles visibility of WHAT THE USER IS TYPING NOW.
 *  - If the user forgot the current password, the correct flow is: "Forgot password" → reset via email.
 *
 * HOW IT WORKS
 *  - On mount, we load the user profile from the API (GET /api/users/me).
 *  - "Save changes" calls PUT /api/users/me with edited fields.
 *  - "Change password" calls POST /api/auth/change-password with { current_password, new_password }.
 */



import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { memberApi, authApi } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

type Profile = {
  full_name: string;
  email: string;
  phone?: string | null;
  // Add more optional profile fields here if your backend stores them:
  // display_name?: string | null;
  // avatar_url?: string | null;
};

// Simple email/phone validators (client-side only; server will also validate)
const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const isValidPhone = (v: string) =>
  v.trim() === "" || /^[\d+\-\s()]{6,}$/.test(v);

// New password client-side guardrails (you can tune these)
const passwordErrors = (pwd: string): string[] => {
  const issues: string[] = [];
  if (pwd.length < 8) issues.push("At least 8 characters");
  if (!/[A-Z]/.test(pwd)) issues.push("One uppercase letter");
  if (!/[a-z]/.test(pwd)) issues.push("One lowercase letter");
  if (!/[0-9]/.test(pwd)) issues.push("One number");
  return issues;
};

export default function UserSettingsPage() {
  // ---------------------------- PROFILE STATE -------------------------------
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    phone: "",
  });
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null);
  const profileDirty = useMemo(() => {
    if (!initialProfile) return false;
    return (
      profile.full_name !== initialProfile.full_name ||
      profile.email !== initialProfile.email ||
      (profile.phone ?? "") !== (initialProfile.phone ?? "")
    );
  }, [profile, initialProfile]);

  // ---------------------------- PASSWORD STATE ------------------------------
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ----------------------------- LOAD PROFILE -------------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        const me = await memberApi.getProfile();
        if (mounted) {
          setProfile({
            full_name: me.full_name ?? "",
            email: me.email ?? "",
            phone: me.phone ?? "",
          });
          setInitialProfile({
            full_name: me.full_name ?? "",
            email: me.email ?? "",
            phone: me.phone ?? "",
          });
        }
      } catch (err: any) {
        if (mounted) {
          setProfileError(
            err?.message ?? "Failed to load profile. Please try again."
          );
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --------------------------- SAVE PROFILE ---------------------------------
  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(profile.email)) {
      setProfileError("Please enter a valid email address.");
      return;
    }
    if (!isValidPhone(profile.phone ?? "")) {
      setProfileError(
        "Please enter a valid phone number (digits, spaces, +, -, and parentheses)."
      );
      return;
    }
    try {
      setSavingProfile(true);
      setProfileError(null);

      // Update member profile (name and phone)
      const updatedMember = await memberApi.updateProfile({
        full_name: profile.full_name.trim(),
        phone: (profile.phone ?? "").trim() || null,
      });

      // If email changed, update it via authApi
      let finalEmail = initialProfile.email;
      if (profile.email.trim() !== initialProfile.email) {
        const authResponse = await authApi.updateProfile({
          email: profile.email.trim(),
        });
        finalEmail = authResponse.user.email;
      }

      // Update initial profile with saved values
      setInitialProfile({
        full_name: updatedMember.full_name,
        email: finalEmail,
        phone: updatedMember.phone,
      });

      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err?.message ?? "Failed to save changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  // -------------------------- CHANGE PASSWORD -------------------------------
  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword) {
      setPwError("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    const issues = passwordErrors(newPassword);
    if (issues.length > 0) {
      setPwError(`Please improve your new password: ${issues.join(", ")}`);
      return;
    }

    try {
      setChangingPw(true);
      await authApi.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err: any) {
      setPwError(err?.message ?? "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  // ------------------------------- RENDER -----------------------------------
  if (loadingProfile) {
    return <LoadingSpinner fullScreen text="Loading your settings..." />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">User settings</h1>
        <p className="text-sm text-gray-500">
          Manage your profile details and update your password.
        </p>
      </div>

      {/* Profile form card */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-500 mb-4">
          Update your personal information. If you change your email, you may be
          asked to verify it next sign-in.
        </p>

        {profileError && (
          <div className="mb-4">
            <Alert type="error" message={profileError} onClose={() => setProfileError(null)} />
          </div>
        )}
        {profileSuccess && (
          <div className="mb-4">
            <Alert type="success" message={profileSuccess} onClose={() => setProfileSuccess(null)} />
          </div>
        )}

        <form onSubmit={onSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full name */}
          <div className="flex flex-col">
            <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              className="mt-1 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              placeholder="e.g. Conor Brolly"
              required
            />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="mt-1 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              placeholder="you@example.com"
              required
            />
            {!isValidEmail(profile.email) && profile.email.trim() !== "" && (
              <p className="mt-1 text-xs text-red-600">Enter a valid email address.</p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col sm:col-span-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              className="mt-1 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              placeholder="+44 7700 900000"
            />
            {!isValidPhone(profile.phone ?? "") && (
              <p className="mt-1 text-xs text-red-600">
                Use digits, spaces, +, -, or parentheses.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="sm:col-span-2 mt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={!profileDirty || savingProfile}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all shadow-md
                ${savingProfile
                  ? "bg-yellow-500 cursor-wait"
                  : profileDirty
                  ? "bg-green-600 hover:bg-green-700 hover:shadow-lg"
                  : "bg-gray-400 cursor-not-allowed opacity-60"}
              `}
            >
              {savingProfile ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={!profileDirty || savingProfile}
              onClick={() => initialProfile && setProfile(initialProfile)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                ${profileDirty && !savingProfile
                  ? "border-orange-500 text-orange-700 bg-orange-50 hover:bg-orange-100"
                  : "border-gray-300 text-gray-500 bg-gray-50 cursor-not-allowed opacity-50"}
              `}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {/* Password card */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">Password</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose a strong password you haven’t used elsewhere.
        </p>

        {pwError && (
          <div className="mb-4">
            <Alert type="error" message={pwError} onClose={() => setPwError(null)} />
          </div>
        )}
        {pwSuccess && (
          <div className="mb-4">
            <Alert type="success" message={pwSuccess} onClose={() => setPwSuccess(null)} />
          </div>
        )}

        <form onSubmit={onChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current password */}
          <PasswordInput
            id="current_password"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            setShow={setShowCurrent}
            autoComplete="current-password"
          />

          {/* New password */}
          <PasswordInput
            id="new_password"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            setShow={setShowNew}
            autoComplete="new-password"
          />

          {/* Confirm new password */}
          <PasswordInput
            id="confirm_new_password"
            label="Confirm new password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            show={showConfirm}
            setShow={setShowConfirm}
            autoComplete="new-password"
          />

          {/* Hints for password strength */}
          <div className="sm:col-span-2 -mt-2">
            {newPassword.length > 0 && (
              <ul className="list-disc list-inside text-xs text-gray-600">
                {passwordErrors(newPassword).length === 0 ? (
                  <li className="text-green-700">Looks strong ✔</li>
                ) : (
                  passwordErrors(newPassword).map((e) => (
                    <li key={e} className="text-red-600">{e}</li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="sm:col-span-2 mt-2">
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors
                ${changingPw ? "bg-gray-400 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700"}
              `}
              disabled={changingPw}
            >
              {changingPw ? "Changing…" : "Change password"}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Forgot your current password?{" "}
              <Link href="/forgot-password" className="text-primary-700 hover:underline">
                Reset it here
              </Link>
              .
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

/**
 * Small reusable password input with a show/hide toggle.
 * - We NEVER load or reveal any stored password; this only toggles the current input.
 */
function PasswordInput(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  autoComplete?: string;
}) {
  const { id, label, value, onChange, show, setShow, autoComplete } = props;
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-md border-gray-300 pr-10 focus:border-primary-500 focus:ring-primary-500"
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 px-2 flex items-center text-gray-500 hover:text-gray-700"
        >
          {/* Eye / Eye-off icons (inline SVG to avoid extra deps) */}
          {show ? (
            // Eye-off
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7 0-1.03.34-2.003.94-2.828m2.485-2.485C7.24 5.686 9.54 5 12 5c5 0 9 4 9 7 0 1.163-.402 2.258-1.11 3.23M3 3l18 18M9.88 9.88A3 3 0 0114.12 14.12" />
            </svg>
          ) : (
            // Eye
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}