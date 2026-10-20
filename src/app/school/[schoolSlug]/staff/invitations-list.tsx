"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
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
              {invitations.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-bold text-slate-900">{inv.email}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">{inv.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.status === "PENDING" ? (
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
                    {inv.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {revokingId === inv.id ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
