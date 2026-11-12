"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { BrandMark } from "@/components/layout/PublicShell";
import { FaqAccordion } from "@/components/hairline/faq-accordion";
import { ENTRIES, RECORDS, serif, RULE, type EntryId } from "./records";

const REGISTER_HREF = "/auth?tab=register";

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf7] focus-visible:outline-none";
const primaryAction = `inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-emerald-800 ${focusRing}`;
const textAction = `inline-flex items-center gap-1.5 rounded-md text-[15px] font-bold text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-900 hover:decoration-slate-500 ${focusRing}`;

/**
 * Display headings don't set on 32px lines, so pad each to the next whole rule; everything after it
 * then writes on the ruling again.
 */
function useSnapToRule<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const snap = () => {
      el.style.paddingBottom = "0px";
      const h = el.getBoundingClientRect().height;
      el.style.paddingBottom = `${Math.ceil(h / RULE) * RULE - h}px`;
    };
    snap();
    const observer = new ResizeObserver(snap);
    observer.observe(el.parentElement ?? el);
    document.fonts?.ready.then(snap);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Spread({
  id,
  left,
  right,
  labelledBy,
  className = "",
}: {
  id?: string;
  left: React.ReactNode;
  right: React.ReactNode;
  labelledBy?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`grid scroll-mt-6 grid-cols-[minmax(0,1fr)] border-t border-[#e7e1d3] first:border-t-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${className}`}
    >
      <div className="landing-paper landing-left-page px-6 py-8 sm:px-10 lg:px-14 lg:py-16">
        {left}
      </div>
      <div className="landing-paper landing-right-page border-t border-[#e7e1d3] px-6 py-8 sm:px-10 lg:border-t-0 lg:px-14 lg:py-16">
        {right}
      </div>
    </section>
  );
}

function RunningHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 text-sm leading-8 text-slate-600">
      {children}
    </div>
  );
}

function IndexPage({
  onOpen,
  entryRefs,
  registerLabel,
  registerHref,
}: {
  onOpen: (id: EntryId) => void;
  entryRefs: React.RefObject<Partial<Record<EntryId, HTMLButtonElement | null>>>;
  registerLabel: string;
  registerHref: string;
}) {
  const entryClass = `group block w-full rounded-lg text-left ${focusRing}`;
  const titleRow = "flex h-8 items-baseline gap-4";
  const leader = "landing-leader h-1 min-w-6 flex-1";
  return (
    <>
      <RunningHead>
        <h2 id="index-title" className={`${serif} text-2xl text-slate-900`}>
          Index
        </h2>
        <span>Open an entry to read its record</span>
      </RunningHead>
      <ol className="mt-8">
        {ENTRIES.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              ref={(el) => {
                entryRefs.current[e.id] = el;
              }}
              onClick={() => onOpen(e.id)}
              aria-controls="record-page"
              className={entryClass}
            >
              <span className={titleRow}>
                <span className={`${serif} w-8 shrink-0 text-base text-slate-500 italic`}>
                  {e.numeral}
                </span>
                <span className="text-lg font-bold text-slate-900 decoration-emerald-700 decoration-2 underline-offset-4 group-hover:underline sm:text-xl">
                  {e.title}
                </span>
                <span className={leader} aria-hidden="true" />
                <span className="font-mono text-sm text-emerald-800 tabular-nums">
                  <span className="sr-only">page </span>p.&nbsp;{e.page}
                </span>
              </span>
              <span className="block pl-12 text-[13px] leading-8 text-slate-600">{e.gloss}</span>
            </button>
          </li>
        ))}
        <li>
          <Link href={registerHref} className={entryClass}>
            <span className={titleRow}>
              <span className={`${serif} w-8 shrink-0 text-base text-emerald-700 italic`}>vii</span>
              <span className="text-lg font-bold text-emerald-800 decoration-2 underline-offset-4 group-hover:underline sm:text-xl">
                {registerLabel}
              </span>
              <span className={leader} aria-hidden="true" />
              <ArrowRight
                className="size-5 self-center text-emerald-700 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
            <span className="block pl-12 text-[13px] leading-8 text-emerald-900/80">
              The next entry in the book
            </span>
          </Link>
        </li>
      </ol>
    </>
  );
}

