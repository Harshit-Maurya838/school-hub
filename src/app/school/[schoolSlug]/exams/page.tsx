import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamClient } from "@/components/exams/ExamClient";
import { getTeacherActiveAssignments } from "@/lib/rbac";
import { Shield, BookOpen } from "lucide-react";

interface ExamPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function ExamPage({ params }: ExamPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/exams`);
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
            You do not have permission to view examinations for this school. Tenant boundary
            violation detected.
          </p>
        </div>
      </div>
    );
  }

  // Deny Accountant from accessing examinations and marks entry
  if (user.role === "ACCOUNTANT") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Examinations Access Restricted</h2>
            <p className="mt-1 text-xs text-slate-500">
              Examination configuration, marks rosters, and student grading registries are
              restricted to Academic Faculty and School Administrators. Please use the Fees
              Management Desk.
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

  const allAcademicYears = await prisma.academicYear.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  });

  // Fetch classes and subjects for configuration
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    include: {
      sections: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
      subjects: {
        select: { id: true, name: true, code: true, classId: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { numericOrder: "asc" },
  });

  // If TEACHER role, check active teaching assignments
  let teacherAssignedSectionIds: string[] = [];
  if (user.role === "TEACHER") {
    const teacherAssignments = await getTeacherActiveAssignments(
      school.id,
      user.id,
      activeYear?.id
    );

    if (!teacherAssignments || teacherAssignments.subjectAssignments.length === 0) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">No Subject Assignments Found</h2>
              <p className="mt-1 text-xs text-slate-500">
                You do not have any active subject-teacher assignments for the current academic
                session ({activeYear?.name || "None"}). Marks entry requires an active subject
                allocation by the School Administrator.
              </p>
            </div>
            <Link
              href={`/school/${school.slug}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
            >
              Return to Faculty Dashboard
            </Link>
          </div>
        </div>
      );
    }

    teacherAssignedSectionIds = teacherAssignments.subjectSectionIds;
  }

  return (
    <ExamClient
      schoolSlug={school.slug}
      schoolName={school.name}
      userRole={user.role}
      userId={user.id}
      activeAcademicYear={activeYear ? { id: activeYear.id, name: activeYear.name } : null}
      allAcademicYears={allAcademicYears}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        sections: c.sections,
        subjects: c.subjects,
      }))}
      teacherAssignedSectionIds={teacherAssignedSectionIds}
    />
  );
}
