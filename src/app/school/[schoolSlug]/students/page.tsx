import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listStudents } from "@/lib/students";
import { StudentNav } from "@/components/students/StudentNav";
import {
  StudentDirectoryClient,
  StudentListItem,
} from "@/components/students/StudentDirectoryClient";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function StudentsDirectoryPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/students`);
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

  // Fetch filter options and current academic year
  const [academicYears, allClasses, allSections] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, isCurrent: true },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    }),
    prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true },
      orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
    }),
    prisma.section.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, classId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const currentYear = academicYears.find((y) => y.isCurrent) || null;

  let permittedSectionIds: string[] | undefined = undefined;
  let classes = allClasses;
  let sections = allSections;

  if (user.role === "TEACHER") {
    const { getTeacherActiveAssignments } = await import("@/lib/rbac");
    const teacherAssignments = await getTeacherActiveAssignments(
      school.id,
      user.id,
      currentYear?.id
    );

    if (teacherAssignments) {
      permittedSectionIds = teacherAssignments.allPermittedSectionIds;
      sections = allSections.filter((s) => permittedSectionIds!.includes(s.id));
      const permittedClassIds = new Set(sections.map((s) => s.classId));
      classes = allClasses.filter((c) => permittedClassIds.has(c.id));
    } else {
      permittedSectionIds = [];
      classes = [];
      sections = [];
    }
  }

  const initialListResult = await listStudents({
    schoolId: school.id,
    page: 1,
    limit: 10,
    status: "ACTIVE",
    sectionIds: permittedSectionIds,
  });

  const students =
    user.role === "ACCOUNTANT"
      ? initialListResult.students.map((st) => {
          const sanitized = { ...st };
          delete (sanitized as Record<string, unknown>).apaarId;
          return sanitized;
        })
      : initialListResult.students;

  return (
    <div className="space-y-6">
      <StudentNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        userRole={user.role}
        currentYear={currentYear}
      />

      <StudentDirectoryClient
        schoolSlug={school.slug}
        filterOptions={{
          academicYears,
          classes,
          sections,
        }}
        initialStudents={students as unknown as StudentListItem[]}
        initialPagination={initialListResult.pagination}
        userRole={user.role}
      />
    </div>
  );
}
