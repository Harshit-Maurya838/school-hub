"use client";

import { useState } from "react";
import Link from "next/link";
import { SchoolDetailsReadiness } from "@/lib/school-readiness";

interface SchoolData {
  id: string;
  name: string;
  code: string;
  slug: string;
  isActive: boolean;
  status: string;
}

interface Props {
  schoolSlug: string;
  initialSchool: SchoolData;
  initialReadiness: SchoolDetailsReadiness;
  userRole: string;
}

export function SchoolSettingsClient({
  schoolSlug,
  initialSchool,
  initialReadiness,
  userRole,
}: Props) {
  const [school, setSchool] = useState<SchoolData>(initialSchool);
  const [readiness, setReadiness] = useState<SchoolDetailsReadiness>(initialReadiness);

  const [name, setName] = useState(initialSchool.name);
  const [code, setCode] = useState(initialSchool.code);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canEdit = userRole === "SCHOOL_ADMIN" || userRole === "SUPER_ADMIN";

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (name.trim().length < 2) {
      setError("School name must be at least 2 characters long.");
      return;
    }

    if (code.trim().length < 2) {
      setError("School code must be at least 2 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update school details");
      }

      setSchool(data.data.school);
      setReadiness(data.data.readiness);
      setName(data.data.school.name);
      setCode(data.data.school.code);
      setSuccess("School details successfully updated!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Link href={`/school/${schoolSlug}`} className="transition hover:text-indigo-400">
            {school.name}
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Settings</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">School Profile & Setup</h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              Manage core tenant information, verification status, and academic prerequisites.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/school/${schoolSlug}/academics`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              Academic Hub &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Readiness Status Card */}
      <div
        className={`rounded-2xl border p-6 ${
          readiness.isReady
            ? "border-emerald-500/30 bg-emerald-950/20"
            : "border-amber-500/30 bg-amber-950/20"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  readiness.isReady ? "bg-emerald-500" : "animate-pulse bg-amber-500"
                }`}
              />
              <h2 className="text-base font-semibold text-white">
                {readiness.isReady
                  ? "School Profile & Details: Complete"
                  : "School Profile Setup Incomplete"}
              </h2>
            </div>
            <p className="text-xs text-zinc-300">
              {readiness.isReady
                ? "Your school details and administrator identity are verified. Academic setup is unlocked."
                : readiness.reason ||
                  "Please complete all required details to unlock academic configuration."}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              readiness.isReady
                ? "border border-emerald-500/40 bg-emerald-950 text-emerald-400"
                : "border border-amber-500/40 bg-amber-950 text-amber-400"
            }`}
          >
            {readiness.isReady ? "Ready for Academics" : "Action Required"}
          </span>
        </div>

        {/* Missing fields breakdown if incomplete */}
        {!readiness.isReady && readiness.missingFields.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-900/40 bg-zinc-950/60 p-4">
            <p className="text-xs font-semibold text-amber-300">Items requiring attention:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-zinc-400">
              {readiness.missingFields.map((field) => (
                <li key={field}>
                  {field === "schoolName" && "School name must be at least 2 characters."}
                  {field === "schoolCode" && "School code must be at least 2 characters."}
                  {field === "schoolSlug" && "URL slug must be valid."}
                  {field === "schoolAdmin" &&
                    "Active school administrator account must be assigned."}
                  {field === "registrationApproval" &&
                    "Platform administrator registration approval is pending."}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form
            onSubmit={handleUpdate}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm"
          >
            <h3 className="text-base font-semibold text-white">Institutional Details</h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Official name and institutional code used throughout reports, sessions, and records.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-800/80 bg-red-950/40 p-3.5 text-xs text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-3.5 text-xs text-emerald-300">
                {success}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">School Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit || loading}
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                  placeholder="e.g. Springfield High School"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300">School Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={!canEdit || loading}
                    className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 font-mono text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                    placeholder="e.g. SPR_01"
                    required
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Unique uppercase code identifying this institution.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300">URL Slug</label>
                  <input
                    type="text"
                    value={school.slug}
                    disabled
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-mono text-sm text-zinc-400"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Permanent URL route identifier.</p>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="mt-6 flex justify-end border-t border-zinc-800/80 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h4 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Account Status
            </h4>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Lifecycle</span>
                <span className="font-semibold text-white">{school.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Active Status</span>
                <span
                  className={
                    school.isActive
                      ? "font-semibold text-emerald-400"
                      : "font-semibold text-red-400"
                  }
                >
                  {school.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Administrator</span>
                <span className="text-zinc-300">
                  {readiness.admin ? readiness.admin.name : "Not Assigned"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-900/30 bg-indigo-950/10 p-6">
            <h4 className="text-xs font-semibold text-indigo-300">Next Recommended Step</h4>
            <p className="mt-1 text-xs text-zinc-400">
              Once school profile is ready, configure your academic calendar sessions.
            </p>
            <div className="mt-4">
              <Link
                href={`/school/${schoolSlug}/academics/sessions`}
                className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Go to Academic Sessions &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
