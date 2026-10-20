import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcademicNav } from "@/components/academics/AcademicNav";
import { AcademicSectionsClient } from "@/components/academics/AcademicSectionsClient";
import { listSections } from "@/lib/academics";
import { getAcademicSetupReadiness } from "@/lib/school-readiness";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
  searchParams?: Promise<{
    classId?: string;
  }>;
}

export default async function AcademicSectionsPage({ params, searchParams }: PageProps) {
  const { schoolSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const classIdParam = resolvedSearchParams?.classId;

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/academics/sections`);
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-xl border border-red-800 bg-red-950/40 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-sm text-zinc-300">
            You do not have permission to access {school.name}.
          </p>
        </div>
      </div>
    );
  }

  const [sections, classes, readiness] = await Promise.all([
    listSections(school.id),
    prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true },
      orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
    }),
    getAcademicSetupReadiness(school.id, school.slug),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-100 sm:p-8">
      <div className="mx-auto max-w-7xl">
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
          <AcademicSectionsClient
            schoolSlug={school.slug}
            initialSections={sections}
            classes={classes}
            preselectedClassId={classIdParam}
            canCreate={readiness.summary.canCreateSections}
            blockedReason={readiness.steps.sections.message}
            actionUrl={readiness.steps.sections.actionUrl}
            actionLabel={readiness.steps.sections.actionLabel}
          />
        </main>
      </div>
    </div>
  );
}
