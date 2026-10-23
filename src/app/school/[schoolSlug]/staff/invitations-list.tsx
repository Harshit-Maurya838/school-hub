"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Copy,
  Check,
  X,
} from "lucide-react";

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string | Date;
  createdAt: string | Date;
}

interface InvitationsListProps {
  schoolSlug: string;
  initialInvitations: InvitationItem[];
}

export function InvitationsList({ schoolSlug, initialInvitations }: InvitationsListProps) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resentModal, setResentModal] = useState<{
    email: string;
    actionUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const handleRevoke = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this invitation? The link will become immediately invalid."
      )
    ) {
      return;
    }

    setRevokingId(id);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/school/${schoolSlug}/invitations/${id}/revoke`, {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error?.message || "Failed to revoke invitation.");
          setRevokingId(null);
          return;
        }

        setInvitations((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: "REVOKED" } : inv))
        );
        router.refresh();
      } catch {
        setError("Network error while revoking invitation.");
      } finally {
        setRevokingId(null);
      }
    });
  };

  const handleResend = async (inv: InvitationItem) => {
    setResendingId(inv.id);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/school/${schoolSlug}/invitations/${inv.id}/resend`, {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error?.message || "Failed to resend invitation.");
          setResendingId(null);
          return;
        }

        const newInvite = data.data.invitation;
        const actionUrl = data.data.actionUrl;

        setInvitations((prev) =>
          prev.map((item) =>
            item.id === inv.id
              ? {
                  ...item,
                  status: "PENDING",
                  expiresAt: newInvite.expiresAt,
                  createdAt: new Date().toISOString(),
                }
              : item
          )
        );

        setResentModal({
          email: inv.email,
          actionUrl,
        });
        setCopied(false);
        router.refresh();
      } catch {
        setError("Network error while resending invitation.");
      } finally {
        setResendingId(null);
      }
    });
  };

  const handleCopy = () => {
    if (resentModal?.actionUrl) {
      navigator.clipboard.writeText(resentModal.actionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const now = new Date();

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {invitations.length === 0 ? (
        <p className="py-4 text-xs text-slate-400">No staff invitations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Invited Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent At</th>
                <th className="px-4 py-3">Expires At</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {invitations.map((inv) => {
                const isExpired =
                  inv.status === "EXPIRED" ||
                  (inv.status === "PENDING" && new Date(inv.expiresAt) < now);

                return (
                  <tr key={inv.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-bold text-slate-900">{inv.email}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">{inv.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          <span>Expired</span>
                        </span>
                      ) : inv.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>Pending</span>
                        </span>
                      ) : inv.status === "ACCEPTED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Accepted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          <XCircle className="h-3 w-3 text-slate-400" />
                          <span>{inv.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Resend button for expired or pending or revoked invitations */}
                        {inv.status !== "ACCEPTED" && (
                          <button
                            type="button"
                            onClick={() => handleResend(inv)}
                            disabled={resendingId === inv.id}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 ${
                              isExpired
                                ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Resend invitation and issue fresh link"
                          >
                            <RotateCw className="h-3 w-3" />
                            <span>
                              {resendingId === inv.id
                                ? "Resending..."
                                : isExpired
                                  ? "Resend Invite"
                                  : "Resend"}
                            </span>
                          </button>
                        )}

                        {inv.status === "PENDING" && !isExpired && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revokingId === inv.id}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            {revokingId === inv.id ? "Revoking..." : "Revoke"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resent Link Modal */}
      {resentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Invitation Successfully Resent!</span>
              </div>
              <button
                type="button"
                onClick={() => setResentModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                A fresh activation token was issued and dispatched to{" "}
                <span className="font-bold text-emerald-950">{resentModal.email}</span>. Valid for
                48 hours.
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  New Activation Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resentModal.actionUrl}
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

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setResentModal(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
