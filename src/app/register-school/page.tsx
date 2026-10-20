"use client";

import Link from "next/link";
import React, { useState, useTransition } from "react";

export default function RegisterSchoolPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [verificationUrl, setVerificationUrl] = useState<string>("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSchoolName(val);
    if (!desiredSlug || desiredSlug === val.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setDesiredSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/public/register-school", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName,
            schoolCode,
            desiredSlug,
            adminName,
            adminEmail,
            adminPhone: adminPhone || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(
            data?.error?.message || "Failed to submit registration. Please review the form."
          );
          return;
        }
        setVerificationUrl(data.data.verificationUrl);
        setSubmitted(true);
      } catch {
        setErrorMessage("Network error occurred. Please try again.");
      }
    });
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-900/40 bg-zinc-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
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
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Verification Link Sent
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            We have dispatched a verification link to{" "}
            <span className="font-semibold text-emerald-400">{adminEmail}</span>.
          </p>
          <div className="mt-6 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left text-xs text-zinc-400">
            <p>
              <strong>Next steps:</strong>
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Click the verification link in your inbox.</li>
              <li>Our platform administrator team will review your application.</li>
              <li>
                Upon approval, your school workspace and initial admin credentials will be
                provisioned.
              </li>
              <li>
                <Link
                  href={verificationUrl}
                  className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
                >
                  {verificationUrl}
                </Link>
              </li>
            </ol>
          </div>
          <div className="mt-6">
            <a href="/login" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
              Return to Login Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-400">
            School Onboarding
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
            Register Your School
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Apply to launch your institution on our modern multi-tenant school operating system.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="schoolName" className="block text-sm font-medium text-zinc-200">
                School Name
              </label>
              <input
                id="schoolName"
                type="text"
                required
                value={schoolName}
                onChange={handleNameChange}
                placeholder="e.g. Oakridge International School"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="schoolCode" className="block text-sm font-medium text-zinc-200">
                Official School Code
              </label>
              <input
                id="schoolCode"
                type="text"
                required
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                placeholder="e.g. OAK_01"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 font-mono text-white uppercase placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="desiredSlug" className="block text-sm font-medium text-zinc-200">
                Workspace URL Slug
              </label>
              <input
                id="desiredSlug"
                type="text"
                required
                value={desiredSlug}
                onChange={(e) => setDesiredSlug(e.target.value.toLowerCase())}
                placeholder="e.g. oakridge-intl"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 font-mono text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="adminName" className="block text-sm font-medium text-zinc-200">
                Primary Representative / Principal Name
              </label>
              <input
                id="adminName"
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Dr. Eleanor Vance"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-zinc-200">
                Official Contact Email
              </label>
              <input
                id="adminEmail"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="principal@oakridge.edu"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="adminPhone" className="block text-sm font-medium text-zinc-200">
                Contact Phone (Optional)
              </label>
              <input
                id="adminPhone"
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isPending ? "Submitting Application..." : "Submit Registration Application"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-zinc-500">
          Already registered?{" "}
          <a href="/login" className="text-indigo-400 hover:text-indigo-300">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
