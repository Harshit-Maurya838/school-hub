import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcademicNav } from "@/components/academics/AcademicNav";
import { AcademicSessionsClient } from "@/components/academics/AcademicSessionsClient";
import { listAcademicYears } from "@/lib/academics";

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

  const years = await listAcademicYears(school.id);
  const currentYear = years.find((y) => y.isCurrent);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-100 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <AcademicNav
          schoolSlug={school.slug}
          schoolName={school.name}
          schoolCode={school.code}
          currentYear={currentYear}
          userRole={user.role}
        />

        <main>
          <AcademicSessionsClient schoolSlug={school.slug} initialYears={years} />
        </main>
      </div>
    </div>
  );
}
