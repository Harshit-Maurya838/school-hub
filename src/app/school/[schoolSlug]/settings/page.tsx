import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSchoolDetailsReadiness } from "@/lib/school-readiness";
import { SchoolSettingsClient } from "@/components/settings/SchoolSettingsClient";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolSettingsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/settings`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      isActive: true,
      status: true,
    },
  });

  if (!school) {
    notFound();
  }

  // Tenant security boundary check
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

  const readiness = await getSchoolDetailsReadiness(school.id);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-100 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <SchoolSettingsClient
          schoolSlug={school.slug}
          initialSchool={school}
          initialReadiness={readiness}
          userRole={user.role}
        />
      </div>
    </div>
  );
}
