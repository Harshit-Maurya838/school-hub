"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  FieldError,
  Notice,
  Spinner,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/common/FormControls";
import { SchoolDetailsReadiness } from "../services/school-readiness";
import type { SchoolProfileView } from "../services/school-profile";
import { SchoolProfileWizard } from "./SchoolProfileWizard";

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
  initialProfile: SchoolProfileView;
  canEdit: boolean;
  canLock: boolean;
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  schoolName: "School name must be at least 2 characters.",
  schoolCode: "School code must be at least 2 characters.",
  schoolSlug: "URL slug must be valid.",
  schoolAdmin: "An active school administrator account must be assigned.",
  registrationApproval: "Platform administrator approval of the registration is pending.",
};

export function SchoolSettingsClient({
  schoolSlug,
  initialSchool,
  initialReadiness,
  initialProfile,
  canEdit,
  canLock,
}: Props) {
  const [activeTab, setActiveTab] = useState<"profile" | "readiness">("profile");
  const [school, setSchool] = useState<SchoolData>(initialSchool);
  const [readiness, setReadiness] = useState<SchoolDetailsReadiness>(initialReadiness);

  const [code, setCode] = useState(initialSchool.code);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCodeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (code.trim().length < 2) {
      setCodeError("School code must be at least 2 characters long.");
      return;
    }
    setCodeError(null);

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || "Failed to update the school code.");
        return;
      }
      setSchool(data.data.school);
      setReadiness(data.data.readiness);
      setCode(data.data.school.code);
      setSuccess("School code updated.");
    } catch {
      setError("Network error while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "profile" as const, label: "Master Profile", icon: ClipboardList },
    { id: "readiness" as const, label: "Readiness & Identifiers", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className="rounded transition-colors hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              {school.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-800">Settings</span>
          </div>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            School Profile & Settings
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Official UDISE+ profile, academic structure, leadership and verification status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/school/${schoolSlug}/settings/academic`}
            prefetch={true}
            className={`${secondaryButtonClass} px-3.5 py-1.5 text-xs`}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Academic Sessions
          </Link>
          <Link
            href={`/school/${schoolSlug}/academics`}
            prefetch={true}
            className={`${secondaryButtonClass} px-3.5 py-1.5 text-xs`}
          >
            Class & Subjects
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex items-center gap-2 overflow-x-auto border-b border-slate-200/80 pb-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                isActive
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && (
        <div role="tabpanel" id="settings-panel-profile" aria-labelledby="settings-tab-profile">
          <SchoolProfileWizard
            schoolSlug={schoolSlug}
            initialProfile={initialProfile}
            canEdit={canEdit}
            canLock={canLock}
          />
        </div>
      )}

      {activeTab === "readiness" && (
        <div
          role="tabpanel"
          id="settings-panel-readiness"
          aria-labelledby="settings-tab-readiness"
          className="space-y-5"
        >
          {/* Readiness status */}
          <div
            className={`rounded-2xl border p-5 ${
              readiness.isReady
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-amber-50/80"
            }`}
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    readiness.isReady
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {readiness.isReady ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <h2
                    className={`text-sm font-extrabold ${
                      readiness.isReady ? "text-emerald-950" : "text-amber-950"
                    }`}
                  >
                    {readiness.isReady ? "School details verified" : "School setup incomplete"}
                  </h2>
                  <p
                    className={`mt-0.5 text-xs ${
                      readiness.isReady ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {readiness.isReady
                      ? "School details and administrator identity are verified. Academic setup is unlocked."
                      : readiness.reason ||
                        "Complete the required details to unlock academic configuration."}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold ${
                  readiness.isReady
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-amber-300 bg-amber-100 text-amber-800"
                }`}
              >
                {readiness.isReady ? "Ready for academics" : "Action required"}
              </span>
            </div>

            {!readiness.isReady && readiness.missingFields.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-white p-3.5 text-xs">
                <p className="font-bold text-amber-950">Needs attention before activation:</p>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-slate-600">
                  {readiness.missingFields.map((field) => (
                    <li key={field}>{MISSING_FIELD_LABELS[field] ?? field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Platform identifiers */}
            <form
              onSubmit={handleCodeUpdate}
              noValidate
              className="shadow-card space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-2"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-slate-900">Platform identifiers</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  The school code appears on receipts and records. The URL slug is permanent.
                </p>
              </div>

              {error && <Notice>{error}</Notice>}
              {success && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="school-code"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    School code
                  </label>
                  <input
                    id="school-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(codeError)}
                    aria-describedby={codeError ? "school-code-error" : undefined}
                    className={inputClass(Boolean(codeError), "font-mono uppercase")}
                  />
                  <FieldError id="school-code-error">{codeError}</FieldError>
                </div>
                <div>
                  <label
                    htmlFor="school-slug"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    URL slug
                  </label>
                  <input
                    id="school-slug"
                    value={school.slug}
                    disabled
                    className={inputClass(false, "font-mono")}
                  />
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="submit"
                    disabled={saving || code.trim().toUpperCase() === school.code}
                    className={primaryButtonClass}
                  >
                    {saving ? <Spinner /> : <Save className="h-4 w-4" aria-hidden="true" />}
                    {saving ? "Saving…" : "Save school code"}
                  </button>
                </div>
              )}
            </form>

            {/* Lifecycle */}
            <div className="shadow-card space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5">
              <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Account status
              </h2>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Lifecycle</dt>
                  <dd className="font-bold text-slate-800">{school.status}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-1">
                  <dt className="text-slate-500">State</dt>
                  <dd
                    className={`font-bold ${school.isActive ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {school.isActive ? "Active" : "Inactive"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Administrator</dt>
                  <dd className="truncate pl-3 font-bold text-slate-800">
                    {readiness.admin ? readiness.admin.name : "Not assigned"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-1">
                  <dt className="text-slate-500">Registration</dt>
                  <dd className="font-bold text-slate-800">
                    {readiness.isRegistrationApproved ? "Approved" : "Pending"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolSettingsClient;
