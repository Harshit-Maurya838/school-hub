import { Check, Lock, PenLine } from "lucide-react";
import { NumberRoll } from "@/components/hairline/number-roll";

/*
 * Demo records shown when an index entry is opened. Every name, ID and amount is synthetic.
 * Every line sits on the page ruling: rows are h-8, text is leading-8, gaps are mt-8.
 */

export const serif = "font-[family-name:var(--font-register)]";
/** Ruling pitch in px; keep in step with --rule-gap in globals.css. */
export const RULE = 32;
const mono = "font-mono tabular-nums";

export type EntryId = "academics" | "students" | "attendance" | "examinations" | "fees" | "audit";

export const ENTRIES: {
  id: EntryId;
  numeral: string;
  title: string;
  gloss: string;
  page: number;
}[] = [
  {
    id: "academics",
    numeral: "i",
    title: "Academics",
    gloss: "Sessions, classes, sections, subjects",
    page: 3,
  },
  {
    id: "students",
    numeral: "ii",
    title: "Students",
    gloss: "Admissions, guardians, APAAR IDs",
    page: 11,
  },
  {
    id: "attendance",
    numeral: "iii",
    title: "Attendance",
    gloss: "Daily registers that lock",
    page: 19,
  },
  {
    id: "examinations",
    numeral: "iv",
    title: "Examinations",
    gloss: "Marks, review, publication",
    page: 27,
  },
  { id: "fees", numeral: "v", title: "Fees", gloss: "Invoices, receipts, refunds", page: 35 },
  {
    id: "audit",
    numeral: "vi",
    title: "Audit trail",
    gloss: "Who changed what, and why",
    page: 43,
  },
];

