"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Lock,
  LockOpen,
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
import { STEPS, SchoolProfileSections, SectionState } from "./SchoolProfileSections";

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

const INDEX = [
  ...STEPS.map((s) => ({ id: `section-${s.id}`, label: s.label, step: s.id })),
  { id: "section-identifiers", label: "School code", step: null },
  { id: "section-account", label: "Account status", step: null },
];

const focusRing = "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";

/** Id of the index section currently at the top of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) =>
          e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)
        );
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      // A band just under the fixed top bar: the section crossing it is the one being read.
      { rootMargin: "-96px 0px -60% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const INDEX_IDS = INDEX.map((i) => i.id);

export function SchoolSettingsClient({
  schoolSlug,
  initialSchool,
  initialReadiness,
  initialProfile,
  canEdit,
  canLock,
}: Props) {
  const [school, setSchool] = useState<SchoolData>(initialSchool);
  const [readiness, setReadiness] = useState<SchoolDetailsReadiness>(initialReadiness);
  const [profile, setProfile] = useState<SchoolProfileView>(initialProfile);

  const [code, setCode] = useState(initialSchool.code);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [locking, setLocking] = useState(false);
  const [lockMessage, setLockMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(
    null
  );

  const activeSection = useActiveSection(INDEX_IDS);
  const isLocked = profile.lock.isLocked;
  const savedCount = STEPS.filter((s) => profile.completion[s.id]).length;
  const nextStep = STEPS.find((s) => !profile.completion[s.id]);

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
    } catch (err) {
      console.error("Updating school code failed", err);
      setError("Network error while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  async function toggleLock() {
    setLockMessage(null);
    setLocking(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/profile/master/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !isLocked }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setLockMessage({
          kind: "error",
          text: json?.error?.message || "Could not change the lock. Please try again.",
        });
        return;
      }
      setProfile(json.data.profile);
      setLockMessage({
        kind: "ok",
        text: json.data.profile.lock.isLocked
          ? "Profile locked. It is now read-only for everyone until it is unlocked."
          : "Profile unlocked. Administrators can edit it again.",
      });
    } catch (err) {
      console.error("Changing profile lock failed", err);
      setLockMessage({
        kind: "error",
        text: "Network error while changing the lock. Please try again.",
      });
    } finally {
      setLocking(false);
    }
  }

  const lockedOn =
    profile.lock.lockedAt &&
    new Date(profile.lock.lockedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className={`rounded transition-colors hover:text-emerald-700 ${focusRing}`}
            >
              {school.name}
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-slate-800">Settings</span>
          </nav>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            School settings
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            The official UDISE+ profile, school code and account status for{" "}
            <span className="font-semibold text-slate-700">{school.name}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/print/school-profile/${schoolSlug}`}
            target="_blank"
            rel="noopener"
            className={secondaryButtonClass}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            View &amp; export PDF
          </a>
          {canLock && (
            <button
              type="button"
              onClick={toggleLock}
              disabled={locking || (!isLocked && !profile.isComplete)}
              title={
                !isLocked && !profile.isComplete
                  ? "Save all three profile sections before locking"
                  : undefined
              }
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {locking ? (
                <Spinner />
              ) : isLocked ? (
                <LockOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4" aria-hidden="true" />
              )}
              {isLocked ? "Unlock profile" : "Lock profile"}
            </button>
          )}
        </div>
      </header>

      {lockMessage?.kind === "error" && <Notice>{lockMessage.text}</Notice>}
      {lockMessage?.kind === "ok" && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          {lockMessage.text}
        </p>
      )}

      {/* Status strip: where the school stands and what to do next */}
      <section
        aria-label="Setup status"
        className="shadow-card rounded-2xl border border-slate-200/80 bg-white"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {readiness.isReady ? (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {readiness.isReady ? "Ready for academics" : "Setup incomplete"}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                {readiness.isReady
                  ? "School details and administrator identity are verified. Academic setup is unlocked."
                  : readiness.reason ||
                    "Complete the required details to unlock academic configuration."}
              </p>
            </div>
          </div>

          <dl className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:justify-end">
            <div>
              <dt className="text-xs text-slate-500">Profile</dt>
              <dd className="font-bold text-slate-900 tabular-nums">{savedCount} of 3 saved</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Editing</dt>
              <dd className="flex items-center gap-1 font-bold text-slate-900">
                {isLocked ? (
                  <>
                    <Lock className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Locked
                  </>
                ) : (
                  <>
                    <LockOpen className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                    Open
                  </>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {(nextStep || isLocked || (!readiness.isReady && readiness.missingFields.length > 0)) && (
          <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 text-sm sm:px-6">
            {isLocked && (
              <p className="text-slate-700">
                Locked{profile.lock.lockedByName && <> by {profile.lock.lockedByName}</>}
                {lockedOn && <> on {lockedOn}</>}.{" "}
                {canLock
                  ? "Unlock it to make changes."
                  : "Ask a school administrator to unlock it."}
              </p>
            )}
            {!isLocked && nextStep && canEdit && (
              <a
                href={`#section-${nextStep.id}`}
                className={`inline-flex items-center gap-1.5 rounded font-semibold text-emerald-700 hover:text-emerald-800 ${focusRing}`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                Next: fill in {nextStep.title.toLowerCase()}
              </a>
            )}
            {!readiness.isReady && readiness.missingFields.length > 0 && (
              <ul className="list-inside list-disc space-y-0.5 text-slate-600">
                {readiness.missingFields.map((field) => (
                  <li key={field}>{MISSING_FIELD_LABELS[field] ?? field}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-8">
        {/* Section index */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {INDEX.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    aria-current={active ? "location" : undefined}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${focusRing} ${
                      active
                        ? "bg-emerald-50 font-semibold text-emerald-800"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                    {item.step && (
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          profile.completion[item.step] ? "bg-emerald-600" : "bg-amber-500"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    {item.step && (
                      <span className="sr-only">
                        ({profile.completion[item.step] ? "saved" : "not saved yet"})
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 hidden border-t border-slate-200 pt-4 lg:block">
            <p className="px-3 text-xs font-semibold text-slate-500">Elsewhere in setup</p>
            <ul className="mt-1.5">
              {[
                { href: `/school/${schoolSlug}/settings/academic`, label: "Academic sessions" },
                { href: `/school/${schoolSlug}/academics`, label: "Classes & subjects" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    prefetch={true}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100/70 hover:text-slate-900 ${focusRing}`}
                  >
                    {l.label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* The settings sheet */}
        <div className="shadow-card min-w-0 divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white">
          <SchoolProfileSections
            schoolSlug={schoolSlug}
            profile={profile}
            onProfileChange={setProfile}
            editable={canEdit && !isLocked}
          />

          {/* School code */}
          <section
            id="section-identifiers"
            aria-labelledby="identifiers-title"
            className="scroll-mt-24 px-5 py-7 sm:px-8"
          >
            <form onSubmit={handleCodeUpdate} noValidate>
              <h2 id="identifiers-title" className="text-lg font-bold text-slate-900">
                School code
              </h2>
              <p className="mt-0.5 max-w-prose text-sm text-slate-600">
                The school code appears on receipts and records. The web address is permanent.
              </p>

              <div className="mt-6 space-y-5">
                {error && <Notice>{error}</Notice>}
                {success && (
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    {success}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
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
                      Web address
                    </label>
                    <input
                      id="school-slug"
                      value={`/school/${school.slug}`}
                      disabled
                      className={inputClass(false, "font-mono")}
                    />
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="mt-6 flex items-center justify-end gap-3">
                  {code.trim().toUpperCase() !== school.code && <SectionState saved dirty />}
                  <button
                    type="submit"
                    disabled={saving || code.trim().toUpperCase() === school.code}
                    className={primaryButtonClass}
                  >
                    {saving && <Spinner />}
                    {saving ? "Saving…" : "Save school code"}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Account status */}
          <section
            id="section-account"
            aria-labelledby="account-title"
            className="scroll-mt-24 px-5 py-7 sm:px-8"
          >
            <h2 id="account-title" className="text-lg font-bold text-slate-900">
              Account status
            </h2>
            <p className="mt-0.5 max-w-prose text-sm text-slate-600">
              Set by the platform. Contact your platform administrator to change these.
            </p>
            <dl className="mt-5 grid grid-cols-1 text-sm sm:grid-cols-2 sm:gap-x-8">
              {[
                { label: "Lifecycle", value: school.status, tone: "text-slate-900" },
                {
                  label: "State",
                  value: school.isActive ? "Active" : "Inactive",
                  tone: school.isActive ? "text-emerald-700" : "text-rose-700",
                },
                {
                  label: "Administrator",
                  value: readiness.admin ? readiness.admin.name : "Not assigned",
                  tone: readiness.admin ? "text-slate-900" : "text-rose-700",
                },
                {
                  label: "Registration",
                  value: readiness.isRegistrationApproved ? "Approved" : "Pending",
                  tone: readiness.isRegistrationApproved ? "text-emerald-700" : "text-amber-700",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5"
                >
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className={`truncate font-semibold ${row.tone}`}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SchoolSettingsClient;
