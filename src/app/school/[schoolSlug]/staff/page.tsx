import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherDirectory } from "@/lib/teachers";
import { InviteStaffButton } from "./invite-staff-button";
import { InvitationsList } from "./invitations-list";
import {
  Users,
  Shield,
  GraduationCap,
  BookOpen,
  UserCheck,
  ChevronRight,
} from "lucide-react";

interface StaffPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolStaffPage({ params }: StaffPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/staff`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
    },
  });

  if (!school) {
    notFound();
  }

  if (user.role !== "SUPER_ADMIN" && user.schoolId !== school.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <h2 className="mb-2 text-base font-extrabold text-rose-700">Access Denied</h2>
          <p className="text-xs text-slate-600">
            You do not have permission to view staff for this school.
          </p>
        </div>
      </div>
    );
  }

  // Authorization check: Staff management and directory is restricted to School & Platform Administrators
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
              Staff directory, role assignments, and team member invitations are restricted to School Administrators.
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

  // Active academic year for assignment stats
  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
    select: { id: true, name: true },
  });

  // Fetch teaching faculty directory with workload and assignments
  const [teachersList, staffMembers, rawInvitations, totalSubjectAssignments, totalClassTeachers] =
    await Promise.all([
      getTeacherDirectory(school.id, currentYear?.id),
      prisma.user.findMany({
        where: {
          schoolId: school.id,
          role: { in: ["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"] },
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.invitation.findMany({
        where: {
          schoolId: school.id,
          role: { in: ["TEACHER", "ACCOUNTANT"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      currentYear
        ? prisma.subjectTeacherAssignment.count({
            where: { schoolId: school.id, academicYearId: currentYear.id, status: "ACTIVE" },
          })
        : 0,
      currentYear
        ? prisma.classTeacherAssignment.count({
            where: { schoolId: school.id, academicYearId: currentYear.id, status: "ACTIVE" },
          })
        : 0,
    ]);

  const teacherMap = new Map(teachersList.map((t) => [t.userId, t]));

  const invitations = rawInvitations.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${school.slug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {school.name} ({school.code})
            </Link>
            <span>/</span>
            <span className="text-slate-800">Staff</span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Staff & Faculty Directory
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Manage teaching faculty, class teachers, subject allocations, and staff invitations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>{user.role}</span>
          </div>

          <InviteStaffButton schoolSlug={school.slug} />
        </div>
      </div>

      {/* CampusPulse Faculty Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Total Personnel
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{staffMembers.length}</p>
          <p className="mt-1 text-xs text-slate-400">Active authorized accounts</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Teaching Faculty
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700">{teachersList.length}</p>
          <p className="mt-1 text-xs text-slate-400">Instructors & educators</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Class Teachers
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{totalClassTeachers}</p>
          <p className="mt-1 text-xs text-slate-400">
            Assigned for {currentYear?.name || "session"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Subject Allocations
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-700">{totalSubjectAssignments}</p>
          <p className="mt-1 text-xs text-slate-400">Active course sections</p>
        </div>
      </div>

      {/* Staff & Faculty Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Staff & Faculty Roster ({staffMembers.length})
            </h3>
            <p className="text-xs text-slate-400">
              Instructors, administrators, and financial staff with assigned duties
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {currentYear?.name || "All Sessions"}
          </span>
        </div>

        {staffMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-xs text-slate-500">No active staff members yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Personnel Member</th>
                  <th className="px-5 py-3.5">Role / Position</th>
                  <th className="px-5 py-3.5">Class Teacher Role</th>
                  <th className="px-5 py-3.5 text-center">Subjects Taught</th>
                  <th className="px-5 py-3.5 text-center">Workload</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {staffMembers.map((member) => {
                  const teacherInfo = teacherMap.get(member.id);
                  const isTeacher = member.role === "TEACHER";

                  return (
                    <tr
                      key={member.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-xs font-black text-emerald-800">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {member.name}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                              member.role === "SCHOOL_ADMIN"
                                ? "bg-emerald-100 text-emerald-800"
                                : member.role === "TEACHER"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {member.role}
                          </span>
                          {teacherInfo?.designation && (
                            <p className="text-[11px] text-slate-500 font-semibold">
                              {teacherInfo.designation}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isTeacher ? (
                          teacherInfo?.classTeacherFor ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              <span>
                                {teacherInfo.classTeacherFor.className} - Section{" "}
                                {teacherInfo.classTeacherFor.sectionName}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Assigned</span>
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {isTeacher ? (
                          <span className="font-bold text-slate-800">
                            {teacherInfo?.subjectsCount || 0} Subjects
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {isTeacher && teacherInfo ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              teacherInfo.workloadStatus === "HIGH"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : teacherInfo.workloadStatus === "NORMAL"
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {teacherInfo.sectionsCount} Sections (
                            {teacherInfo.workloadStatus})
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isTeacher && (
                          <Link
                            href={`/school/${school.slug}/staff/${member.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-slate-50 hover:text-emerald-800"
                          >
                            <span>Profile & Load</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Staff Invitations */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Pending & Past Invitations ({invitations.length})
            </h3>
            <p className="text-xs text-slate-400">
              Active invitation links for prospective instructors and accountants
            </p>
          </div>
          <InviteStaffButton schoolSlug={school.slug} />
        </div>
        <div className="p-5">
          <InvitationsList schoolSlug={school.slug} initialInvitations={invitations} />
        </div>
      </section>
    </div>
  );
}
