"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface InviteStaffButtonProps {
  schoolSlug: string;
}

export function InviteStaffButton({ schoolSlug }: InviteStaffButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"TEACHER" | "ACCOUNTANT">("TEACHER");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setEmail("");
    setRole("TEACHER");
    setErrorMessage(null);
    setSuccessLink(null);
    setCopied(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (successLink) {
      router.refresh();
    }
  };

  const handleCopy = () => {
    if (successLink) {
      navigator.clipboard.writeText(successLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/school/${schoolSlug}/invitations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            role,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data?.error?.message || "Failed to issue invitation.");
          return;
        }

        setSuccessLink(data.data?.actionUrl || null);
        router.refresh();
      } catch {
        setErrorMessage("Network error occurred while issuing invitation.");
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        id="invite-staff-btn"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:outline-none"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Invite Staff</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Invite Staff Member</h3>
                <p className="text-xs text-zinc-400">
                  Send a one-time activation link to onboard a teacher or accountant.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-zinc-400 transition hover:text-white focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {successLink ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <svg
                      className="h-5 w-5 shrink-0"
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
                    <span>Invitation Successfully Issued!</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-300">
                    An activation invitation has been created for{" "}
                    <span className="font-semibold text-white">{email}</span> ({role}).
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    One-Time Activation Link:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={successLink}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessLink(null);
                      setEmail("");
                    }}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    Invite Another
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300"
                  >
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label htmlFor="staffEmail" className="block text-xs font-medium text-zinc-200">
                    Staff Email Address
                  </label>
                  <input
                    id="staffEmail"
                    type="email"
                    required
                    disabled={isPending}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="staffRole" className="block text-xs font-medium text-zinc-200">
                    Assigned Role
                  </label>
                  <select
                    id="staffRole"
                    value={role}
                    disabled={isPending}
                    onChange={(e) => setRole(e.target.value as "TEACHER" | "ACCOUNTANT")}
                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="TEACHER">TEACHER (Academics, Attendance, Grades)</option>
                    <option value="ACCOUNTANT">
                      ACCOUNTANT (Fee Structures, Payments, Financials)
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isPending ? "Generating Token..." : "Issue Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
