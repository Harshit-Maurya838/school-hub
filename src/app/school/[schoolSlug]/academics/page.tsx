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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-xl border border-red-800 bg-red-950/40 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-sm text-zinc-300">
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
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-100 sm:p-8">
      <div className="mx-auto max-w-7xl">
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
          <AcademicHubClient
            schoolSlug={school.slug}
            overview={overview}
            recentYears={recentYears}
          />
        </main>
      </div>
    </div>
  );
}
