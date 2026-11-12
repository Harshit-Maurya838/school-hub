import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { getSchoolProfile } from "@/modules/onboarding/services/school-profile";
import {
  BOARD_AFFILIATIONS,
  CLASS_RANGES,
  HOS_DESIGNATIONS,
  INSTRUCTION_MEDIUMS,
  RTE_ENTRY_CLASSES,
  RTE_EXIT_CLASSES,
  SCHOOL_STREAMS,
  describeActiveRange,
  formatIndianPhone,
  labelFor,
} from "@/modules/onboarding/services/school-profile-rules";
import { PrintProfileActions } from "@/modules/onboarding/components/PrintProfileActions";

export const metadata: Metadata = {
  title: "School Profile",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ schoolSlug: string }>;
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="grid break-inside-avoid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b border-slate-200 py-2 text-sm">
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className={`text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value ? value : <span className="text-slate-500">Not provided</span>}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="border-b-2 border-emerald-700 pb-1.5 text-base font-bold text-slate-900">
        {title}
      </h2>
      <dl>{children}</dl>
    </section>
  );
}

export default async function PrintSchoolProfilePage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/login?callbackUrl=/print/school-profile/${schoolSlug}`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, slug: true },
  });
  if (!school) notFound();

  const allowed =
    user.role === "SUPER_ADMIN" || (user.role === "SCHOOL_ADMIN" && user.schoolId === school.id);
  if (!allowed) notFound();

  const p = await getSchoolProfile(school.id);
  const a = p.academic;
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const rte = a.rteApplicable
    ? `Yes · ${labelFor(RTE_ENTRY_CLASSES, a.rteEntryClass)} to ${labelFor(RTE_EXIT_CLASSES, a.rteExitClass)}`
    : a.classRange
      ? "No"
      : "";
  const board =
    a.boardAffiliation === "STATE_BOARD" && a.stateBoardName
      ? `State Board (${a.stateBoardName})`
      : labelFor(BOARD_AFFILIATIONS, a.boardAffiliation);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-800 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 16mm; }`}</style>
      <div className="mx-auto max-w-3xl space-y-6">
        <PrintProfileActions backHref={`/school/${school.slug}/settings`} />

        <article className="space-y-7 rounded-2xl border border-slate-200 bg-white p-8 print:rounded-none print:border-0 print:p-0">
          <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {p.identity.name}
              </h1>
              {p.identity.nameHindi && (
                <p lang="hi" className="mt-1 text-lg text-slate-700">
                  {p.identity.nameHindi}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-600">UDISE+ master school profile</p>
            </div>
            <div className="shrink-0 text-right text-xs text-slate-600">
              <p>
                U-DISE code{" "}
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {p.identity.udiseCode || "—"}
                </span>
              </p>
              <p className="mt-1">
                Status:{" "}
                <span className="font-semibold text-slate-900">
                  {p.lock.isLocked
                    ? "Locked"
                    : p.isComplete
                      ? "Complete, not locked"
                      : "Incomplete"}
                </span>
              </p>
              <p className="mt-1">Generated {generatedOn}</p>
            </div>
          </header>

          <Section title="Identity & contact">
            <Row label="Establishment year" value={p.identity.establishmentYear?.toString()} />
            <Row label="Recognition / affiliation no." value={p.identity.recognitionNumber} mono />
            <Row label="Official email" value={p.identity.officialEmail} />
            <Row label="Contact mobile" value={formatIndianPhone(p.identity.contactMobile)} />
            <Row label="Postal address" value={p.identity.postalAddress} />
            <Row label="Platform school code" value={p.school.code} mono />
          </Section>

          <Section title="Academic & operational setup">
            <Row
              label="Medium of instruction"
              value={labelFor(INSTRUCTION_MEDIUMS, a.instructionMedium)}
            />
            <Row label="Recognised class range" value={labelFor(CLASS_RANGES, a.classRange)} />
            <Row
              label="Active class structure"
              value={describeActiveRange(a.classRange, a.includesPrePrimary)}
            />
            <Row label="RTE applicable" value={rte} />
            <Row label="Board affiliation" value={board} />
            <Row
              label="Streams (Class 11–12)"
              value={
                a.streams.map((s) => labelFor(SCHOOL_STREAMS, s)).join(", ") ||
                (a.classRange ? "Not applicable" : "")
              }
            />
          </Section>

          <Section title="Head of school & leadership">
            <Row
              label="HOS designation"
              value={labelFor(HOS_DESIGNATIONS, p.leadership.hosDesignation)}
            />
            <Row label="HOS name" value={p.leadership.hosName} />
            <Row label="HOS mobile" value={formatIndianPhone(p.leadership.hosMobile)} />
            <Row label="HOS email" value={p.leadership.hosEmail} />
            <Row label="Owner / manager" value={p.leadership.managementName} />
            <Row label="Management phone" value={formatIndianPhone(p.leadership.managementPhone)} />
          </Section>

          {p.lock.isLocked && p.lock.lockedAt && (
            <p className="text-xs text-slate-600">
              Locked
              {p.lock.lockedByName ? ` by ${p.lock.lockedByName}` : ""} on{" "}
              {new Date(p.lock.lockedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
