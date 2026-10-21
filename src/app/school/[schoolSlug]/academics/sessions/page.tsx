import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcademicNav } from "@/components/academics/AcademicNav";
import { AcademicSessionsClient } from "@/components/academics/AcademicSessionsClient";
import { listAcademicYears } from "@/lib/academics";
import { getAcademicSetupReadiness } from "@/lib/school-readiness";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AcademicSessionsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/academics/sessions`);
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

  // Role protection: Only School Admins configure academic calendar sessions
  if (user.role !== "SUPER_ADMIN" && user.role !== "SCHOOL_ADMIN") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
            <p className="mt-1 text-xs text-slate-500">
              Academic calendar sessions and roll-over configuration are restricted to School
              Administrators.
            </p>
          </div>
          <Link
            href={`/school/${school.slug}/academics`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            Return to Curriculum Overview
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
      <AcademicNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        currentYear={currentYear}
        userRole={user.role}
        isSchoolDetailsReady={readiness.schoolDetails.isReady}
        schoolDetailsReason={readiness.schoolDetails.reason}
      />

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
