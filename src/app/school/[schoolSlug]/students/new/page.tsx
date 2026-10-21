import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
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
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200/40 bg-red-50 p-6 text-center shadow-lg">
          <h2 className="mb-2 text-xl font-bold text-red-700">Access Denied</h2>
          <p className="text-xs text-red-600">
            You do not have permission to access {school.name}. Tenant boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  // Authorization check: Only SCHOOL_ADMIN or SUPER_ADMIN can perform admissions
  if (user.role !== "SUPER_ADMIN" && user.role !== "SCHOOL_ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
            <p className="mt-1 text-xs text-slate-500">
              New student admissions and enrollment registration are restricted to School
              Administrators.{" "}
              {user.role === "TEACHER"
                ? "Teachers have read-only access to browse class rosters."
                : "Accountants have read-only access to student billing rolls."}
            </p>
          </div>
          <Link
            href={`/school/${school.slug}/students`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            Return to Student Directory
          </Link>
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
    <div className="space-y-6">
      <StudentNav
        schoolSlug={school.slug}
        schoolName={school.name}
        schoolCode={school.code}
        userRole={user.role}
        currentYear={currentYear}
      />

      <div className="mx-auto w-full max-w-5xl">
        <StudentAdmissionClient
          schoolSlug={school.slug}
          currentYear={currentYear}
          classes={classes}
          sections={sections}
          readinessError={readinessError}
        />
      </div>
    </div>
  );
}
