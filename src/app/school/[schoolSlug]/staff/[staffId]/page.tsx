import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertTeacherAccess } from "@/lib/rbac";
import { getTeacherProfile } from "@/lib/teachers";
import { TeacherProfileClient } from "@/components/staff/TeacherProfileClient";
import { Shield } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{
    schoolSlug: string;
    staffId: string;
  }>;
}

export default async function TeacherProfilePage({ params }: Props) {
  const { schoolSlug, staffId } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/staff/${staffId}`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true, code: true },
  });

  if (!school) {
    notFound();
  }

  // Cross-tenant security check
  if (user.role !== "SUPER_ADMIN" && user.schoolId !== school.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <h2 className="mb-2 text-base font-extrabold text-rose-700">Access Denied</h2>
          <p className="text-xs text-slate-600">
            You do not have permission to view personnel profiles for this school.
          </p>
        </div>
      </div>
    );
  }

  // Teacher resource boundary check:
  // Administrators can view all. Teachers can only view their own profile.
  try {
    await assertTeacherAccess(user, staffId);
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
            <p className="mt-1 text-xs text-slate-500">
              You are only permitted to access your own faculty profile and assigned teaching courses.
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

  let teacher;
  try {
    teacher = await getTeacherProfile(school.id, staffId);
  } catch {
    notFound();
  }

  const canEdit = user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN";

  return (
    <div className="space-y-6">
      <TeacherProfileClient
        schoolSlug={school.slug}
        initialTeacher={teacher}
        userRole={user.role}
        canEdit={canEdit}
      />
    </div>
  );
}
