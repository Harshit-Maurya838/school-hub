import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Shield, BookOpen, Settings } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAcademicYears } from "@/lib/academics";
import { getAcademicSetupReadiness } from "@/lib/school-readiness";
import { AcademicSessionsClient } from "@/components/academics/AcademicSessionsClient";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AcademicSettingsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/settings/academic`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, code: true, slug: true, isActive: true },
  });

  if (!school) {
    notFound();
  }

  // Cross-tenant protection
  if (user.role !== "SUPER_ADMIN" && user.schoolId !== school.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <h2 className="mb-2 text-base font-extrabold text-rose-700">Access Denied</h2>
          <p className="text-xs text-slate-600">
            You do not have permission to access {school.name}.
          </p>
        </div>
      </div>
    );
  }

  // Role protection: Only School Admins and Super Admins manage academic configuration
  if (user.role !== "SUPER_ADMIN" && user.role !== "SCHOOL_ADMIN") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
            <p className="mt-1 text-xs text-slate-500">
              Academic calendar sessions, terms, and roll-over configuration are restricted to
              School Administrators under Management.
            </p>
          </div>
          <Link
            href={`/school/${school.slug}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [years, readiness] = await Promise.all([
    listAcademicYears(school.id),
    getAcademicSetupReadiness(school.id, school.slug),
  ]);

  const currentYear = years.find((y) => y.isCurrent);

  return (
    <div className="space-y-6">
      {/* Management Header */}
      <header className="space-y-4 border-b border-slate-200/80 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link
                href={`/school/${school.slug}`}
                className="transition-colors hover:text-emerald-700"
              >
                {school.name} ({school.code})
              </Link>
              <span>/</span>
              <span className="text-slate-400">Management</span>
              <span>/</span>
              <span className="text-slate-800">Academic Settings</span>
            </div>
            <h1 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Academic Settings & Sessions
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Configure academic years, session timelines, start/end dates, and set the current
              active school year
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Session Indicator */}
            {currentYear ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
                </span>
                <span>Active Session: {currentYear.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>No Active Session Set</span>
              </div>
            )}

            <Link
              href={`/school/${school.slug}/academics`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              <span>Go to Class & Subjects</span>
            </Link>

            <Link
              href={`/school/${school.slug}/settings`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span>School Settings</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Sessions & Year Configuration */}
      <main>
        <AcademicSessionsClient
          schoolSlug={school.slug}
          initialYears={years}
          canCreate={readiness.summary.canConfigureAcademicYears}
          blockedReason={readiness.steps.academicYear.message}
          actionUrl={readiness.steps.academicYear.actionUrl}
          actionLabel={readiness.steps.academicYear.actionLabel}
        />
      </main>
    </div>
  );
}
