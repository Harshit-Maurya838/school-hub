import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertParentStudentAccess, assertStudentOwnAccess } from "@/lib/rbac";
import { getStudentById } from "@/lib/students";
import { StudentNav } from "@/components/students/StudentNav";
import { StudentDetail, StudentProfileClient } from "@/components/students/StudentProfileClient";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
    studentId: string;
  }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { schoolSlug, studentId } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/students/${studentId}`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      isActive: true,
    },
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
            You do not have permission to access {school.name}. Tenant boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  // Resource-level check for PARENT or STUDENT roles
  if (user.role === "PARENT") {
    await assertParentStudentAccess(user, studentId);
  } else if (user.role === "STUDENT") {
    await assertStudentOwnAccess(user, studentId);
  }

  // Fetch student, available classes, sections, and years
  const [student, currentYear, availableClasses, availableSections, availableYears] =
    await Promise.all([
      getStudentById(school.id, studentId),
      prisma.academicYear.findFirst({
        where: { schoolId: school.id, isCurrent: true },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true },
        orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
      }),
      prisma.section.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true, classId: true, capacity: true },
        orderBy: { name: "asc" },
      }),
      prisma.academicYear.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true, isCurrent: true },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      }),
    ]);

  if (!student) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <StudentNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        userRole={user.role}
        currentYear={currentYear}
      />

      <div className="mx-auto w-full max-w-6xl">
        <StudentProfileClient
          schoolSlug={school.slug}
          initialStudent={student as unknown as StudentDetail}
          availableClasses={availableClasses}
          availableSections={availableSections}
          availableYears={availableYears}
          userRole={user.role}
        />
      </div>
    </div>
  );
}
