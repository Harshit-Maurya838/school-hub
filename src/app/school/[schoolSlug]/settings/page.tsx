import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { getAuthenticatedUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { getSchoolDetailsReadiness } from "@/modules/onboarding";
import { getSchoolProfile } from "@/modules/onboarding/services/school-profile";
import { SchoolSettingsClient } from "@/modules/onboarding";
import { primaryButtonClass } from "@/components/common/FormControls";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolSettingsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/auth?callbackUrl=/school/${schoolSlug}/settings`);
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

  // Authorization check: Only School Admins and Super Admins manage settings
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
              School configuration, institutional profile, and readiness validation are restricted
              to School Administrators.
            </p>
          </div>
          <Link href={`/school/${school.slug}`} className={`${primaryButtonClass} w-full`}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [readiness, profile] = await Promise.all([
    getSchoolDetailsReadiness(school.id),
    getSchoolProfile(school.id),
  ]);
  const canEdit = user.role === "SCHOOL_ADMIN" && user.schoolId === school.id;
  const canLock = canEdit || user.role === "SUPER_ADMIN";

  return (
    <SchoolSettingsClient
      schoolSlug={school.slug}
      initialSchool={school}
      initialReadiness={readiness}
      initialProfile={profile}
      canEdit={canEdit}
      canLock={canLock}
    />
  );
}
