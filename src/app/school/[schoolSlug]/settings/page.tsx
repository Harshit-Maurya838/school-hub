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

  const readiness = await getSchoolDetailsReadiness(school.id);

  return (
    <div className="space-y-6">
      <SchoolSettingsClient
        schoolSlug={school.slug}
        initialSchool={school}
        initialReadiness={readiness}
        userRole={user.role}
      />
    </div>
  );
}
