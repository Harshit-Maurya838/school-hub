"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VerifyRegistrationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState(
    !token ? "Verification token is missing from the link." : ""
  );

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(
          `/api/v1/public/register-school/verify?token=${encodeURIComponent(token as string)}`
        );
        const data = await res.json();

        if (res.ok) {
          setSuccess(true);
          setMessage(data.data?.message || "Email verified successfully!");
        } else {
          setSuccess(false);
          setMessage(data.error?.message || "Invalid or expired verification token.");
        }
      } catch {
        setSuccess(false);
        setMessage("Unable to contact verification service. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-6">
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
            <span className="text-zinc-300">Verifying contact email address...</span>
          </div>
        ) : success ? (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-600/20 text-emerald-400">
              <svg
                className="h-8 w-8"
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
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Email Verified!</h2>
            <p className="mt-2 text-sm text-zinc-300">{message}</p>
            <div className="mt-6">
              <a
                href="/login"
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Go to Platform Login
              </a>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-600/20 text-red-400">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Verification Failed
            </h2>
            <p className="mt-2 text-sm text-zinc-400">{message}</p>
            <div className="mt-6">
              <a
                href="/register-school"
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                Submit a new registration
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
          Loading verification...
        </div>
      }
    >
      <VerifyRegistrationContent />
    </Suspense>
  );
}
