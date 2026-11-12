import React from "react";
import type { SchoolProfileView } from "../services/school-profile";
import {
  BOARD_AFFILIATIONS,
  CLASS_RANGES,
  HOS_DESIGNATIONS,
  LEADER_DESIGNATIONS,
  INSTRUCTION_MEDIUMS,
  RTE_ENTRY_CLASSES,
  RTE_EXIT_CLASSES,
  SCHOOL_STREAMS,
  describeActiveRange,
  formatIndianPhone,
  labelFor,
} from "../services/school-profile-rules";

type Row = { label: string; value?: string | null; mono?: boolean };

/** A UDISE+-style card: a title over a bordered label/value grid, two pairs per row on wide screens. */
function Card({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="shadow-card rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <dl className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden rounded-xl border-t border-l border-slate-200 text-sm lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,3fr)]">
        {rows.map((r, i) => (
          <React.Fragment key={r.label}>
            <dt className="border-r border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-emerald-900">
              {r.label}
            </dt>
            <dd
              className={`border-r border-b border-slate-200 px-4 py-3 break-words text-slate-800 ${r.mono ? "font-mono" : ""} ${
                // An odd last pair fills the row instead of leaving an unbordered gap.
                rows.length % 2 && i === rows.length - 1 ? "lg:col-span-3" : ""
              }`}
            >
              {r.value || <span className="text-slate-400">Not provided</span>}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}

/** Read-only view of a saved (locked) Master School Profile. */
export function SchoolProfileSummary({ profile: p }: { profile: SchoolProfileView }) {
  const a = p.academic;
  const rte = a.rteApplicable
    ? `Yes · ${labelFor(RTE_ENTRY_CLASSES, a.rteEntryClass)} to ${labelFor(RTE_EXIT_CLASSES, a.rteExitClass)}`
    : "No";
  const board =
    a.boardAffiliation === "STATE_BOARD" && a.stateBoardName
      ? `State Board (${a.stateBoardName})`
      : labelFor(BOARD_AFFILIATIONS, a.boardAffiliation);

  return (
    <div className="space-y-5">
      <Card
        title="HOS details"
        rows={[
          { label: "Head of school", value: p.leadership.hosName },
          {
            label: "Designation",
            value: labelFor(HOS_DESIGNATIONS, p.leadership.hosDesignation),
          },
          { label: "Contact no.", value: formatIndianPhone(p.leadership.hosMobile) },
          { label: "Email", value: p.leadership.hosEmail },
          { label: "Owner / manager", value: p.leadership.managementName },
          { label: "Management phone", value: formatIndianPhone(p.leadership.managementPhone) },
          ...p.leadership.otherLeaders.flatMap((l, i) => [
            {
              label: `Person ${i + 2}`,
              value: `${l.name} · ${labelFor(LEADER_DESIGNATIONS, l.designation)}`,
            },
            {
              label: `Person ${i + 2} contact`,
              value: `${formatIndianPhone(l.mobile)} · ${l.email}`,
            },
          ]),
        ]}
      />
      <Card
        title="Basic information"
        rows={[
          { label: "School name", value: p.identity.name },
          { label: "UDISE code", value: p.identity.udiseCode, mono: true },
          { label: "Establishment year", value: p.identity.establishmentYear?.toString() },
          { label: "Recognition no.", value: p.identity.recognitionNumber, mono: true },
          { label: "Official email", value: p.identity.officialEmail },
          { label: "Contact mobile", value: formatIndianPhone(p.identity.contactMobile) },
          { label: "Postal address", value: p.identity.postalAddress },
          { label: "School code", value: p.school.code, mono: true },
        ]}
      />
      <Card
        title="Academic & operational setup"
        rows={[
          {
            label: "Medium of instruction",
            value: labelFor(INSTRUCTION_MEDIUMS, a.instructionMedium),
          },
          { label: "Class range", value: labelFor(CLASS_RANGES, a.classRange) },
          { label: "Pre-primary", value: a.includesPrePrimary ? "Available" : "Not available" },
          {
            label: "Active classes",
            value: describeActiveRange(a.classRange, a.includesPrePrimary),
          },
          { label: "RTE applicable", value: rte },
          { label: "Board affiliation", value: board },
          {
            label: "Streams (Class 11–12)",
            value: a.streams.map((s) => labelFor(SCHOOL_STREAMS, s)).join(", ") || "Not applicable",
          },
        ]}
      />
    </div>
  );
}
