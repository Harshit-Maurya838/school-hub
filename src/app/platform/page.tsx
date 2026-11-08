import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Clock, GraduationCap, Plus, Users } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/common/Badge";
import { StatCard } from "@/components/common/StatCard";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { PlatformRegistrationsRoster, PlatformSchoolsTable } from "@/modules/onboarding";

export const metadata: Metadata = {
  title: "Platform Administration",
  description:
    "Super Administrator console for managing educational institutions and onboarding applications on Classic Giga.",
};

const REGISTRATION_LIMIT = 20;

export default async function PlatformPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const [schools, registrations, pendingCount] = await Promise.all([
    prisma.school.findMany({
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
    }),
    prisma.schoolRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: REGISTRATION_LIMIT,
      include: {
        school: {
          select: {
            slug: true,
          },
        },
      },
    }),
    prisma.schoolRegistration.count({
      where: { status: { in: ["PENDING_VERIFICATION", "PENDING_REVIEW"] } },
    }),
  ]);

  const serializedRegistrations = registrations.map((r) => ({
    id: r.id,
    schoolName: r.schoolName,
    schoolCode: r.schoolCode,
    desiredSlug: r.desiredSlug,
    adminName: r.adminName,
    adminEmail: r.adminEmail,
    adminPhone: r.adminPhone,
    status: r.status,
    emailVerifiedAt: r.emailVerifiedAt ? r.emailVerifiedAt.toISOString() : null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    rejectionReason: r.rejectionReason,
    schoolId: r.schoolId,
    school: r.school,
    createdAt: r.createdAt.toISOString(),
  }));

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
              Review school registrations, check on provisioned schools, and open any school
              workspace as a platform admin.
            </p>
          </div>
          <Link
            href="/register-school"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Register new school</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <StatCard
            title="Pending registrations"
            value={pendingCount}
            subtitle={
              pendingCount === 0
                ? "Nothing waiting for review"
                : "Awaiting email verification or review"
            }
            icon={Clock}
            variant={pendingCount > 0 ? "alert" : "default"}
          />
        </div>

        <PlatformRegistrationsRoster
          initialRegistrations={serializedRegistrations}
          limit={REGISTRATION_LIMIT}
        />

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
