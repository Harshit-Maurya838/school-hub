import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcademicNav } from "@/components/academics/AcademicNav";
import { AcademicSubjectsClient } from "@/components/academics/AcademicSubjectsClient";
import { listSubjects } from "@/lib/academics";
import { getAcademicSetupReadiness } from "@/lib/school-readiness";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AcademicSubjectsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/academics/subjects`);
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

  const [subjects, classes, readiness] = await Promise.all([
    listSubjects(school.id),
    prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true },
      orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
    }),
    getAcademicSetupReadiness(school.id, school.slug),
  ]);

  return (
    <div className="space-y-6">
      <AcademicNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        currentYear={readiness.summary.currentAcademicYear}
        userRole={user.role}
        isSchoolDetailsReady={readiness.schoolDetails.isReady}
        schoolDetailsReason={readiness.schoolDetails.reason}
      />

      <main>
        <AcademicSubjectsClient
          schoolSlug={school.slug}
          initialSubjects={subjects}
          classes={classes}
          canCreate={readiness.summary.canCreateSubjects}
          blockedReason={readiness.steps.subjects.message}
          actionUrl={readiness.steps.subjects.actionUrl}
          actionLabel={readiness.steps.subjects.actionLabel}
        />
      </main>
    </div>
  );
}
