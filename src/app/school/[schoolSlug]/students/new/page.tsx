import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentNav } from "@/components/students/StudentNav";
import { StudentAdmissionClient } from "@/components/students/StudentAdmissionClient";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function NewStudentAdmissionPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/students/new`);
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

  // Authorization check: Only SCHOOL_ADMIN or SUPER_ADMIN can perform admissions
  if (user.role !== "SUPER_ADMIN" && user.role !== "SCHOOL_ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Permission Required</h2>
          <p className="text-sm text-zinc-400">
            Only school administrators can admit and enroll new students.
          </p>
        </div>
      </div>
    );
  }

  // Fetch current academic year, classes, and sections with enrollments count
  const [currentYear, classes, sections] = await Promise.all([
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
      select: {
        id: true,
        name: true,
        classId: true,
        capacity: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  let readinessError: string | null = null;
  if (!currentYear) {
    readinessError =
      "An active academic year is required before admitting students. Please configure an academic session.";
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-6 font-sans text-zinc-100 md:p-8">
      <StudentNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        userRole={user.role}
        currentYear={currentYear}
      />

      <main className="mx-auto w-full max-w-5xl flex-1">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">New Student Admission</h2>
          <p className="text-xs text-zinc-400">
            Admit a student, link guardian records, and allocate to a class and section for the
            active session.
          </p>
        </div>

        <StudentAdmissionClient
          schoolSlug={school.slug}
          currentYear={currentYear}
          classes={classes}
          sections={sections}
          readinessError={readinessError}
        />
      </main>
    </div>
  );
}
