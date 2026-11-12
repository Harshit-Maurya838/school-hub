"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  IndianRupee,
  Lock,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import { Modal } from "@/components/common/Modal";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  Spinner,
} from "@/components/common/FormControls";
import { EmptyState } from "@/components/hairline/empty-state";
import { formatINR } from "@/lib/utils";
import { INSTRUCTION_MEDIUMS } from "@/modules/onboarding/services/school-profile-rules";
import {
  classesForRange,
  defaultSubjectsFor,
  gradeOfClassName,
  nextSectionName,
} from "@/modules/onboarding/services/class-structure-template";
import {
  PLAN_FREQUENCIES,
  PLAN_FREQUENCY_LABEL,
  isAdmissionHead,
  isTuitionHead,
  rupeeAmount,
  type PlanFrequency,
} from "@/modules/fees/services/class-fee-plan-rules";
import type { ClassFeePlanView } from "@/modules/fees/services/class-fee-plan";
import type {
  ClassSetupOverview,
  ClassSetupRow,
  ClassSetupSection,
  MediumValue,
} from "../services/class-setup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEDIUM_SHORT: Record<MediumValue, string> = {
  ENGLISH: "English",
  HINDI: "Hindi",
  BILINGUAL: "Bilingual",
  URDU: "Urdu",
};

