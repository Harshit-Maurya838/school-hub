"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  schoolName: string;
  schoolSlug: string;
  expiresAt: string;
  guardian?: { name: string; phone: string } | null;
  student?: { name: string; admissionNumber: string } | null;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(Boolean(token));
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(
    !token ? "Invitation token is missing from the link. Please check your invitation email." : null
  );

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(
          `/api/v1/auth/invitations/verify?token=${encodeURIComponent(token as string)}`
        );
        const json = await res.json();

        if (!res.ok) {
          setLoadError(json?.error?.message || "Invalid or expired invitation link.");
          setLoading(false);
          return;
        }

        setInvitation(json.data.invitation);
        if (json.data.invitation.guardian?.name) {
          setName(json.data.invitation.guardian.name);
        } else if (json.data.invitation.student?.name) {
          setName(json.data.invitation.student.name);
        }
      } catch {
        setLoadError(
          "Unable to verify invitation link. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  const validate = (): boolean => {
    const errs: { name?: string; password?: string; confirmPassword?: string } = {};

    if (!name.trim()) {
      errs.name = "Full name is required";
    }

    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters long";
    } else if (!/[A-Z]/.test(password)) {
      errs.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      errs.password = "Password must contain at least one number";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate() || !token) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            name: name.trim(),
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setFormError(data?.error?.message || "Failed to set up account. Please try again.");
          return;
        }

        const destination = data.data?.redirectUrl || "/";
        router.push(destination);
        router.refresh();
      } catch {
        setFormError("Network error during account setup. Please try again.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 font-sans text-zinc-300">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Verifying invitation security token...</span>
        </div>
      </div>
    );
  }

  if (loadError || !invitation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-zinc-900/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/60 text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Invalid Invitation</h2>
          <p className="mt-2 text-sm text-zinc-400">{loadError}</p>
          <div className="mt-6">
            <a
              href="/login"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Return to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/20 text-indigo-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Activate Your Account
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Join <span className="font-semibold text-indigo-300">{invitation.schoolName}</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs text-zinc-300">
            <span className="font-mono text-indigo-400">{invitation.role}</span>
            <span>•</span>
            <span>{invitation.email}</span>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300"
          >
            {formError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-200">
              Your Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              disabled={isPending}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
              }}
              className={`mt-1 block w-full rounded-lg border bg-zinc-800/80 px-3.5 py-2.5 text-white placeholder-zinc-500 shadow-sm transition focus:ring-2 focus:outline-none ${
                fieldErrors.name
                  ? "border-red-500 focus:ring-red-500/20"
                  : "border-zinc-700 focus:ring-indigo-500/20"
              }`}
              placeholder="e.g. Jane Doe"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-200">
              Choose Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={isPending}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                }}
                className={`block w-full rounded-lg border bg-zinc-800/80 px-3.5 py-2.5 pr-10 text-white placeholder-zinc-500 shadow-sm transition focus:ring-2 focus:outline-none ${
                  fieldErrors.password
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-zinc-700 focus:ring-indigo-500/20"
                }`}
                placeholder="Min. 8 characters (1 uppercase, 1 number)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-200">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              disabled={isPending}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword)
                  setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
              }}
              className={`mt-1 block w-full rounded-lg border bg-zinc-800/80 px-3.5 py-2.5 text-white placeholder-zinc-500 shadow-sm transition focus:ring-2 focus:outline-none ${
                fieldErrors.confirmPassword
                  ? "border-red-500 focus:ring-red-500/20"
                  : "border-zinc-700 focus:ring-indigo-500/20"
              }`}
              placeholder="Re-enter password"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Setting up account..." : "Complete Setup & Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
          Loading invitation portal...
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
