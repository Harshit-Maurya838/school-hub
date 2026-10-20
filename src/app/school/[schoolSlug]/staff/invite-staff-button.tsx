"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Copy, Check, AlertTriangle, CheckCircle2 } from "lucide-react";

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
          setErrorMessage(data?.error?.message || "Failed to generate staff invitation.");
          return;
        }

        const origin = window.location.origin;
        const link = `${origin}/invite/${data.data.invitation.token}`;
        setSuccessLink(link);
      } catch {
        setErrorMessage("Network error while creating staff invitation.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800"
      >
        <UserPlus className="h-4 w-4" />
        <span>Invite Staff</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Invite Staff Member</h3>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {successLink ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Invitation Successfully Issued!</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-800">
                    An activation invitation has been created for{" "}
                    <span className="font-bold">{email}</span> ({role}).
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    One-Time Activation Link:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={successLink}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessLink(null);
                      setEmail("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Invite Another
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
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
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="staffEmail" className="block text-xs font-bold text-slate-700">
                    Staff Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="staffEmail"
                    type="email"
                    required
                    disabled={isPending}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="staffRole" className="block text-xs font-bold text-slate-700">
                    Designated Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="staffRole"
                    disabled={isPending}
                    value={role}
                    onChange={(e) => setRole(e.target.value as "TEACHER" | "ACCOUNTANT")}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="TEACHER">Teacher (Instruction & Roster Management)</option>
                    <option value="ACCOUNTANT">Accountant (Financial Records & Ledgers)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {isPending ? "Generating..." : "Send Invitation"}
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