const button =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const quietButton = `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const solidButton = `${button} bg-emerald-700 text-white hover:bg-emerald-800`;
const iconButton =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40";
const fieldSm =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none";
const missingLink =
  "inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";

async function callApi<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || "The request could not be completed. Try again.");
  }
  return json?.data as T;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const FREQUENCY_SUFFIX: Record<PlanFrequency, string> = {
  MONTHLY: "monthly",
  TERM: "per term",
  ANNUAL: "yearly",
  ONE_TIME: "one-time",
};

const MISSING_LABEL: Record<ClassSetupRow["missing"][number], string> = {
  sections: "sections",
  subjects: "subjects",
  fees: "fees",
};

const mediumOptions = (defaultMedium: MediumValue | null) => (
  <>
    <option value="">
      {defaultMedium ? `${MEDIUM_SHORT[defaultMedium]} (school)` : "School medium"}
    </option>
    {INSTRUCTION_MEDIUMS.map((m) => (
      <option key={m.value} value={m.value}>
        {MEDIUM_SHORT[m.value]}
      </option>
    ))}
  </>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface ClassSubjectSetupClientProps {
  schoolSlug: string;
  schoolName: string;
  initialOverview: ClassSetupOverview;
  /** School admin of this school: may create and change the structure and class fees. */
  canManage: boolean;
  /** Why changes are blocked (e.g. no active session), when they are. */
  blockedReason?: string;
}

type Feedback = { tone: "success" | "error"; text: string } | null;

export function ClassSubjectSetupClient({
  schoolSlug,
  schoolName,
  initialOverview,
  canManage,
  blockedReason,
}: ClassSubjectSetupClientProps) {
  const base = `/api/v1/school/${schoolSlug}`;
  const [overview, setOverview] = useState(initialOverview);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [mediumFilter, setMediumFilter] = useState<"ALL" | MediumValue>("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [subjectsFor, setSubjectsFor] = useState<string | null>(null);
  const [feesFor, setFeesFor] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState<ClassSetupRow | null>(null);
  const [editing, setEditing] = useState<ClassSetupRow | null>(null);

  const editable = canManage && !blockedReason && Boolean(overview.currentYear);
  const { rows, defaultMedium, includesFees } = overview;
  const configured = rows.filter((r) => r.missing.length === 0).length;
  const rowById = (id: string | null) => rows.find((r) => r.id === id) ?? null;

  const refresh = async () => {
    const data = await callApi<{ overview: ClassSetupOverview }>(`${base}/academics/setup`, "GET");
    setOverview(data.overview);
  };

  /** Runs a change, refreshes the table and reports the outcome in one place. */
  const run = async (key: string, action: () => Promise<string>) => {
    setBusy(key);
    setFeedback(null);
    try {
      const message = await action();
      await refresh();
      setFeedback({ tone: "success", text: message });
      return true;
    } catch (err) {
      setFeedback({
        tone: "error",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
      return false;
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (feedback?.tone !== "success") return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { row: ClassSetupRow; section: ClassSetupSection | null; first: boolean }[] = [];
    for (const row of rows) {
      const list: (ClassSetupSection | null)[] = row.sections.length ? row.sections : [null];
      let first = true;
      for (const section of list) {
        if (
          mediumFilter !== "ALL" &&
          (!section || (section.medium ?? defaultMedium) !== mediumFilter)
        ) {
          continue;
        }
        if (q) {
          const text = [
            row.name,
            section ? `sec ${section.name}` : "",
            section?.classTeacher ?? "",
            ...row.subjects.map((s) => s.name),
          ]
            .join(" ")
            .toLowerCase();
          if (!text.includes(q)) continue;
        }
        out.push({ row, section, first });
        first = false;
      }
    }
    return out;
  }, [rows, query, mediumFilter, defaultMedium]);

  return (
    <div className="space-y-4 print:space-y-2">
      {/* One-line prompts, only when there is something to do */}
      {canManage && blockedReason && <Callout tone="warn">{blockedReason}</Callout>}
      {canManage && !overview.profile.academicSaved && (
        <Callout
          action={
            <Link href={`/school/${schoolSlug}/settings`} className={solidButton}>
              Open school profile
            </Link>
          }
        >
          Pick the class range in the school profile. Saving it creates the classes with Section A
          and default subjects.
        </Callout>
      )}
      {canManage && overview.profile.missingClasses.length > 0 && (
        <Callout
          action={
            <button
              type="button"
              disabled={!editable || busy === "sync"}
              onClick={() =>
                run("sync", async () => {
                  const data = await callApi<{
                    provisioning: { createdClasses: string[]; skippedReason: string | null };
                  }>(`${base}/academics/setup/provision`, "POST");
                  if (data.provisioning.skippedReason) {
                    throw new Error(data.provisioning.skippedReason);
                  }
                  return `Created ${data.provisioning.createdClasses.join(", ")}.`;
                })
              }
              className={solidButton}
            >
              {busy === "sync" ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Create them
            </button>
          }
        >
          Not created yet from the profile ({overview.profile.rangeLabel}):{" "}
          {overview.profile.missingClasses.join(", ")}.
        </Callout>
      )}

      <div aria-live="polite" className="print:hidden">
        {feedback && (
          <div
            role={feedback.tone === "error" ? "alert" : "status"}
            className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
              feedback.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className={iconButton}
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <section className="shadow-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white print:shadow-none">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 print:hidden">
          <p className="mr-auto text-sm text-slate-600">
            <span className="font-bold text-slate-900">{rows.length}</span> classes
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-emerald-700">{configured}</span> ready
            {rows.length - configured > 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-bold text-amber-700">{rows.length - configured}</span> need
                setup
              </>
            )}
          </p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search classes, sections, teachers and subjects"
              className={`${fieldSm} w-44 pl-8`}
            />
          </div>
          <select
            aria-label="Filter by medium"
            value={mediumFilter}
            onChange={(e) => setMediumFilter(e.target.value as "ALL" | MediumValue)}
            className={fieldSm}
          >
            <option value="ALL">All mediums</option>
            {INSTRUCTION_MEDIUMS.map((m) => (
              <option key={m.value} value={m.value}>
                {MEDIUM_SHORT[m.value]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => window.print()} className={quietButton}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </button>
          {canManage && (
            <button
              type="button"
              disabled={!editable}
              onClick={() => setCreateOpen(true)}
              className={solidButton}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add class
            </button>
          )}
        </div>

        {canManage && editable && rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 print:hidden">
            <QuickAddSection
              rows={rows}
              defaultMedium={defaultMedium}
              busy={busy === "quick-add"}
              onAdd={(row, medium) =>
                run("quick-add", async () => {
                  const name = nextSectionName(row.sections.map((s) => s.name));
                  await callApi(`${base}/academics/sections`, "POST", {
                    classId: row.id,
                    name,
                    medium: medium || null,
                  });
                  return `${row.name} Section ${name} added.`;
                })
              }
            />
            <SchoolWideSubjects
              subjects={overview.schoolWideSubjects}
              busy={busy}
              onAdd={(name) =>
                run("school-wide-add", async () => {
                  await callApi(`${base}/academics/subjects`, "POST", {
                    name,
                    code: null,
                    classId: null,
                  });
                  return `${name} added for every class.`;
                })
              }
              onRemove={(subject) => {
                if (!window.confirm(`Remove ${subject.name} from every class?`)) return;
                void run(`subject-${subject.id}`, async () => {
                  await callApi(`${base}/academics/subjects/${subject.id}`, "DELETE");
                  return `${subject.name} removed.`;
                });
              }}
            />
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            scene="inbox"
            className="min-h-72"
            title="No classes yet"
            description={
              canManage
                ? "Save the class range in the school profile to create them all at once, or add a class here."
                : "Classes appear here once the school administrator sets them up."
            }
            action={
              canManage && editable ? (
                <button type="button" onClick={() => setCreateOpen(true)} className={solidButton}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add class
                </button>
              ) : undefined
            }
          />
        ) : tableRows.length === 0 ? (
          <EmptyState
            scene="search"
            className="min-h-64"
            title="Nothing matches"
            description="No class or section matches this search and medium."
            secondaryAction={{
              label: "Clear filters",
              onAction: () => {
                setQuery("");
                setMediumFilter("ALL");
              },
            }}
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr className="border-b border-slate-100">
                  <th scope="col" className="sticky left-0 z-10 bg-white px-4 py-2.5 font-semibold">
                    Class
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Medium
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Subjects
                  </th>
                  {includesFees && (
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Fees
                    </th>
                  )}
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Exams
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Class teacher
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    <span className="sr-only">Status and actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ row, section, first }) => (
                  <tr
                    key={section?.id ?? row.id}
                    className={`group align-top hover:bg-slate-50 ${first ? "border-t border-slate-100" : ""}`}
                  >
                    {/* Class + section */}
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-normal group-hover:bg-slate-50 print:static"
                    >
                      <div className="flex items-center gap-2">
                        <span className={first ? "font-semibold text-slate-900" : "sr-only"}>
                          {row.name}
                        </span>
                        {section ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                            {section.name}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">no section</span>
                        )}
                        {canManage && first && (
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => setEditing(row)}
                            className={`${iconButton} print:hidden`}
                            aria-label={`Edit ${row.name}`}
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </th>

                    {/* Medium */}
                    <td className="px-4 py-3">
                      {section ? (
                        canManage && editable ? (
                          <select
                            aria-label={`Medium of ${row.name} Section ${section.name}`}
                            value={section.medium ?? ""}
                            disabled={busy === `medium-${section.id}`}
                            onChange={(e) =>
                              run(`medium-${section.id}`, async () => {
                                await callApi(`${base}/academics/sections/${section.id}`, "PATCH", {
                                  medium: e.target.value || null,
                                });
                                return `${row.name} ${section.name} medium updated.`;
                              })
                            }
                            className="-ml-1 cursor-pointer rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-700 hover:border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                          >
                            {mediumOptions(defaultMedium)}
                          </select>
                        ) : (
                          <span className="text-slate-700">
                            {(section.medium ?? defaultMedium)
                              ? MEDIUM_SHORT[(section.medium ?? defaultMedium)!]
                              : "—"}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Subjects (once per class) */}
                    <td className="px-4 py-3">
                      {first &&
                        (row.subjects.length ? (
                          <button
                            type="button"
                            onClick={() => setSubjectsFor(row.id)}
                            className="cursor-pointer text-left text-sm text-slate-700 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                            aria-label={`${row.name} subjects: ${row.subjects.map((s) => s.name).join(", ")}`}
                          >
                            {row.subjects
                              .slice(0, 2)
                              .map((s) => s.name)
                              .join(", ")}
                            {row.subjects.length > 2 && (
                              <span className="whitespace-nowrap text-slate-500">
                                {" "}
                                +{row.subjects.length - 2} more
                              </span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSubjectsFor(row.id)}
                            className={missingLink}
                          >
                            Add subjects
                          </button>
                        ))}
                    </td>

                    {/* Fees (once per class) */}
                    {includesFees && (
                      <td className="px-4 py-3">
                        {first && (
                          <FeeSummary
                            row={row}
                            canManage={canManage && editable}
                            onOpen={() => setFeesFor(row.id)}
                          />
                        )}
                      </td>
                    )}

                    {/* Exams (once per class) */}
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {first &&
                        (row.exams.length ? (
                          <ul className="space-y-0.5">
                            {row.exams.slice(0, 2).map((e) => (
                              <li key={e.id}>
                                <span className="font-medium text-slate-800">{e.name}</span>
                                {e.maxMarks !== null && (
                                  <span className="text-slate-500">
                                    {" "}
                                    · {e.maxMarks}/{e.passMarks}
                                  </span>
                                )}
                              </li>
                            ))}
                            {row.exams.length > 2 && (
                              <li className="text-slate-500">+{row.exams.length - 2} more</li>
                            )}
                          </ul>
                        ) : (
                          <span className="text-slate-300">—</span>
                        ))}
                    </td>

                    {/* Class teacher */}
                    <td className="px-4 py-3">
                      {section?.classTeacher ? (
                        <span className="text-slate-700">{section.classTeacher}</span>
                      ) : section && canManage ? (
                        <Link
                          href={`/school/${schoolSlug}/academics/sections`}
                          className="text-xs font-semibold text-emerald-700 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                        >
                          Assign
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Status + actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && first && (
                          <button
                            type="button"
                            disabled={!editable || row.subjects.length === 0}
                            onClick={() => setCopyFrom(row)}
                            className={`${iconButton} print:hidden`}
                            aria-label={`Copy ${row.name} subjects to other classes`}
                            title="Copy subjects to other classes"
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {canManage && section && section.studentCount === 0 && (
                          <button
                            type="button"
                            disabled={!editable || busy === `delete-${section.id}`}
                            onClick={() => {
                              if (!window.confirm(`Delete ${row.name} Section ${section.name}?`))
                                return;
                              void run(`delete-${section.id}`, async () => {
                                await callApi(`${base}/academics/sections/${section.id}`, "DELETE");
                                return `${row.name} Section ${section.name} deleted.`;
                              });
                            }}
                            className={`${iconButton} hover:bg-rose-50 hover:text-rose-700 print:hidden`}
                            aria-label={`Delete ${row.name} Section ${section.name}`}
                            title="Delete section"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {section && section.studentCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-slate-600"
                            title="Sections with students cannot be deleted"
                          >
                            <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                            {section.studentCount} student{section.studentCount === 1 ? "" : "s"}
                          </span>
                        )}
                        {first &&
                          (row.missing.length === 0 ? (
                            <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Ready
                            </span>
                          ) : (
                            <span className="ml-1 text-xs font-semibold text-amber-700">
                              Needs {row.missing.map((m) => MISSING_LABEL[m]).join(", ")}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            {schoolName}
            {overview.currentYear &&
              ` · Session ${overview.currentYear.name}, ${formatDate(overview.currentYear.startDate)} – ${formatDate(overview.currentYear.endDate)}`}
          </span>
          {includesFees && canManage && (
            <Link
              href={`/school/${schoolSlug}/fees`}
              className="font-semibold text-emerald-700 hover:underline print:hidden"
            >
              Fee heads and structures in Fees management →
            </Link>
          )}
        </div>
      </section>

      {/* Dialogs */}
      {createOpen && (
        <CreateClassModal
          rows={rows}
          defaultMedium={defaultMedium}
          suggestions={overview.profile.missingClasses}
          busy={busy === "create"}
          onClose={() => setCreateOpen(false)}
          onCreate={async (payload) => {
            const ok = await run("create", async () => {
              const data = await callApi<{
                class: { name: string };
                sectionsCreated: number;
                subjectsCreated: number;
              }>(`${base}/academics/setup`, "POST", payload);
              return `${data.class.name} created with ${data.sectionsCreated} section${
                data.sectionsCreated === 1 ? "" : "s"
              }${data.subjectsCreated ? ` and ${data.subjectsCreated} subjects` : ""}. Set its fees next.`;
            });
            if (ok) setCreateOpen(false);
          }}
        />
      )}

      {rowById(subjectsFor) && (
        <SubjectsModal
          row={rowById(subjectsFor)!}
          editable={editable}
          busy={busy}
          onClose={() => setSubjectsFor(null)}
          onAdd={(row, names, code) =>
            run(`subject-add-${row.id}`, async () => {
              for (const name of names) {
                await callApi(`${base}/academics/subjects`, "POST", {
                  name,
                  code: code || null,
                  classId: row.id,
                });
              }
              return names.length === 1
                ? `${names[0]} added to ${row.name}.`
                : `${names.length} subjects added to ${row.name}.`;
            })
          }
          onRemove={(row, subject) => {
            if (!window.confirm(`Remove ${subject.name} from ${row.name}?`)) return;
            void run(`subject-${subject.id}`, async () => {
              await callApi(`${base}/academics/subjects/${subject.id}`, "DELETE");
              return `${subject.name} removed from ${row.name}.`;
            });
          }}
        />
      )}

      {rowById(feesFor) && (
        <FeePlanModal
          row={rowById(feesFor)!}
          apiBase={base}
          onClose={() => setFeesFor(null)}
          onSaved={async (message) => {
            await refresh();
            setFeedback({ tone: "success", text: message });
            setFeesFor(null);
          }}
        />
      )}

      {copyFrom && (
        <CopySubjectsModal
          source={copyFrom}
          rows={rows}
          busy={busy === "copy"}
          onClose={() => setCopyFrom(null)}
          onCopy={async (toClassIds) => {
            const ok = await run("copy", async () => {
              const data = await callApi<{ copied: number; classes: string[] }>(
                `${base}/academics/setup/copy-subjects`,
                "POST",
                { fromClassId: copyFrom.id, toClassIds }
              );
              return data.copied
                ? `Copied ${data.copied} subject${data.copied === 1 ? "" : "s"} to ${data.classes.join(", ")}.`
                : "Those classes already have all of these subjects.";
            });
            if (ok) setCopyFrom(null);
          }}
        />
      )}

      {editing && (
        <EditClassModal
          row={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (name, numericOrder) => {
            const ok = await run("edit", async () => {
              await callApi(`${base}/academics/classes/${editing.id}`, "PATCH", {
                name,
                numericOrder,
              });
              return `${name} saved.`;
            });
            if (ok) setEditing(null);
          }}
          onDelete={async () => {
            if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`)) return;
            const ok = await run("delete-class", async () => {
              await callApi(`${base}/academics/classes/${editing.id}`, "DELETE");
              return `${editing.name} deleted.`;
            });
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Callout({
  children,
  action,
  tone = "info",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-3.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between print:hidden ${
        tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
      }`}
    >
      <p className="flex items-start gap-2">
        {tone === "warn" && (
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        {children}
      </p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function FeeSummary({
  row,
  canManage,
  onOpen,
}: {
  row: ClassSetupRow;
  canManage: boolean;
  onOpen: () => void;
}) {
  const fees = row.fees;
  const empty = !fees || (!fees.monthlyFee && !fees.admissionFee && fees.additional.length === 0);
  if (empty) {
    return canManage ? (
      <button type="button" onClick={onOpen} className={missingLink}>
        Set fees
      </button>
    ) : (
      <span className="text-slate-300">—</span>
    );
  }
  const all = [
    ...(fees.monthlyFee ? [`${formatINR(fees.monthlyFee)} monthly`] : []),
    ...(fees.admissionFee ? [`${formatINR(fees.admissionFee)} admission`] : []),
    ...fees.additional.map(
      (a) => `${formatINR(a.amount)} ${FREQUENCY_SUFFIX[a.frequency]} · ${a.headName}`
    ),
  ];
  const shown = all.slice(0, 2);
  const hidden = all.length - shown.length;

  const content = (
    <span className="block text-left text-sm whitespace-nowrap tabular-nums">
      <span className="block text-slate-800">{shown[0]}</span>
      {shown[1] && <span className="block text-xs text-slate-600">{shown[1]}</span>}
      {hidden > 0 && <span className="block text-xs text-slate-500">+{hidden} more</span>}
    </span>
  );
  const lines = all;

  return canManage ? (
    <button
      type="button"
      onClick={onOpen}
      className="cursor-pointer rounded-md hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
      aria-label={`${row.name} fees: ${lines.join(", ")}. Edit fees`}
    >
      {content}
    </button>
  ) : (
    content
  );
}

function QuickAddSection({
  rows,
  defaultMedium,
  busy,
  onAdd,
}: {
  rows: ClassSetupRow[];
  defaultMedium: MediumValue | null;
  busy: boolean;
  onAdd: (row: ClassSetupRow, medium: string) => Promise<boolean>;
}) {
  const uid = useId();
  const [classId, setClassId] = useState(rows[0]?.id ?? "");
  const [medium, setMedium] = useState("");
  const row = rows.find((r) => r.id === classId) ?? rows[0];
  const target = row ? nextSectionName(row.sections.map((s) => s.name)) : "A";

  return (
    <form
      className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
      onSubmit={(e) => {
        e.preventDefault();
        if (row) void onAdd(row, medium);
      }}
    >
      <span className="font-semibold text-slate-700">Add section</span>
      <label className="sr-only" htmlFor={`${uid}-class`}>
        Class
      </label>
      <select
        id={`${uid}-class`}
        value={row?.id ?? ""}
        onChange={(e) => setClassId(e.target.value)}
        className={fieldSm}
      >
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`${uid}-medium`}>
        Medium
      </label>
      <select
        id={`${uid}-medium`}
        value={medium}
        onChange={(e) => setMedium(e.target.value)}
        className={fieldSm}
      >
        {mediumOptions(defaultMedium)}
      </select>
      <button type="submit" disabled={busy || !row} className={quietButton}>
        {busy ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Section {target}
      </button>
    </form>
  );
}

function SchoolWideSubjects({
  subjects,
  busy,
  onAdd,
  onRemove,
}: {
  subjects: { id: string; name: string }[];
  busy: string | null;
  onAdd: (name: string) => Promise<boolean>;
  onRemove: (subject: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600"
      onSubmit={async (e) => {
        e.preventDefault();
        const value = name.trim();
        if (value && (await onAdd(value))) setName("");
      }}
    >
      <span className="font-semibold text-slate-700">Every class</span>
      {subjects.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-0.5 rounded-md bg-white py-0.5 pr-0.5 pl-2 ring-1 ring-slate-200"
        >
          {s.name}
          <button
            type="button"
            disabled={busy === `subject-${s.id}`}
            onClick={() => onRemove(s)}
            className="cursor-pointer rounded p-0.5 text-slate-400 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            aria-label={`Remove ${s.name}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Physical Education"
        aria-label="Add a subject taught in every class"
        maxLength={100}
        className={`${fieldSm} w-44`}
      />
      <button
        type="submit"
        disabled={!name.trim() || busy === "school-wide-add"}
        className={iconButton}
        aria-label="Add subject to every class"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Fees dialog
// ---------------------------------------------------------------------------

type CostRow = {
  key: number;
  headId: string; // "" | head id | "__new"
  newHeadName: string;
  amount: string;
  frequency: PlanFrequency;
};

const NEW_HEAD = "__new";

function FeePlanModal({
  row,
  apiBase,
  onClose,
  onSaved,
}: {
  row: ClassSetupRow;
  apiBase: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const uid = useId();
  const [plan, setPlan] = useState<ClassFeePlanView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [monthly, setMonthly] = useState("");
  const [admission, setAdmission] = useState("");
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [nextKey, setNextKey] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const close = () => {
    if (dirty && !saving && !window.confirm("Discard the fee changes you have not saved?")) return;
    onClose();
  };

  useEffect(() => {
    let cancelled = false;
    callApi<{ plan: ClassFeePlanView }>(`${apiBase}/fees/class-plans/${row.id}`, "GET")
      .then(({ plan: p }) => {
        if (cancelled) return;
        setPlan(p);
        setMonthly(p.monthlyFee ?? "");
        setAdmission(p.admissionFee ?? "");
        setCosts(
          p.additional.map((a, i) => ({
            key: i,
            headId: a.feeHeadId,
            newHeadName: "",
            amount: a.amount,
            frequency: a.frequency,
          }))
        );
        setNextKey(p.additional.length);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load fees.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, row.id]);

  // Tuition and admission have their own fields, so they are not offered as extra costs.
  const extraHeads = useMemo(() => {
    const list = (plan?.heads ?? []).filter((h) => !isTuitionHead(h) && !isAdmissionHead(h));
    for (const used of plan?.additional ?? []) {
      if (!list.some((h) => h.id === used.feeHeadId)) {
        list.push({ id: used.feeHeadId, name: used.headName, code: null });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [plan]);
  const update = (key: number, patch: Partial<CostRow>) => {
    setDirty(true);
    setCosts((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const check = (field: string, value: string, required: boolean) => {
      if (!value.trim()) {
        if (required) next[field] = "Enter an amount";
        return;
      }
      const parsed = rupeeAmount.safeParse(value);
      if (!parsed.success) next[field] = parsed.error.issues[0].message;
      else if (Number(value) <= 0) next[field] = "Amount must be more than ₹0";
    };
    check("monthly", monthly, false);
    check("admission", admission, false);
    const seen = new Set<string>();
    for (const c of costs) {
      check(`amount-${c.key}`, c.amount, true);
      if (!c.headId) next[`head-${c.key}`] = "Choose a fee head";
      if (c.headId === NEW_HEAD && c.newHeadName.trim().length < 2) {
        next[`head-${c.key}`] = "Name the new fee head";
      }
      const id = `${c.headId === NEW_HEAD ? c.newHeadName.trim().toLowerCase() : c.headId}:${c.frequency}`;
      if (seen.has(id)) next[`head-${c.key}`] = "Already listed with this frequency";
      seen.add(id);
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Move focus to the first field that needs fixing.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      );
      return false;
    }
    return true;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      await callApi(`${apiBase}/fees/class-plans/${row.id}`, "PUT", {
        monthlyFee: monthly.trim() || null,
        admissionFee: admission.trim() || null,
        additional: costs.map((c) => ({
          ...(c.headId === NEW_HEAD
            ? { newHeadName: c.newHeadName.trim() }
            : { feeHeadId: c.headId }),
          amount: c.amount.trim(),
          frequency: c.frequency,
        })),
      });
      await onSaved(`${row.name} fees saved.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save fees.");
    } finally {
      setSaving(false);
    }
  };

  const rupeeField = (
    id: string,
    label: string,
    hint: string,
    value: string,
    onChange: (v: string) => void,
    error?: string
  ) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-slate-500">
          ₹
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setDirty(true);
            onChange(e.target.value);
          }}
          placeholder="0"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint`}
          className={inputClass(Boolean(error), "mt-0! pl-7 tabular-nums")}
        />
      </div>
      <p id={`${id}-hint`} className={`mt-1 text-xs ${error ? "text-rose-700" : "text-slate-500"}`}>
        {error ?? hint}
      </p>
    </div>
  );

  return (
    <Modal isOpen onClose={close} title={`${row.name} fees`} maxWidth="max-w-2xl">
      {!plan && !loadError && (
        <p className="flex items-center gap-2 py-8 text-sm text-slate-500" role="status">
          <Spinner /> Loading fees…
        </p>
      )}
      {loadError && (
        <p role="alert" className="py-6 text-sm text-rose-700">
          {loadError}
        </p>
      )}
      {plan && (
        <form ref={formRef} onSubmit={save} className="space-y-5" noValidate>
          <p className="text-xs text-slate-500">
            Session {plan.academicYear.name}. Changes apply to invoices generated from now on;
            invoices already issued keep their amounts.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rupeeField(
              `${uid}-monthly`,
              "Monthly fee",
              "Tuition, charged every month",
              monthly,
              setMonthly,
              errors.monthly
            )}
            {rupeeField(
              `${uid}-admission`,
              "Admission fee",
              "Charged once when a student joins",
              admission,
              setAdmission,
              errors.admission
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Additional costs</legend>
            <p className="text-xs text-slate-500">
              Exam, transport, activity or any other charge, with how often it is billed.
            </p>
            {costs.length > 0 && (
              <ul className="mt-3 space-y-2">
                {costs.map((c, index) => (
                  <li
                    key={c.key}
                    className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 rounded-xl border border-slate-100 p-2 sm:grid-cols-[1fr_7rem_7.5rem_auto] sm:rounded-none sm:border-0 sm:p-0"
                  >
                    <div className="col-span-3 sm:col-span-1">
                      <label htmlFor={`${uid}-head-${c.key}`} className="sr-only">
                        Fee head for cost {index + 1}
                      </label>
                      <select
                        id={`${uid}-head-${c.key}`}
                        value={c.headId}
                        onChange={(e) => update(c.key, { headId: e.target.value })}
                        aria-invalid={Boolean(errors[`head-${c.key}`])}
                        aria-describedby={
                          errors[`head-${c.key}`] ? `${uid}-head-${c.key}-error` : undefined
                        }
                        className={inputClass(Boolean(errors[`head-${c.key}`]), "mt-0")}
                      >
                        <option value="">Choose a fee head</option>
                        {extraHeads.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                        <option value={NEW_HEAD}>+ New fee head…</option>
                      </select>
                      {c.headId === NEW_HEAD && (
                        <input
                          value={c.newHeadName}
                          onChange={(e) => update(c.key, { newHeadName: e.target.value })}
                          placeholder="e.g. Transport Fee"
                          aria-label={`Name of new fee head for cost ${index + 1}`}
                          maxLength={80}
                          className={inputClass(Boolean(errors[`head-${c.key}`]), "mt-1.5")}
                        />
                      )}
                      {errors[`head-${c.key}`] && (
                        <p id={`${uid}-head-${c.key}-error`} className="mt-1 text-xs text-rose-700">
                          {errors[`head-${c.key}`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={`${uid}-amount-${c.key}`} className="sr-only">
                        Amount for cost {index + 1}
                      </label>
                      <input
                        id={`${uid}-amount-${c.key}`}
                        inputMode="decimal"
                        value={c.amount}
                        onChange={(e) => update(c.key, { amount: e.target.value })}
                        placeholder="₹ 0"
                        aria-invalid={Boolean(errors[`amount-${c.key}`])}
                        aria-describedby={
                          errors[`amount-${c.key}`] ? `${uid}-amount-${c.key}-error` : undefined
                        }
                        className={inputClass(
                          Boolean(errors[`amount-${c.key}`]),
                          "mt-0 tabular-nums"
                        )}
                      />
                      {errors[`amount-${c.key}`] && (
                        <p
                          id={`${uid}-amount-${c.key}-error`}
                          className="mt-1 text-xs text-rose-700"
                        >
                          {errors[`amount-${c.key}`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={`${uid}-freq-${c.key}`} className="sr-only">
                        How often cost {index + 1} is charged
                      </label>
                      <select
                        id={`${uid}-freq-${c.key}`}
                        value={c.frequency}
                        onChange={(e) =>
                          update(c.key, { frequency: e.target.value as PlanFrequency })
                        }
                        className={inputClass(false, "mt-0")}
                      >
                        {PLAN_FREQUENCIES.map((f) => (
                          <option key={f} value={f}>
                            {PLAN_FREQUENCY_LABEL[f]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDirty(true);
                        setCosts((list) => list.filter((x) => x.key !== c.key));
                      }}
                      className={`${iconButton} mt-2 hover:bg-rose-50 hover:text-rose-700`}
                      aria-label={`Remove cost ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                setCosts((list) => [
                  ...list,
                  { key: nextKey, headId: "", newHeadName: "", amount: "", frequency: "ANNUAL" },
                ]);
                setNextKey((k) => k + 1);
                setDirty(true);
                requestAnimationFrame(() =>
                  document.getElementById(`${uid}-head-${nextKey}`)?.focus()
                );
              }}
              className={`${quietButton} mt-3`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add cost
            </button>
          </fieldset>

          {plan.customStructures > 0 && (
            <p className="text-xs text-slate-500">
              {plan.customStructures} structure{plan.customStructures === 1 ? "" : "s"} on a custom
              schedule {plan.customStructures === 1 ? "is" : "are"} managed in Fees management and
              not changed here.
            </p>
          )}

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={close} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? <Spinner /> : <IndianRupee className="h-4 w-4" aria-hidden="true" />}
              Save fees
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Class, subject and copy dialogs
// ---------------------------------------------------------------------------

function CreateClassModal({
  rows,
  defaultMedium,
  suggestions,
  busy,
  onClose,
  onCreate,
}: {
  rows: ClassSetupRow[];
  defaultMedium: MediumValue | null;
  suggestions: string[];
  busy: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    numericOrder: number | null;
    sections: string[];
    medium: string | null;
    applySubjectTemplate: boolean;
  }) => Promise<void>;
}) {
  const uid = useId();
  const [name, setName] = useState(suggestions[0] ?? "");
  const [sectionCount, setSectionCount] = useState(1);
  const [medium, setMedium] = useState("");
  const [applyTemplate, setApplyTemplate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const grade = gradeOfClassName(name);
  const template = classesForRange("CLASS_1_TO_12", true).find(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase()
  );
  const order =
    template?.numericOrder ?? Math.max(-1, ...rows.map((r) => r.numericOrder ?? -1)) + 1;

  return (
    <Modal isOpen onClose={onClose} title="Add class" maxWidth="max-w-md">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const trimmed = name.trim();
          if (!trimmed) return setError("Enter a class name.");
          if (rows.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
            return setError(`${trimmed} already exists.`);
          }
          await onCreate({
            name: trimmed,
            numericOrder: order,
            sections: Array.from({ length: sectionCount }, (_, i) => String.fromCharCode(65 + i)),
            medium: medium || null,
            applySubjectTemplate: applyTemplate && grade !== null,
          });
        }}
      >
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>
            Class name
          </label>
          <input
            id={`${uid}-name`}
            list={`${uid}-suggestions`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Class 6"
            maxLength={50}
            aria-invalid={Boolean(error)}
            className={inputClass(Boolean(error))}
          />
          <datalist id={`${uid}-suggestions`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {error && (
            <p role="alert" className="mt-1 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-sections`} className={labelClass}>
              Sections
            </label>
            <select
              id={`${uid}-sections`}
              value={sectionCount}
              onChange={(e) => setSectionCount(Number(e.target.value))}
              className={inputClass()}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)).join(", ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-medium`} className={labelClass}>
              Medium
            </label>
            <select
              id={`${uid}-medium`}
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              className={inputClass()}
            >
              {mediumOptions(defaultMedium)}
            </select>
          </div>
        </div>
        <label className={`flex items-start gap-2.5 text-sm ${grade === null ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            checked={applyTemplate && grade !== null}
            disabled={grade === null}
            onChange={(e) => setApplyTemplate(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-700"
          />
          <span>
            <span className="font-semibold text-slate-800">Add default subjects</span>
            <span className="block text-xs text-slate-500">
              {grade === null
                ? "For Nursery, LKG, UKG and Class 1 to Class 12."
                : defaultSubjectsFor(grade).join(", ")}
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy && <Spinner />}
            Add class
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SubjectsModal({
  row,
  editable,
  busy,
  onClose,
  onAdd,
  onRemove,
}: {
  row: ClassSetupRow;
  editable: boolean;
  busy: string | null;
  onClose: () => void;
  onAdd: (row: ClassSetupRow, names: string[], code: string) => Promise<boolean>;
  onRemove: (row: ClassSetupRow, subject: { id: string; name: string }) => void;
}) {
  const uid = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const grade = gradeOfClassName(row.name);
  const have = new Set(row.subjects.map((s) => s.name.toLowerCase()));
  const missingDefaults =
    grade !== null ? defaultSubjectsFor(grade).filter((s) => !have.has(s.toLowerCase())) : [];
  const adding = busy === `subject-add-${row.id}`;

  return (
    <Modal isOpen onClose={onClose} title={`${row.name} subjects`} maxWidth="max-w-md">
      <div className="space-y-4">
        {row.subjects.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {row.subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-slate-800">
                  {s.name}
                  {s.code && (
                    <span className="ml-2 font-mono text-xs text-slate-400">{s.code}</span>
                  )}
                </span>
                {editable && (
                  <button
                    type="button"
                    disabled={busy === `subject-${s.id}`}
                    onClick={() => onRemove(row, s)}
                    className={`${iconButton} hover:bg-rose-50 hover:text-rose-700`}
                    aria-label={`Remove ${s.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && missingDefaults.length > 0 && (
          <button
            type="button"
            disabled={adding}
            onClick={() => void onAdd(row, missingDefaults, "")}
            className={`${quietButton} w-full justify-start`}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            Add defaults: {missingDefaults.join(", ")}
          </button>
        )}

        {editable && (
          <form
            className="flex gap-2 border-t border-slate-100 pt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const value = name.trim();
              if (value && (await onAdd(row, [value], code.trim()))) {
                setName("");
                setCode("");
              }
            }}
          >
            <label htmlFor={`${uid}-subject`} className="sr-only">
              Subject name
            </label>
            <input
              id={`${uid}-subject`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subject"
              maxLength={100}
              className={inputClass(false, "mt-0 flex-1")}
            />
            <label htmlFor={`${uid}-code`} className="sr-only">
              Subject code (optional)
            </label>
            <input
              id={`${uid}-code`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code"
              maxLength={20}
              className={inputClass(false, "mt-0 w-24 uppercase")}
            />
            <button type="submit" disabled={!name.trim() || adding} className={primaryButtonClass}>
              {adding ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">Add subject</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}

function CopySubjectsModal({
  source,
  rows,
  busy,
  onClose,
  onCopy,
}: {
  source: ClassSetupRow;
  rows: ClassSetupRow[];
  busy: boolean;
  onClose: () => void;
  onCopy: (toClassIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal isOpen onClose={onClose} title={`Copy ${source.name} subjects`} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{source.subjects.map((s) => s.name).join(", ")}</p>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">To</legend>
          <div className="mt-2 grid max-h-60 grid-cols-3 gap-1.5 overflow-y-auto">
            {rows
              .filter((r) => r.id !== source.id)
              .map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                  {r.name}
                </label>
              ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            disabled={selected.length === 0 || busy}
            onClick={() => void onCopy(selected)}
            className={primaryButtonClass}
          >
            {busy && <Spinner />}
            Copy
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditClassModal({
  row,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  row: ClassSetupRow;
  busy: string | null;
  onClose: () => void;
  onSave: (name: string, numericOrder: number | null) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const uid = useId();
  const [name, setName] = useState(row.name);
  const [order, setOrder] = useState(row.numericOrder === null ? "" : String(row.numericOrder));
  const canDelete = row.sections.length === 0 && row.subjects.length === 0;

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${row.name}`} maxWidth="max-w-sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void onSave(name.trim(), order.trim() === "" ? null : Number(order));
        }}
      >
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>
            Name
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className={inputClass()}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-order`} className={labelClass}>
            Sort order
          </label>
          <input
            id={`${uid}-order`}
            type="number"
            min={0}
            max={1000}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className={inputClass()}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={!canDelete || busy === "delete-class"}
            onClick={() => void onDelete()}
            className={`${button} text-rose-700 hover:bg-rose-50`}
            title={canDelete ? undefined : "Remove its sections and subjects first"}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={busy === "edit"} className={primaryButtonClass}>
              {busy === "edit" && <Spinner />}
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ClassSubjectSetupClient;