function RecordPage({
  id,
  onBack,
  onOpen,
  headingRef,
}: {
  id: EntryId;
  onBack: () => void;
  onOpen: (id: EntryId) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const at = ENTRIES.findIndex((e) => e.id === id);
  const entry = ENTRIES[at];
  const next = ENTRIES[(at + 1) % ENTRIES.length];
  const record = RECORDS[id];
  return (
    <div>
      <RunningHead>
        <button type="button" onClick={onBack} className={textAction}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Index
        </button>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {entry.numeral} · {entry.title} · p. {entry.page}
        </span>
      </RunningHead>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={`${serif} mt-8 text-[1.75rem] leading-8 text-slate-900 outline-none`}
      >
        {record.heading}
      </h2>
      {record.body}
      <div className="mt-8 flex h-8 items-center justify-between gap-4 text-xs text-slate-500">
        <span>Demo school · synthetic records</span>
        <button type="button" onClick={() => onOpen(next.id)} className={`${textAction} text-sm`}>
          {next.title} <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Actions({
  signedIn,
  registerHref,
  destination,
}: {
  signedIn: boolean;
  registerHref: string;
  destination: string;
}) {
  return (
    <div className="mt-8 flex min-h-16 flex-wrap items-center gap-x-6">
      <Link href={registerHref} className={primaryAction}>
        {signedIn ? "Go to dashboard" : "Register your school"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      {!signedIn && (
        <Link href={destination} className={textAction}>
          Sign in
        </Link>
      )}
    </div>
  );
}

const STEPS: [string, string][] = [
  [
    "Register your school",
    "School name, board and an office email. A code sent to that email confirms it.",
  ],
  ["Approval", "We check each registration before the school's register opens."],
  [
    "Set up the session",
    "Classes, sections, subjects and class teachers, with a checklist that shows what is left.",
  ],
  [
    "Invite your staff",
    "Teachers, accountants and office admins get an email invitation and choose their own password.",
  ],
  ["Admit students", "Add guardians, and parents sign in to see their own child's records."],
];

const NEVER: string[] = [
  "A submitted register changed without a reason.",
  "Marks reaching parents before they are reviewed.",
  "An invoice edited in place. Concessions, cancellations, reversals and refunds each keep a reason.",
  "A payment without a numbered receipt.",
  "A teacher marking a section they are not assigned to.",
  "One school seeing another school's records.",
];

const FAQS = [
  {
    question: "Does Academix take fee payments online?",
    answer:
      "No. Parents pay at your school office in cash, by bank transfer, cheque or DD. Academix records each payment against its invoice and issues a numbered receipt.",
  },
  {
    question: "Can a teacher change attendance after submitting it?",
    answer:
      "The register locks when it is submitted. A correction needs a stated reason, and it stays in the audit trail with the name of the person who made it.",
  },
  {
    question: "Can marks change after results are published?",
    answer:
      "Yes, when they must. Every change after publication is recorded with who made it and why, so the school can answer a parent's question.",
  },
  {
    question: "Who can see our school's records?",
    answer:
      "Only the people your school invites, and each sees only what their role allows: teachers see their own sections, parents see their own children. No other school can see your records.",
  },
  {
    question: "Do we need IT staff to set it up?",
    answer:
      "No. After approval, a readiness checklist takes the office through the session, classes, sections, subjects, teachers and fees one step at a time.",
  },
  {
    question: "Which schools is it built for?",
    answer:
      "Private K-12 schools in India following CBSE or a state board, with admission numbers and APAAR IDs for students and fees in rupees.",
  },
];

/* The Hairline FAQ, written on the ruling: no borders of its own, every line 32px. */
const faqOnRules =
  "border-b-0! [&>div]:border-t-0! [&>div+div]:mt-8 [&_button]:py-0! [&_button]:items-start [&_button>span:last-child]:mt-2 [&_button]:text-base [&_button]:leading-8 [&_button]:font-semibold [&_button]:text-slate-900 [&_[role=region]_div]:text-[15px] [&_[role=region]_div]:leading-8! [&_[role=region]_div]:text-slate-700 [&_[role=region]>div>div]:pb-0!";

export function LandingBook({ signedIn, destination }: { signedIn: boolean; destination: string }) {
  const [open, setOpen] = React.useState<EntryId | null>(null);
  const [turned, setTurned] = React.useState(false);
  const entryRefs = React.useRef<Partial<Record<EntryId, HTMLButtonElement | null>>>({});
  const headingRef = React.useRef<HTMLHeadingElement | null>(null);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const lastOpened = React.useRef<EntryId | null>(null);
  const titleRef = useSnapToRule<HTMLHeadingElement>();
  const closeRef = useSnapToRule<HTMLHeadingElement>();

  const registerHref = signedIn ? destination : REGISTER_HREF;
  const registerLabel = signedIn ? "Your school's dashboard" : "Your school";

  const openEntry = (id: EntryId) => {
    lastOpened.current = id;
    setTurned(true);
    setOpen(id);
  };
  const backToIndex = () => {
    setTurned(true);
    setOpen(null);
  };

  // After a turn, put focus where the reader's eyes go: the record's title, or the entry they came from.
  React.useEffect(() => {
    if (!turned) return;
    if (open) {
      headingRef.current?.focus({ preventScroll: true });
      const top = pageRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || top > window.innerHeight * 0.6) {
        pageRef.current?.scrollIntoView({ block: "start" });
      }
    } else if (lastOpened.current) {
      entryRefs.current[lastOpened.current]?.focus({ preventScroll: true });
    }
  }, [open, turned]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-3 py-3 sm:px-6 sm:py-6">
      {/* One bound book: a single spine down the left on desktop, across the top on phones. */}
      <div className="landing-book grid overflow-hidden rounded-2xl lg:grid-cols-[56px_minmax(0,1fr)]">
        <div className="landing-spine landing-spine-rings h-6 lg:h-auto" aria-hidden="true" />
        <div>
          <Spread
            labelledBy="landing-title"
            className="lg:min-h-[min(864px,calc(100svh-3rem))]"
            left={
              <>
                <RunningHead>
                  <BrandMark />

                  <nav aria-label="Main" className="flex items-center gap-5">
                    <a
                      href="#how"
                      className={`hidden rounded-md hover:text-slate-900 sm:inline ${focusRing}`}
                    >
                      How it works
                    </a>
                    <a
                      href="#questions"
                      className={`hidden rounded-md hover:text-slate-900 sm:inline ${focusRing}`}
                    >
                      Questions
                    </a>
                    <Link
                      href={destination}
                      className={`rounded-md font-bold text-slate-800 hover:text-slate-950 ${focusRing}`}
                    >
                      {signedIn ? "Dashboard" : "Sign in"}
                    </Link>
                  </nav>
                </RunningHead>
                <h1
                  ref={titleRef}
                  id="landing-title"
                  className={`${serif} mt-16 max-w-[13ch] text-[2.6rem] leading-[1.06] font-bold tracking-[-0.02em] text-balance text-slate-900 sm:text-6xl lg:mt-24 lg:text-[4.1rem]`}
                >
                  School records your office can stand behind.
                </h1>
                <p className="mt-8 max-w-[34rem] text-[17px] leading-8 text-pretty text-slate-700">
                  Attendance, examinations, students, staff and fees in one register. Registers lock
                  when submitted, marks are reviewed before they reach parents, every payment gets a
                  numbered receipt, and every correction leaves an audit trail.
                </p>
                <Actions
                  signedIn={signedIn}
                  registerHref={registerHref}
                  destination={destination}
                />
                <p className="mt-16 max-w-md text-[13px] leading-8 text-slate-600">
                  For CBSE and state-board private schools in India. Fees in rupees, collected at
                  your office counter and recorded here.
                </p>
                <p className="mt-8 flex h-8 items-center justify-between font-mono text-xs text-slate-500 tabular-nums">
                  <span>Session 2026–27</span>
                  <span>p. i</span>
                </p>
              </>
            }
            right={
              <div
                id="record-page"
                ref={pageRef}
                aria-live="polite"
                onKeyDown={(e) => {
                  if (e.key === "Escape" && open) backToIndex();
                }}
                className="scroll-mt-4"
              >
                <div key={open ?? "index"} className={turned ? "landing-turn" : undefined}>
                  {open ? (
                    <RecordPage
                      id={open}
                      onBack={backToIndex}
                      onOpen={openEntry}
                      headingRef={headingRef}
                    />
                  ) : (
                    <IndexPage
                      onOpen={openEntry}
                      entryRefs={entryRefs}
                      registerHref={registerHref}
                      registerLabel={registerLabel}
                    />
                  )}
                </div>
              </div>
            }
          />

          <Spread
            id="how"
            labelledBy="how-title"
            left={
              <>
                <h2 id="how-title" className={`${serif} text-[1.75rem] leading-8 text-slate-900`}>
                  How a school is entered
                </h2>
                <ol className="mt-8 space-y-8">
                  {STEPS.map(([title, text], i) => (
                    <li
                      key={title}
                      className="grid grid-cols-[2rem_1fr] items-baseline gap-x-3 leading-8"
                    >
                      <span className="font-mono text-sm font-semibold text-emerald-800 tabular-nums">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-[17px] font-bold text-slate-900">{title}</span>
                        <span className="block max-w-[38rem] text-[15px] text-slate-700">
                          {text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            }
            right={
              <>
                <h2 className={`${serif} text-[1.75rem] leading-8 text-slate-900`}>
                  What the register never allows
                </h2>
                <ul className="mt-8">
                  {NEVER.map((line) => (
                    <li key={line} className="flex gap-3 text-[15px] leading-8 text-slate-800">
                      <Lock className="mt-2 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            }
          />

          <Spread
            id="questions"
            labelledBy="questions-title"
            left={
              <div className="lg:sticky lg:top-16">
                <h2
                  id="questions-title"
                  className={`${serif} text-[1.75rem] leading-8 text-slate-900`}
                >
                  What principals ask before they register
                </h2>
                <p className="mt-8 max-w-md text-[15px] leading-8 text-slate-700">
                  Short answers about payments, corrections and who sees what. Open the index above
                  to see the records themselves.
                </p>
              </div>
            }
            right={<FaqAccordion items={FAQS} defaultOpen={[0]} className={faqOnRules} />}
          />

          <Spread
            labelledBy="close-title"
            left={
              <>
                <h2
                  ref={closeRef}
                  id="close-title"
                  className={`${serif} max-w-[14ch] text-4xl leading-[1.08] font-bold text-balance text-slate-900 sm:text-5xl lg:mt-16`}
                >
                  Your school&apos;s register starts on the next page.
                </h2>
                <Actions
                  signedIn={signedIn}
                  registerHref={registerHref}
                  destination={destination}
                />
              </>
            }
            right={
              <div aria-hidden="true" className="select-none">
                <div className="flex h-8 items-baseline justify-between gap-4">
                  <p className={`${serif} text-2xl text-slate-600 italic`}>Your school</p>
                  <p className="font-mono text-xs text-slate-500">vii · p. 1</p>
                </div>
                <div className="mt-8 grid h-8 grid-cols-[3rem_1fr_6rem] items-center text-[11px] font-bold tracking-[0.06em] text-slate-500 uppercase">
                  <span>Roll</span>
                  <span>Name</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="h-16 lg:h-64" />
              </div>
            }
          />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 px-2 py-8 text-sm text-slate-600">
        <span>© 2026 Academix AI</span>
        <span className="flex gap-6">
          <Link href={destination} className={`rounded-md hover:text-slate-900 ${focusRing}`}>
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
          {!signedIn && (
            <Link href={REGISTER_HREF} className={`rounded-md hover:text-slate-900 ${focusRing}`}>
              Register your school
            </Link>
          )}
        </span>
      </footer>
    </div>
  );
}
