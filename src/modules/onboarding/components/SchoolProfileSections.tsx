"use client";

import React, { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  GraduationCap,
  Lock,
  PencilLine,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  FieldError,
  IconTile,
  Notice,
  Spinner,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/common/FormControls";
import { Select as RangeSelect } from "@/components/hairline/select";
import { Switch as RangeSwitch } from "@/components/hairline/switch";
import type { SchoolProfileView } from "../services/school-profile";
import {
  BOARD_AFFILIATIONS,
  HOS_DESIGNATIONS,
  INSTRUCTION_MEDIUMS,
  LEADER_DESIGNATIONS,
  MAX_OTHER_LEADERS,
  RTE_ENTRY_CLASSES,
  SCHOOL_STREAMS,
  STEP_SCHEMAS,
  allowedRteExitClasses,
  canApplyRte,
  canIncludePrePrimary,
  classRangeOptions,
  describeActiveRange,
  fieldErrorsFrom,
  formatIndianPhone,
  isPreschoolRange,
  offersSeniorSecondary,
  sectionsForRange,
  type ProfileStep,
} from "../services/school-profile-rules";
import { classesForRange } from "../services/class-structure-template";

interface ProvisioningResult {
  createdSession: string | null;
  createdClasses: string[];
  createdSections: number;
  createdSubjects: number;
  outsideRange: string[];
  skippedReason: string | null;
}

/** One sentence on what saving the academic step did to the class structure. */
function describeProvisioning(p: ProvisioningResult): string {
  if (p.skippedReason) return `Academic setup saved. Classes were not created: ${p.skippedReason}`;
  const parts: string[] = [];
  if (p.createdSession) parts.push(`started session ${p.createdSession}`);
  if (p.createdClasses.length) {
    parts.push(
      `created ${p.createdClasses.length} ${p.createdClasses.length === 1 ? "class" : "classes"} (${p.createdClasses[0]} to ${p.createdClasses[p.createdClasses.length - 1]}) with Section A`
    );
  }
  if (p.createdSubjects) parts.push(`added ${p.createdSubjects} default subjects`);
  let text = parts.length
    ? `Academic setup saved: ${parts.join(", ")}. Fine-tune them under Academics → Classes & Subjects.`
    : "Academic setup saved. Every class in this range already exists.";
  if (p.outsideRange.length) {
    text += ` ${p.outsideRange.join(", ")} ${p.outsideRange.length === 1 ? "is" : "are"} outside the new range and ${p.outsideRange.length === 1 ? "was" : "were"} kept.`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

type IdentityForm = {
  name: string;
  udiseCode: string;
  establishmentYear: string;
  recognitionNumber: string;
  officialEmail: string;
  contactMobile: string;
  postalAddress: string;
};

type AcademicForm = {
  instructionMedium: string;
  classRange: string;
  includesPrePrimary: boolean;
  rteApplicable: boolean;
  rteEntryClass: string;
  rteExitClass: string;
  boardAffiliation: string;
  stateBoardName: string;
  streams: string[];
};

type LeadershipForm = {
  hosDesignation: string;
  hosName: string;
  hosMobile: string;
  hosEmail: string;
  managementName: string;
  managementPhone: string;
  otherLeaders: { designation: string; name: string; mobile: string; email: string }[];
};

const identityFrom = (v: SchoolProfileView): IdentityForm => ({
  ...v.identity,
  establishmentYear: v.identity.establishmentYear ? String(v.identity.establishmentYear) : "",
  contactMobile: formatIndianPhone(v.identity.contactMobile),
});

const academicFrom = (v: SchoolProfileView): AcademicForm => ({
  ...v.academic,
  instructionMedium: v.academic.instructionMedium ?? "",
  classRange: v.academic.classRange ?? "",
  rteEntryClass: v.academic.rteEntryClass ?? "",
  rteExitClass: v.academic.rteExitClass ?? "",
  boardAffiliation: v.academic.boardAffiliation ?? "",
});

const leadershipFrom = (v: SchoolProfileView): LeadershipForm => ({
  ...v.leadership,
  hosDesignation: v.leadership.hosDesignation ?? "",
  hosMobile: formatIndianPhone(v.leadership.hosMobile),
  managementPhone: formatIndianPhone(v.leadership.managementPhone),
  otherLeaders: v.leadership.otherLeaders.map((l) => ({
    ...l,
    mobile: formatIndianPhone(l.mobile),
  })),
});

export const STEPS: {
  id: ProfileStep;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
}[] = [
  {
    id: "identity",
    label: "Identity & Contact",
    shortLabel: "Identity",
    title: "Institutional identity & contact",
    description:
      "Official names, U-DISE code, foundation year, recognition number, email and mobile",
  },
  {
    id: "academic",
    label: "Academic Setup",
    shortLabel: "Academic",
    title: "Academic & operational setup",
    description: "Medium, class range, pre-primary, RTE quota, board affiliation and streams",
  },
  {
    id: "leadership",
    label: "HOS & Leadership",
    shortLabel: "Leadership",
    title: "Head of school & leadership",
    description: "UDISE+ head-of-school details, official contact and management authority",
  },
];

// ---------------------------------------------------------------------------
// Small field primitives
// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="text-rose-700" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <FieldError id={`${htmlFor}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <div id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </div>
        )
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hasHint?: boolean) =>
  error ? `${id}-error` : hasHint ? `${id}-hint` : undefined;

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute top-1/2 right-3.5 mt-0.75 h-4 w-4 -translate-y-1/2 text-slate-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
  hasHint,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
  hasHint?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hasHint)}
        className={inputClass(
          Boolean(error),
          `appearance-none pr-10 ${value ? "" : "text-slate-400"}`
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );
}

