import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, GraduationCap, Users } from "lucide-react";
import { getAuthenticatedUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/common/Badge";
import { StatCard } from "@/components/common/StatCard";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { PlatformSchoolsTable } from "@/modules/onboarding";

export const metadata: Metadata = {
  title: "Platform Administration",
  description:
    "Super Administrator console for managing educational institutions and registered schools on Classic Giga.",
};

export default async function PlatformPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, students: true },
      },
      profile: {
        select: {
          isLocked: true,
          lockedAt: true,
          identityCompletedAt: true,
          academicCompletedAt: true,
          leadershipCompletedAt: true,
        },
      },
    },
  });

  const schoolRows = schools.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    slug: s.slug,
    status: s.status,
    staffCount: s._count.users,
    studentCount: s._count.students,
    profile: {
      isComplete: Boolean(
        s.profile?.identityCompletedAt &&
        s.profile.academicCompletedAt &&
        s.profile.leadershipCompletedAt
      ),
      isLocked: s.profile?.isLocked ?? false,
      lockedAt: s.profile?.lockedAt?.toISOString() ?? null,
    },
  }));

  const activeSchools = schools.filter((s) => s.status === "ACTIVE").length;
  const totalStudents = schools.reduce((acc, s) => acc + s._count.students, 0);
  const totalStaff = schools.reduce((acc, s) => acc + s._count.users, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
      <PlatformHeader
        userName={user.name || "Platform Admin"}
        userEmail={user.email || ""}
        userRole={user.role}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Platform administration
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Check on registered schools, and open any school workspace as a platform admin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Schools"
            value={schools.length}
            subtitle={`${activeSchools} active`}
            icon={Building2}
          />
          <StatCard
            title="Students enrolled"
            value={totalStudents}
            subtitle="Across all schools"
            icon={GraduationCap}
          />
          <StatCard
            title="Staff accounts"
            value={totalStaff}
            subtitle="Admins, teachers and accountants"
            icon={Users}
          />
        </div>

        <section
          aria-labelledby="schools-heading"
          className="shadow-card overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 id="schools-heading" className="text-lg font-bold text-slate-900">
                Schools
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Open a school&apos;s workspace, or lock and unlock its school profile for editing.
              </p>
            </div>
            <Badge
              variant={activeSchools > 0 ? "emerald" : "default"}
              className="self-start sm:self-auto"
            >
              {activeSchools} of {schools.length} active
            </Badge>
          </div>

          <PlatformSchoolsTable initialSchools={schoolRows} />
        </section>
      </main>
    </div>
  );
}