/** An office rubber stamp. It overhangs its one ruled line rather than pushing the lines apart. */
function Stamp({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber";
}) {
  const ink =
    tone === "green" ? "border-emerald-700 text-emerald-700" : "border-amber-700 text-amber-800";
  return (
    <span className="flex h-8 shrink-0 items-center">
      <span
        className={`landing-stamp ${ink} inline-flex flex-col items-center rounded-md border-2 px-3 py-1 text-center text-[11px] leading-tight font-black tracking-[0.12em] uppercase outline-1 outline-offset-2 outline-current`}
      >
        {children}
      </span>
    </span>
  );
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex h-8 items-center gap-3 text-[13px] ${className}`}>{children}</div>;
}

function Subtitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-start justify-between gap-4">
      <p className="text-sm leading-8 text-slate-600">{children}</p>
      {aside}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-[13px] leading-8 text-slate-700">{children}</p>;
}

function Attendance() {
  const rows: [number, string, boolean][] = [
    [1, "Aarav Sharma", true],
    [2, "Diya Patel", false],
    [3, "Kabir Singh", true],
    [4, "Meera Iyer", false],
    [5, "Rohan Gupta", true],
    [6, "Saanvi Rao", true],
    [7, "Vivaan Joshi", true],
  ];
  return (
    <>
      <Subtitle
        aside={
          <Stamp>
            Submitted
            <span className="flex items-center gap-1">
              <Lock className="size-3" strokeWidth={3} aria-hidden="true" /> 08:52
            </span>
          </Stamp>
        }
      >
        Class 7-B · Saturday, 14 November 2026
      </Subtitle>
      {rows.map(([roll, name, present]) => (
        <Row key={roll}>
          <span className={`${mono} w-6 text-xs text-slate-500`}>{roll}</span>
          <span className="flex-1 font-semibold text-slate-800">{name}</span>
          <span className={`font-bold ${present ? "text-emerald-700" : "text-rose-800"}`}>
            {present ? "Present" : "Absent"}
          </span>
        </Row>
      ))}
      <Row className="text-slate-500">
        <span className="w-6" />
        <span className="flex-1">… 33 more</span>
        <span className={mono}>38 P · 2 A</span>
      </Row>
      <p className="mt-8 flex gap-2.5 text-[13px] leading-8 text-slate-700">
        <PenLine className="mt-2 size-4 shrink-0 text-slate-500" aria-hidden="true" />
        <span>
          <span className={mono}>10:12</span> Ms. R. Kapoor corrected roll 2, Present → Absent.
          Reason: left after the first period.
        </span>
      </p>
    </>
  );
}

function Examinations() {
  const steps = ["Entered", "In review", "Approved", "Published"];
  const marks: [string, number][] = [
    ["Aarav Sharma", 71],
    ["Diya Patel", 64],
    ["Kabir Singh", 58],
    ["Meera Iyer", 77],
    ["Rohan Gupta", 49],
  ];
  return (
    <>
      <Subtitle>Term 1 · Mathematics · Class 7-B · out of 80</Subtitle>
      <ol className="flex flex-wrap items-center gap-x-2 text-xs font-bold">
        {steps.map((s, i) => (
          <li key={s} className="flex h-8 items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 ${
                i === 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : i === 1
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
              aria-current={i === 1 ? "step" : undefined}
            >
              {i === 0 && (
                <Check className="mr-1 inline size-3" strokeWidth={3} aria-hidden="true" />
              )}
              {s}
            </span>
            {i < steps.length - 1 && <span className="h-px w-3 bg-slate-300" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      {marks.map(([name, m]) => (
        <Row key={name}>
          <span className="flex-1 font-semibold text-slate-800">{name}</span>
          <span className={`${mono} font-semibold text-slate-900`}>{m}</span>
        </Row>
      ))}
      <div className="mt-8 flex items-start justify-between gap-4">
        <p className="max-w-xs text-[13px] leading-8 text-slate-700">
          Parents see these marks only after the exam in-charge approves and publishes them.
        </p>
        <Stamp tone="amber">Awaiting review</Stamp>
      </div>
    </>
  );
}

function Fees() {
  const items: [string, number][] = [
    ["Tuition fee, Quarter 3", 9600],
    ["Transport, Quarter 3", 2400],
    ["Term examination fee", 400],
  ];
  const inr = { style: "currency", currency: "INR", maximumFractionDigits: 0 } as const;
  return (
    <>
      <Subtitle>
        Diya Patel · Class 7-B · Invoice <span className={mono}>INV-2026-0318</span>
      </Subtitle>
      {items.map(([label, amt]) => (
        <Row key={label}>
          <span className="flex-1 text-slate-700">{label}</span>
          <span className={`${mono} text-slate-900`}>{amt.toLocaleString("en-IN", inr)}</span>
        </Row>
      ))}
      <Row className="border-t border-slate-300 font-bold">
        <span className="flex-1 text-slate-900">Total</span>
        <NumberRoll
          value={12400}
          from={0}
          locales="en-IN"
          format={inr}
          className={`${mono} text-slate-900`}
        />
      </Row>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="text-[13px] leading-8 text-slate-700">
          <p>Paid in cash at the office counter</p>
          <p>
            Receipt{" "}
            <span className={`${mono} font-semibold text-slate-900`}>REC-20261114-0042</span>
          </p>
        </div>
        <Stamp>Paid in full</Stamp>
      </div>
      <Note>
        The invoice keeps a copy of each fee line. Changing the fee structure later never alters it.
      </Note>
    </>
  );
}

function Students() {
  const fields: [string, string, boolean?][] = [
    ["Admission no.", "ADM/2026/0147", true],
    ["APAAR ID", "4821 7730 1956", true],
    ["Class and section", "7-B, roll 2"],
    ["Guardian", "Nikhil Patel (father)"],
    ["Enrolled", "1 April 2026"],
  ];
  return (
    <>
      <div className="flex h-8 items-center justify-between gap-4">
        <p className={`${serif} text-2xl text-slate-900`}>Diya Patel</p>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          Active
        </span>
      </div>
      <dl>
        {fields.map(([k, v, isMono]) => (
          <Row key={k}>
            <dt className="w-36 shrink-0 text-slate-500 sm:w-40">{k}</dt>
            <dd className={`font-semibold text-slate-900 ${isMono ? mono : ""}`}>{v}</dd>
          </Row>
        ))}
      </dl>
      <Note>
        Her father signs in to see her attendance, published results and fee receipts, and nothing
        about any other child.
      </Note>
    </>
  );
}

function Academics() {
  const checklist: [string, boolean][] = [
    ["Session 2026–27 set as current", true],
    ["Classes I to X, 22 sections", true],
    ["9 subjects mapped to classes", true],
    ["Class teachers assigned", true],
    ["Fee structure for Quarter 3", false],
  ];
  return (
    <>
      <Subtitle>Readiness checklist · Session 2026–27</Subtitle>
      <ul>
        {checklist.map(([label, done]) => (
          <Row key={label}>
            <span
              className={`grid size-5 place-items-center rounded-full border ${
                done
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-amber-500 bg-amber-50"
              }`}
              aria-hidden="true"
            >
              {done && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className={`flex-1 ${done ? "text-slate-800" : "font-semibold text-amber-900"}`}>
              {label}
            </span>
            <span className={`text-xs font-bold ${done ? "text-emerald-700" : "text-amber-800"}`}>
              {done ? "Done" : "Draft"}
            </span>
          </Row>
        ))}
      </ul>
      <Note>
        The office sets the school up one step at a time, and the checklist says what is left.
      </Note>
    </>
  );
}

function Audit() {
  const log: [string, string, string][] = [
    [
      "14 Nov 10:12",
      "R. Kapoor, class teacher",
      "Attendance 7-B, roll 2: Present → Absent. Left after first period.",
    ],
    ["14 Nov 11:40", "S. Menon, accountant", "Receipt REC-20261114-0042 recorded, ₹12,400 cash."],
    [
      "13 Nov 16:05",
      "A. Verma, exam in-charge",
      "Science 8-A marks returned to teacher. Two totals over 80.",
    ],
    [
      "12 Nov 09:30",
      "P. Nair, school admin",
      "Concession of ₹1,200 on INV-2026-0291. Sibling discount.",
    ],
  ];
  return (
    <>
      <Subtitle>Every change keeps a name, a time and a reason.</Subtitle>
      <ol>
        {log.map(([when, who, what]) => (
          <li key={when} className="grid grid-cols-[96px_1fr] gap-x-3 text-[13px] leading-8">
            <span className={`${mono} text-xs text-slate-500`}>{when}</span>
            <span>
              <span className="font-bold text-slate-900">{who}</span>
              <span className="block text-slate-700">{what}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export const RECORDS: Record<EntryId, { heading: string; body: React.ReactNode }> = {
  academics: { heading: "Setting up the session", body: <Academics /> },
  students: { heading: "Admission record", body: <Students /> },
  attendance: { heading: "Attendance register", body: <Attendance /> },
  examinations: { heading: "Mark sheet", body: <Examinations /> },
  fees: { heading: "Invoice and receipt", body: <Fees /> },
  audit: { heading: "Audit trail", body: <Audit /> },
};
