import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import { getTeacherActiveAssignments } from "@/lib/rbac";
import { Shield, BookOpen } from "lucide-react";

interface AttendancePageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AttendancePage({ params }: AttendancePageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/attendance`);
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
            You do not have permission to view attendance for this school. Tenant boundary violation
            detected.
          </p>
        </div>
      </div>
    );
  }

  // Deny Accountant from accessing student attendance registers
  if (user.role === "ACCOUNTANT") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Attendance Access Restricted</h2>
            <p className="mt-1 text-xs text-slate-500">
              Student daily attendance registers and classroom logs are restricted to Academic
              Faculty and School Administrators. Please use the Fees Management Desk.
            </p>
          </div>
          <Link
            href={`/school/${school.slug}/fees`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-amber-700 py-2.5 text-xs font-bold text-white transition-colors hover:bg-amber-800"
          >
            Open Fees Management Desk
          </Link>
        </div>
      </div>
    );
  }

  // Find active academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });

  // For TEACHER role: Resolve active teaching assignments
  let permittedSectionIds: Set<string> | null = null;
  let classTeacherSectionIds: Set<string> | null = null;

  if (user.role === "TEACHER") {
    const teacherAssignments = await getTeacherActiveAssignments(
      school.id,
      user.id,
      activeYear?.id
    );

    if (!teacherAssignments || teacherAssignments.allPermittedSectionIds.length === 0) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">No Assigned Classes</h2>
              <p className="mt-1 text-xs text-slate-500">
                You do not have any active class-teacher or subject-teacher assignments for session{" "}
                {activeYear?.name || "current"}. Contact your School Administrator to allocate class
                responsibilities.
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

    permittedSectionIds = new Set(teacherAssignments.allPermittedSectionIds);
    classTeacherSectionIds = new Set(teacherAssignments.classTeacherSectionIds);
  }

  // Fetch classes with section and enrolled student details
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    include: {
      sections: {
        select: {
          id: true,
          name: true,
          enrollments: {
            where: {
              ...(activeYear ? { academicYearId: activeYear.id } : {}),
              status: "ACTIVE",
            },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  admissionNumber: true,
                  gender: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
  });

  // Filter sections and classes according to permitted assignments if user is TEACHER
  const filteredClasses = classes
    .map((c) => {
      const allowedSections = permittedSectionIds
        ? c.sections.filter((s) => permittedSectionIds!.has(s.id))
        : c.sections;

      return {
        ...c,
        sections: allowedSections,
      };
    })
    .filter((c) => c.sections.length > 0);

  const sectionsList = filteredClasses.flatMap((c) =>
    c.sections.map((s) => ({
      sectionId: s.id,
      sectionName: s.name,
      classId: c.id,
      className: c.name,
      displayName: `${c.name} - ${s.name}`,
      studentCount: s.enrollments.length,
      isClassTeacher:
        classTeacherSectionIds?.has(s.id) ??
        (user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN"),
    }))
  );

  const defaultSection = sectionsList.find((s) => s.isClassTeacher) || sectionsList[0] || null;

  return (
    <AttendanceClient
      schoolSlug={school.slug}
      schoolName={school.name}
      userRole={user.role}
      currentSession={activeYear?.name || "2026-27"}
      academicYearId={activeYear?.id}
      sections={sectionsList}
      defaultSectionId={defaultSection?.sectionId}
      initialDate={new Date().toISOString().slice(0, 10)}
    />
  );
}
