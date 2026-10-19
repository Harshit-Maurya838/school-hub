"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
          className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      {invitations.length === 0 ? (
        <p className="py-4 text-sm text-zinc-500">No staff invitations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 text-xs text-zinc-400 uppercase">
              <tr>
                <th className="px-4 py-3">Invited Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent At</th>
                <th className="px-4 py-3">Expires At</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-white">{inv.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-300">{inv.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                        inv.status === "PENDING"
                          ? "border border-amber-800 bg-amber-950 text-amber-300"
                          : inv.status === "ACCEPTED"
                            ? "border border-emerald-800 bg-emerald-950 text-emerald-400"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(inv.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(inv.expiresAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                        className="rounded border border-red-900/60 bg-red-950/30 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-900/50 hover:text-red-200 disabled:opacity-50"
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