function Switch({
  id,
  checked,
  onChange,
  disabled,
  labelledBy,
  describedById,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  labelledBy: string;
  describedById?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedById}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-emerald-700 bg-emerald-700" : "border-slate-300 bg-slate-200"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Panel({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        muted ? "border-slate-200/70 bg-slate-50/60" : "border-slate-200/80 bg-slate-50"
      }`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

type SectionMessage = { kind: "error" | "ok"; text: string } | null;

const EMPTY_ERRORS: Record<ProfileStep, Record<string, string>> = {
  identity: {},
  academic: {},
  leadership: {},
};
const STEP_ICONS = {
  identity: ShieldCheck,
  academic: GraduationCap,
  leadership: UserCheck,
} as const;

/** Saved / not saved / unsaved-changes marker shared by the section header and the index. */
export function SectionState({ saved, dirty }: { saved: boolean; dirty?: boolean }) {
  if (dirty) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        <PencilLine className="h-3 w-3" aria-hidden="true" />
        Unsaved changes
      </span>
    );
  }
  return saved ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      <Check className="h-3 w-3" aria-hidden="true" />
      Saved
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      <CircleDashed className="h-3 w-3" aria-hidden="true" />
      Not saved yet
    </span>
  );
}

export interface SchoolProfileSectionsProps {
  schoolSlug: string;
  profile: SchoolProfileView;
  onProfileChange: (next: SchoolProfileView) => void;
  /** Called after the last step saves with every step complete; the caller locks the profile. */
  onFinish: (next: SchoolProfileView) => Promise<void>;
}

/**
 * The Master School Profile as a three-step form (identity, academic, leadership). Each step
 * saves on its own before moving to the next. Only rendered while the profile is editable.
 */
export function SchoolProfileSections({
  schoolSlug,
  profile,
  onProfileChange,
  onFinish,
}: SchoolProfileSectionsProps) {
  const uid = useId();
  const [identity, setIdentity] = useState(() => identityFrom(profile));
  const [academic, setAcademic] = useState(() => academicFrom(profile));
  const [leadership, setLeadership] = useState(() => leadershipFrom(profile));

  const [errorsByStep, setErrorsByStep] = useState(EMPTY_ERRORS);
  const [message, setMessage] = useState<SectionMessage>(null);
  const [savingStep, setSavingStep] = useState<ProfileStep | null>(null);
  // Open on the first step that is not saved yet.
  const [stepIdx, setStepIdx] = useState(() =>
    Math.max(
      0,
      STEPS.findIndex((st) => !profile.completion[st.id])
    )
  );

  // Field names are unique across the three steps, so one merged map serves every field.
  const errors = { ...errorsByStep.identity, ...errorsByStep.academic, ...errorsByStep.leadership };
  const id = (name: string) => `${uid}-${name}`;

  const formFor = (s: ProfileStep) =>
    s === "identity" ? identity : s === "academic" ? academic : leadership;
  const savedFormFor = (s: ProfileStep) =>
    s === "identity"
      ? identityFrom(profile)
      : s === "academic"
        ? academicFrom(profile)
        : leadershipFrom(profile);
  const isDirty = (s: ProfileStep) =>
    JSON.stringify(formFor(s)) !== JSON.stringify(savedFormFor(s));

  const setStepErrors = (s: ProfileStep, next: Record<string, string>) =>
    setErrorsByStep((e) => ({ ...e, [s]: next }));

  async function saveStep(e: React.FormEvent) {
    e.preventDefault();
    const step = STEPS[stepIdx].id;
    const last = stepIdx === STEPS.length - 1;
    setMessage(null);

    // Nothing changed on a saved step: just move on.
    if (profile.completion[step] && !isDirty(step) && !last) {
      setStepIdx(stepIdx + 1);
      return;
    }

    const body = formFor(step);
    const check = STEP_SCHEMAS[step].safeParse(body);
    if (!check.success) {
      setStepErrors(step, fieldErrorsFrom(check.error));
      setMessage({
        kind: "error",
        text: "Some fields need attention before this section can be saved.",
      });
      return;
    }
    setStepErrors(step, {});

    setSavingStep(step);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/profile/master/steps/${step}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: json?.error?.message || "Could not save this section. Please try again.",
        });
        return;
      }
      const next: SchoolProfileView = json.data.profile;
      onProfileChange(next);
      if (step === "identity") setIdentity(identityFrom(next));
      if (step === "academic") setAcademic(academicFrom(next));
      if (step === "leadership") setLeadership(leadershipFrom(next));

      const provisioning: ProvisioningResult | null = json.data.provisioning ?? null;
      setMessage({
        kind: "ok",
        text: provisioning ? describeProvisioning(provisioning) : "Saved.",
      });
      if (!last) setStepIdx(stepIdx + 1);
      else if (next.isComplete) await onFinish(next);
    } catch (err) {
      console.error("Saving profile section failed", err);
      setMessage({
        kind: "error",
        text: "Network error while saving. Check your connection and try again.",
      });
    } finally {
      setSavingStep(null);
    }
  }

  // ---- academic derived state ----
  const preprimaryAllowed = canIncludePrePrimary(academic.classRange);
  const rteAllowed = canApplyRte(academic.classRange);
  const streamsAllowed = offersSeniorSecondary(academic.classRange);
  const rteExitOptions = allowedRteExitClasses(academic.classRange);
  const rteEntryOptions = RTE_ENTRY_CLASSES.filter(
    (c) => c.value !== "NURSERY" || academic.includesPrePrimary
  );
  const activeRange = describeActiveRange(academic.classRange, academic.includesPrePrimary);
  const plannedClasses = classesForRange(academic.classRange, academic.includesPrePrimary);

  const setClassRange = (value: string) => {
    setAcademic((a) => {
      const next = { ...a, classRange: value };
      next.includesPrePrimary = sectionsForRange(value, {
        prePrimary: a.includesPrePrimary,
        playGroup: false,
      }).prePrimary;
      if (!canApplyRte(value)) {
        next.rteApplicable = false;
        next.rteEntryClass = "";
        next.rteExitClass = "";
      }
      if (!allowedRteExitClasses(value).some((c) => c.value === next.rteExitClass)) {
        next.rteExitClass = "";
      }
      if (!next.includesPrePrimary && next.rteEntryClass === "NURSERY") next.rteEntryClass = "";
      if (!offersSeniorSecondary(value)) next.streams = [];
      return next;
    });
  };

  const udiseValid = /^\d{11}$/.test(identity.udiseCode.trim());

  const fieldsFor: Record<ProfileStep, React.ReactNode> = {
    identity: (
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="School name (English)" htmlFor={id("name")} required error={errors.name}>
          <input
            id={id("name")}
            value={identity.name}
            onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
            autoComplete="organization"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy(id("name"), errors.name)}
            className={inputClass(Boolean(errors.name))}
          />
        </Field>
        <Field
          label="U-DISE code (11 digits)"
          htmlFor={id("udise")}
          required
          error={errors.udiseCode}
          hint={
            udiseValid ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Valid 11-digit U-DISE code
              </span>
            ) : (
              `${identity.udiseCode.trim().length} of 11 digits`
            )
          }
        >
          <input
            id={id("udise")}
            inputMode="numeric"
            maxLength={11}
            value={identity.udiseCode}
            onChange={(e) =>
              setIdentity({ ...identity, udiseCode: e.target.value.replace(/\D/g, "") })
            }
            placeholder="09260100000"
            aria-invalid={Boolean(errors.udiseCode)}
            aria-describedby={describedBy(id("udise"), errors.udiseCode, true)}
            className={inputClass(Boolean(errors.udiseCode), "font-mono tracking-wider")}
          />
        </Field>
        <Field
          label="Establishment / foundation year"
          htmlFor={id("year")}
          required
          error={errors.establishmentYear}
        >
          <input
            id={id("year")}
            inputMode="numeric"
            maxLength={4}
            value={identity.establishmentYear}
            onChange={(e) =>
              setIdentity({
                ...identity,
                establishmentYear: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="e.g. 1998"
            aria-invalid={Boolean(errors.establishmentYear)}
            aria-describedby={describedBy(id("year"), errors.establishmentYear)}
            className={inputClass(Boolean(errors.establishmentYear), "tabular-nums")}
          />
        </Field>
        <Field
          label="Recognition / affiliation application no."
          htmlFor={id("recognition")}
          required
          error={errors.recognitionNumber}
          className="sm:col-span-2"
        >
          <input
            id={id("recognition")}
            value={identity.recognitionNumber}
            onChange={(e) => setIdentity({ ...identity, recognitionNumber: e.target.value })}
            placeholder="e.g. REC-UP-88741/2023"
            aria-invalid={Boolean(errors.recognitionNumber)}
            aria-describedby={describedBy(id("recognition"), errors.recognitionNumber)}
            className={inputClass(Boolean(errors.recognitionNumber), "font-mono")}
          />
        </Field>
        <Field
          label="School official email"
          htmlFor={id("email")}
          required
          error={errors.officialEmail}
        >
          <input
            id={id("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={identity.officialEmail}
            onChange={(e) => setIdentity({ ...identity, officialEmail: e.target.value })}
            placeholder="office@yourschool.in"
            aria-invalid={Boolean(errors.officialEmail)}
            aria-describedby={describedBy(id("email"), errors.officialEmail)}
            className={inputClass(Boolean(errors.officialEmail))}
          />
        </Field>
        <Field
          label="School contact mobile"
          htmlFor={id("mobile")}
          required
          error={errors.contactMobile}
        >
          <input
            id={id("mobile")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={identity.contactMobile}
            onChange={(e) => setIdentity({ ...identity, contactMobile: e.target.value })}
            placeholder="+91 98765 43210"
            aria-invalid={Boolean(errors.contactMobile)}
            aria-describedby={describedBy(id("mobile"), errors.contactMobile)}
            className={inputClass(Boolean(errors.contactMobile), "tabular-nums")}
          />
        </Field>
        <Field
          label="Full postal address"
          htmlFor={id("address")}
          required
          error={errors.postalAddress}
          className="sm:col-span-2"
        >
          <textarea
            id={id("address")}
            rows={2}
            autoComplete="street-address"
            value={identity.postalAddress}
            onChange={(e) => setIdentity({ ...identity, postalAddress: e.target.value })}
            placeholder="Street, locality, city, state - PIN code"
            aria-invalid={Boolean(errors.postalAddress)}
            aria-describedby={describedBy(id("address"), errors.postalAddress)}
            className={inputClass(Boolean(errors.postalAddress), "resize-y")}
          />
        </Field>
      </div>
    ),
    academic: (
      <div className="space-y-4">
        <Panel>
          <Field
            label="Medium of instruction"
            htmlFor={id("medium")}
            required
            error={errors.instructionMedium}
          >
            <Select
              id={id("medium")}
              value={academic.instructionMedium}
              onChange={(v) => setAcademic({ ...academic, instructionMedium: v })}
              options={INSTRUCTION_MEDIUMS}
              placeholder="Select medium"
              error={errors.instructionMedium}
            />
          </Field>
        </Panel>

        <Panel>
          <RangeSelect
            id={id("range")}
            label="School recognition class range"
            options={classRangeOptions(academic.classRange)}
            placeholder="Choose the classes your school runs"
            value={academic.classRange || null}
            onValueChange={setClassRange}
            error={errors.classRange}
          />

          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <RangeSwitch
              label="Include pre-primary section"
              description={
                isPreschoolRange(academic.classRange)
                  ? "Set by the class range"
                  : preprimaryAllowed || !academic.classRange
                    ? "Adds Nursery, LKG and UKG to the active class structure"
                    : "Available only when the class range starts at Class 1"
              }
              labelPosition="start"
              className="w-full"
              disabled={!preprimaryAllowed}
              checked={academic.includesPrePrimary}
              onCheckedChange={(next) =>
                setAcademic((a) => ({
                  ...a,
                  includesPrePrimary: next,
                  rteEntryClass: !next && a.rteEntryClass === "NURSERY" ? "" : a.rteEntryClass,
                }))
              }
            />
          </div>

          {activeRange && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              Active recognised range:
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800">
                {activeRange}
              </span>
            </p>
          )}

          {plannedClasses.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-xs font-semibold text-slate-700">
                Saving creates these {plannedClasses.length} classes, each with Section A and
                default subjects. Classes that already exist are kept as they are.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Classes to be created">
                {plannedClasses.map((c) => (
                  <li
                    key={c.name}
                    className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id={id("rte-label")} className="text-sm font-semibold text-slate-700">
                RTE applicable
              </p>
              <p id={id("rte-hint")} className="mt-0.5 text-xs text-slate-500">
                {rteAllowed || !academic.classRange
                  ? "Right to Education quota: entry at Nursery or Class 1, ending at Class 5 or Class 8"
                  : "RTE applies only when the class range starts at Class 1"}
              </p>
            </div>
            <Switch
              id={id("rte")}
              checked={academic.rteApplicable}
              disabled={!rteAllowed}
              labelledBy={id("rte-label")}
              describedById={id("rte-hint")}
              onChange={(next) =>
                setAcademic({
                  ...academic,
                  rteApplicable: next,
                  rteEntryClass: next ? academic.rteEntryClass : "",
                  rteExitClass: next ? academic.rteExitClass : "",
                })
              }
            />
          </div>
          {errors.rteApplicable && (
            <FieldError id={`${id("rte")}-error`}>{errors.rteApplicable}</FieldError>
          )}

          {academic.rteApplicable && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-4 sm:grid-cols-2">
              <Field
                label="RTE start class (entry level)"
                htmlFor={id("rte-entry")}
                required
                error={errors.rteEntryClass}
              >
                <Select
                  id={id("rte-entry")}
                  value={academic.rteEntryClass}
                  onChange={(v) => setAcademic({ ...academic, rteEntryClass: v })}
                  options={rteEntryOptions}
                  placeholder="Select start class"
                  error={errors.rteEntryClass}
                />
              </Field>
              <Field
                label="RTE end class"
                htmlFor={id("rte-exit")}
                required
                error={errors.rteExitClass}
              >
                <Select
                  id={id("rte-exit")}
                  value={academic.rteExitClass}
                  onChange={(v) => setAcademic({ ...academic, rteExitClass: v })}
                  options={rteExitOptions}
                  placeholder="Select end class"
                  error={errors.rteExitClass}
                />
              </Field>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Board affiliation"
              htmlFor={id("board")}
              required
              error={errors.boardAffiliation}
              className={academic.boardAffiliation === "STATE_BOARD" ? "" : "sm:col-span-2"}
            >
              <Select
                id={id("board")}
                value={academic.boardAffiliation}
                onChange={(v) => setAcademic({ ...academic, boardAffiliation: v })}
                options={BOARD_AFFILIATIONS}
                placeholder="Select board"
                error={errors.boardAffiliation}
              />
            </Field>
            {academic.boardAffiliation === "STATE_BOARD" && (
              <Field
                label="State board name"
                htmlFor={id("state-board")}
                required
                error={errors.stateBoardName}
              >
                <input
                  id={id("state-board")}
                  value={academic.stateBoardName}
                  onChange={(e) => setAcademic({ ...academic, stateBoardName: e.target.value })}
                  placeholder="e.g. UP Board"
                  aria-invalid={Boolean(errors.stateBoardName)}
                  aria-describedby={describedBy(id("state-board"), errors.stateBoardName)}
                  className={inputClass(Boolean(errors.stateBoardName))}
                />
              </Field>
            )}
          </div>
        </Panel>

        <Panel muted={!streamsAllowed}>
          <fieldset
            disabled={!streamsAllowed}
            aria-describedby={errors.streams ? `${id("streams")}-error` : id("streams-hint")}
          >
            <legend
              className={`text-sm font-semibold ${streamsAllowed ? "text-slate-700" : "text-slate-500"}`}
            >
              Streams / faculties offered (Class 11–12)
              {streamsAllowed && (
                <span className="text-rose-700" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </legend>

            {!streamsAllowed && (
              <p
                id={id("streams-hint")}
                className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900"
              >
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {academic.classRange
                  ? "Streams are unavailable because the highest class in the selected range is below Class 12."
                  : "Select a class range up to Class 12 to choose streams."}
              </p>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {SCHOOL_STREAMS.map((s) => {
                const checked = academic.streams.includes(s.value);
                return (
                  <label
                    key={s.value}
                    className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 transition-colors ${
                      streamsAllowed
                        ? checked
                          ? "cursor-pointer border-emerald-300 bg-emerald-50/40"
                          : "cursor-pointer border-slate-200 hover:border-slate-300"
                        : "cursor-not-allowed border-slate-200/70 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setAcademic({
                          ...academic,
                          streams: checked
                            ? academic.streams.filter((v) => v !== s.value)
                            : [...academic.streams, s.value],
                        })
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{s.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{s.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.streams && (
              <FieldError id={`${id("streams")}-error`}>{errors.streams}</FieldError>
            )}
          </fieldset>
        </Panel>
      </div>
    ),
    leadership: (
      <div className="space-y-5">
        <p className="-mb-1 text-sm font-bold text-slate-800">Person 1 · Head of school</p>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label="HOS designation (UDISE+)"
            htmlFor={id("designation")}
            required
            error={errors.hosDesignation}
          >
            <Select
              id={id("designation")}
              value={leadership.hosDesignation}
              onChange={(v) => setLeadership({ ...leadership, hosDesignation: v })}
              options={HOS_DESIGNATIONS}
              placeholder="Select designation"
              error={errors.hosDesignation}
            />
          </Field>
          <Field
            label="HOS / principal name"
            htmlFor={id("hos-name")}
            required
            error={errors.hosName}
          >
            <input
              id={id("hos-name")}
              autoComplete="off"
              value={leadership.hosName}
              onChange={(e) => setLeadership({ ...leadership, hosName: e.target.value })}
              aria-invalid={Boolean(errors.hosName)}
              aria-describedby={describedBy(id("hos-name"), errors.hosName)}
              className={inputClass(Boolean(errors.hosName))}
            />
          </Field>
          <Field
            label="HOS mobile number"
            htmlFor={id("hos-mobile")}
            required
            error={errors.hosMobile}
          >
            <input
              id={id("hos-mobile")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={leadership.hosMobile}
              onChange={(e) => setLeadership({ ...leadership, hosMobile: e.target.value })}
              placeholder="+91 98765 43210"
              aria-invalid={Boolean(errors.hosMobile)}
              aria-describedby={describedBy(id("hos-mobile"), errors.hosMobile)}
              className={inputClass(Boolean(errors.hosMobile), "tabular-nums")}
            />
          </Field>
          <Field
            label="HOS official email"
            htmlFor={id("hos-email")}
            required
            error={errors.hosEmail}
          >
            <input
              id={id("hos-email")}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={leadership.hosEmail}
              onChange={(e) => setLeadership({ ...leadership, hosEmail: e.target.value })}
              placeholder="principal@yourschool.in"
              aria-invalid={Boolean(errors.hosEmail)}
              aria-describedby={describedBy(id("hos-email"), errors.hosEmail)}
              className={inputClass(Boolean(errors.hosEmail))}
            />
          </Field>
        </div>

        {leadership.otherLeaders.map((person, i) => {
          const key = (f: string) => `otherLeaders.${i}.${f}`;
          const setPerson = (patch: Partial<typeof person>) =>
            setLeadership((l) => ({
              ...l,
              otherLeaders: l.otherLeaders.map((p, j) => (j === i ? { ...p, ...patch } : p)),
            }));
          return (
            <Panel key={i}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">Person {i + 2}</p>
                <button
                  type="button"
                  onClick={() =>
                    setLeadership((l) => ({
                      ...l,
                      otherLeaders: l.otherLeaders.filter((_, j) => j !== i),
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove<span className="sr-only"> person {i + 2}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field
                  label="Designation"
                  htmlFor={id(key("designation"))}
                  required
                  error={errors[key("designation")]}
                >
                  <Select
                    id={id(key("designation"))}
                    value={person.designation}
                    onChange={(v) => setPerson({ designation: v })}
                    options={LEADER_DESIGNATIONS}
                    placeholder="Select designation"
                    error={errors[key("designation")]}
                  />
                </Field>
                {(
                  [
                    ["name", "Name", "", "text"],
                    ["mobile", "Mobile number", "+91 98765 43210", "tel"],
                    ["email", "Email", "name@yourschool.in", "email"],
                  ] as const
                ).map(([f, label, placeholder, type]) => (
                  <Field key={f} label={label} htmlFor={id(key(f))} required error={errors[key(f)]}>
                    <input
                      id={id(key(f))}
                      type={type}
                      autoComplete="off"
                      value={person[f]}
                      onChange={(e) => setPerson({ [f]: e.target.value })}
                      placeholder={placeholder}
                      aria-invalid={Boolean(errors[key(f)])}
                      aria-describedby={describedBy(id(key(f)), errors[key(f)])}
                      className={inputClass(Boolean(errors[key(f)]))}
                    />
                  </Field>
                ))}
              </div>
            </Panel>
          );
        })}

        {leadership.otherLeaders.length < MAX_OTHER_LEADERS ? (
          <button
            type="button"
            onClick={() =>
              setLeadership((l) => ({
                ...l,
                otherLeaders: [
                  ...l.otherLeaders,
                  { designation: "", name: "", mobile: "", email: "" },
                ],
              }))
            }
            className={secondaryButtonClass}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add another person ({leadership.otherLeaders.length + 1} of {MAX_OTHER_LEADERS + 1})
          </button>
        ) : (
          <p className="text-xs text-slate-500">
            Up to {MAX_OTHER_LEADERS + 1} people can be listed, including the head of school.
          </p>
        )}
        {errors.otherLeaders && (
          <FieldError id={id("other-leaders-error")}>{errors.otherLeaders}</FieldError>
        )}

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Field
            label="School owner / manager name"
            htmlFor={id("mgmt-name")}
            required
            error={errors.managementName}
          >
            <input
              id={id("mgmt-name")}
              autoComplete="off"
              value={leadership.managementName}
              onChange={(e) => setLeadership({ ...leadership, managementName: e.target.value })}
              placeholder="Person, society or trust name"
              aria-invalid={Boolean(errors.managementName)}
              aria-describedby={describedBy(id("mgmt-name"), errors.managementName)}
              className={inputClass(Boolean(errors.managementName))}
            />
          </Field>
          <Field
            label="Management contact phone"
            htmlFor={id("mgmt-phone")}
            required
            error={errors.managementPhone}
          >
            <input
              id={id("mgmt-phone")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={leadership.managementPhone}
              onChange={(e) => setLeadership({ ...leadership, managementPhone: e.target.value })}
              placeholder="Mobile or landline with STD code"
              aria-invalid={Boolean(errors.managementPhone)}
              aria-describedby={describedBy(id("mgmt-phone"), errors.managementPhone)}
              className={inputClass(Boolean(errors.managementPhone), "tabular-nums")}
            />
          </Field>
        </div>
      </div>
    ),
  };

  const s = STEPS[stepIdx];
  const saving = savingStep === s.id;
  const dirty = isDirty(s.id);
  const isLast = stepIdx === STEPS.length - 1;
  // A step can be opened once every step before it is saved.
  const reachable = (i: number) => STEPS.slice(0, i).every((p) => profile.completion[p.id]);
  const goTo = (i: number) => {
    setMessage(null);
    setStepIdx(i);
  };

  return (
    <div className="space-y-5">
      <ol
        aria-label="Profile steps"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5"
      >
        {STEPS.map((step, i) => {
          const active = i === stepIdx;
          const done = profile.completion[step.id];
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                disabled={!reachable(i) || savingStep !== null}
                aria-current={active ? "step" : undefined}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  active ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {done && !active ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="sr-only">{done ? "(saved)" : "(not saved yet)"}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <section
        aria-labelledby={`${uid}-${s.id}-title`}
        className="shadow-card rounded-2xl border border-slate-200/80 bg-white px-5 py-7 sm:px-8"
      >
        <form onSubmit={(e) => saveStep(e)} noValidate>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-slate-100 pb-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <IconTile icon={STEP_ICONS[s.id]} tone="ok" />
              <div className="min-w-0">
                <h2 id={`${uid}-${s.id}-title`} className="text-lg font-bold text-slate-900">
                  {s.title}
                </h2>
                <p className="mt-0.5 max-w-prose text-sm text-slate-600">{s.description}</p>
              </div>
            </div>
            <SectionState saved={profile.completion[s.id]} dirty={dirty} />
          </div>

          <div className="mt-6 space-y-5">
            {message?.kind === "error" && <Notice>{message.text}</Notice>}
            {message?.kind === "ok" && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span>{message.text}</span>
              </div>
            )}

            <fieldset disabled={saving} className="min-w-0">
              <legend className="sr-only">{s.title}</legend>
              {fieldsFor[s.id]}
            </fieldset>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => goTo(stepIdx - 1)}
                disabled={saving}
                className={secondaryButtonClass}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <Spinner />}
              {saving
                ? "Saving…"
                : isLast
                  ? "Save & lock profile"
                  : `Save & next: ${STEPS[stepIdx + 1].label}`}
              {!saving && !isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SchoolProfileSections;
