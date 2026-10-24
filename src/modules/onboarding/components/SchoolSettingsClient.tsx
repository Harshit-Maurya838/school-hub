"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Palette,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { SchoolDetailsReadiness } from "../services/school-readiness";

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
  const [activeTab, setActiveTab] = useState<"identity" | "readiness" | "appearance">("identity");
  const [, startTabTransition] = useTransition();
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

  const tabs = [
    { id: "identity" as const, label: "Identity & Branding", icon: Building2 },
    { id: "readiness" as const, label: "Readiness & Verification", icon: ShieldCheck },
    { id: "appearance" as const, label: "Preferences & Theme", icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {school.name} ({school.code})
            </Link>
            <span>/</span>
            <span className="text-slate-800">Settings</span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            School Profile & Settings
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Manage official institution identity, verification readiness, and system preferences
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>{userRole}</span>
          </div>

          <Link
            href={`/school/${schoolSlug}/settings/academic`}
            prefetch={true}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] hover:bg-slate-800"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Academic Settings</span>
          </Link>

          <Link
            href={`/school/${schoolSlug}/academics`}
            prefetch={true}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <span>Class & Subjects</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex scrollbar-none items-center gap-2 overflow-x-auto border-b border-slate-200/80 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                startTabTransition(() => {
                  setActiveTab(tab.id);
                });
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Readiness Status Banner */}
      <div
        className={`rounded-2xl border p-5 shadow-xs transition-all ${
          readiness.isReady
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-amber-200 bg-amber-50/80"
        }`}
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                readiness.isReady
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {readiness.isReady ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <h3
                className={`text-sm font-extrabold ${
                  readiness.isReady ? "text-emerald-950" : "text-amber-950"
                }`}
              >
                {readiness.isReady
                  ? "School Details & Verification: Verified"
                  : "School Profile Setup Incomplete"}
              </h3>
              <p
                className={`mt-0.5 text-xs ${
                  readiness.isReady ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {readiness.isReady
                  ? "Your school details and administrator identity are verified. Academic setup is fully unlocked."
                  : readiness.reason ||
                    "Please complete all required details to unlock academic configuration."}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              readiness.isReady
                ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                : "border border-amber-300 bg-amber-100 text-amber-800"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                readiness.isReady ? "bg-emerald-600" : "animate-ping bg-amber-600"
              }`}
            />
            <span>{readiness.isReady ? "Ready for Academics" : "Action Required"}</span>
          </span>
        </div>

        {/* Missing fields breakdown if incomplete */}
        {!readiness.isReady && readiness.missingFields.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-white p-3.5 text-xs">
            <p className="font-bold text-amber-950">Items requiring attention before activation:</p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-slate-600">
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

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: Identity & Branding */}
      {activeTab === "identity" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form
              onSubmit={handleUpdate}
              className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Institutional Identity</h3>
                <p className="text-xs text-slate-400">
                  Official name and institutional code used throughout reports, sessions, and
                  records
                </p>
              </div>

              {/* Logo Preview Row */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 font-mono text-lg font-bold text-white shadow-sm shadow-emerald-800/20">
                  {school.code.slice(0, 3)}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Institution Crest & Identity</h4>
                  <p className="text-[11px] text-slate-400">
                    Derived from your unique school registration code ({school.code})
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    School Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit || loading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-60"
                    placeholder="e.g. Springfield High School"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Official name displayed on student cards, certificates, and headers.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      School Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      disabled={!canEdit || loading}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 uppercase placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-60"
                      placeholder="e.g. SPR_01"
                      required
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Unique alphanumeric code identifying your school in the tenant directory.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">URL Slug</label>
                    <input
                      type="text"
                      value={school.slug}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Permanent web URL route identifier.
                    </p>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] text-slate-400">
                    Changes are validated and recorded securely
                  </span>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800 disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{loading ? "Saving..." : "Save Configuration"}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Tenant Lifecycle Status
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Lifecycle</span>
                  <span className="font-bold text-slate-800">{school.status}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Active State</span>
                  <span
                    className={`font-bold ${
                      school.isActive ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {school.isActive ? "Active Tenant" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Designated Admin</span>
                  <span className="font-bold text-slate-800">
                    {readiness.admin ? readiness.admin.name : "Not Assigned"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Next Recommended Step</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Once school profile is ready, configure your academic calendar sessions.
              </p>
              <div className="mt-3">
                <Link
                  href={`/school/${schoolSlug}/settings/academic`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <span>Go to Academic Settings</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Readiness & Verification */}
      {activeTab === "readiness" && (
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Institutional Readiness Audit</h3>
            <p className="text-xs text-slate-400">
              Live validation report assessing institutional setup prerequisites
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Administrator Assignment
              </span>
              <p className="text-sm font-bold text-slate-900">
                {readiness.admin ? readiness.admin.name : "Unassigned"}
              </p>
              <p className="text-xs text-slate-500">
                {readiness.admin?.email || "No primary administrative contact attached"}
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Registration Verification
              </span>
              <p className="text-sm font-bold text-slate-900">{school.status}</p>
              <p className="text-xs text-slate-500">
                {school.isActive
                  ? "Operational authorization confirmed"
                  : "Platform verification pending"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Preferences & Theme */}
      {activeTab === "appearance" && (
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">System Preferences</h3>
            <p className="text-xs text-slate-400">
              CampusPulse UI design system palette and accessibility settings
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">
                Active Color Theme
              </label>
              <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">CampusPulse Emerald</p>
                      <p className="text-[10px] font-semibold text-emerald-700">
                        Active Design System
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Default
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
