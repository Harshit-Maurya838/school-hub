"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, ChevronRight, Loader2, Lock, LockOpen } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/common/Badge";

export interface PlatformSchoolRow {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: string;
  staffCount: number;
  studentCount: number;
  profile: {
    isComplete: boolean;
    isLocked: boolean;
    lockedAt: string | null;
  };
}

const SCHOOL_STATUS: Record<
  string,
  { variant: NonNullable<BadgeProps["variant"]>; label: string }
> = {
  ACTIVE: { variant: "emerald", label: "Active" },
  PENDING: { variant: "alert", label: "Pending" },
  SUSPENDED: { variant: "due", label: "Suspended" },
  REJECTED: { variant: "due", label: "Rejected" },
};

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const focusRing = "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";
const rowButton = `inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

function ProfileState({ profile }: { profile: PlatformSchoolRow["profile"] }) {
  if (profile.isLocked) {
    return (
      <div className="space-y-1">
        <Badge variant="emerald" className="whitespace-nowrap">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Locked
        </Badge>
        {profile.lockedAt && (
          <p className="text-[11px] whitespace-nowrap text-slate-500">
            since {dateFormat.format(new Date(profile.lockedAt))}
          </p>
        )}
      </div>
    );
  }
  if (profile.isComplete) {
    return (
      <Badge variant="alert" className="whitespace-nowrap">
        <LockOpen className="h-3 w-3" aria-hidden="true" />
        Open for edits
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="whitespace-nowrap">
      Not completed
    </Badge>
  );
}

export function PlatformSchoolsTable({ initialSchools }: { initialSchools: PlatformSchoolRow[] }) {
  const [schools, setSchools] = useState(initialSchools);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setProfileLock = async (school: PlatformSchoolRow, locked: boolean) => {
    setPendingId(school.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/school/${school.slug}/profile/master/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Could not update the school profile");
      }
      const view = data.data.profile;
      setSchools((prev) =>
        prev.map((s) =>
          s.id === school.id
            ? {
                ...s,
                profile: {
                  isComplete: view.isComplete,
                  isLocked: view.lock.isLocked,
                  lockedAt: view.lock.lockedAt,
                },
              }
            : s
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update the school profile";
      setError(`${school.name}: ${message}`);
    } finally {
      setPendingId(null);
    }
  };

  if (schools.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-slate-700">No schools yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Schools appear here once a registration is approved.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs font-semibold text-rose-800"
        >
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className={`cursor-pointer rounded-md px-1.5 underline-offset-2 hover:underline ${focusRing}`}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-5 py-3">
                School
              </th>
              <th scope="col" className="px-5 py-3">
                Code
              </th>
              <th scope="col" className="px-5 py-3">
                Status
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Staff
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Students
              </th>
              <th scope="col" className="px-5 py-3">
                School profile
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schools.map((school) => {
              const status = SCHOOL_STATUS[school.status] ?? {
                variant: "default" as const,
                label: school.status,
              };
              const busy = pendingId === school.id;
              return (
                <tr key={school.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600"
                        aria-hidden="true"
                      >
                        {school.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold whitespace-nowrap text-slate-900">
                          {school.name}
                        </p>
                        <p className="font-mono text-[11px] whitespace-nowrap text-slate-500">
                          /school/{school.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono font-semibold whitespace-nowrap text-slate-800">
                    {school.code}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800 tabular-nums">
                    {school.staffCount}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800 tabular-nums">
                    {school.studentCount}
                  </td>
                  <td className="px-5 py-3.5">
                    <ProfileState profile={school.profile} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {school.profile.isLocked ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setProfileLock(school, false)}
                          aria-label={`Allow ${school.name} to edit its school profile`}
                          className={rowButton}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>{busy ? "Unlocking…" : "Allow edits"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || !school.profile.isComplete}
                          onClick={() => setProfileLock(school, true)}
                          aria-label={`Lock the school profile of ${school.name}`}
                          title={
                            school.profile.isComplete
                              ? undefined
                              : "The school must complete all three profile steps before it can be locked"
                          }
                          className={rowButton}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>{busy ? "Locking…" : "Lock profile"}</span>
                        </button>
                      )}
                      <Link
                        href={`/school/${school.slug}`}
                        aria-label={`Open ${school.name} workspace`}
                        className={`${rowButton} hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800`}
                      >
                        <span>Open workspace</span>
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
