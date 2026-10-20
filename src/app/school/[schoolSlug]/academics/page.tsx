import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcademicNav } from "@/components/academics/AcademicNav";
import { AcademicHubClient } from "@/components/academics/AcademicHubClient";
import { getAcademicOverview, listAcademicYears } from "@/lib/academics";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AcademicOverviewPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/academics`);
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
            You do not have permission to access {school.name}. Tenant boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  const [overview, recentYears] = await Promise.all([
    getAcademicOverview(school.id, school.slug),
    listAcademicYears(school.id),
  ]);

  return (
    <div className="space-y-6">
      <AcademicNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        currentYear={overview.currentYear}
        userRole={user.role}
        isSchoolDetailsReady={overview.readiness?.schoolDetails.isReady}
        schoolDetailsReason={overview.readiness?.schoolDetails.reason}
      />

      <main>
        <AcademicHubClient schoolSlug={school.slug} overview={overview} recentYears={recentYears} />
      </main>
    </div>
  );
}
