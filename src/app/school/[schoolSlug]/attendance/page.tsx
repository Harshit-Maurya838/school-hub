import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";

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
            You do not have permission to view attendance for this school.
          </p>
        </div>
      </div>
    );
  }

  // Find active academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });

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

  const formattedClasses = classes.map((c) => {
    const allEnrollments = c.sections.flatMap((s) => s.enrollments);
    return {
      id: c.id,
      name: c.name,
      section: c.sections.map((s) => s.name).join(", ") || "All",
      sectionsCount: c.sections.length,
      studentCount: allEnrollments.length,
      students: allEnrollments.map((e) => ({
        id: e.student.id,
        name: e.student.name,
        admissionNo: e.student.admissionNumber,
        gender: e.student.gender,
        rollNumber: e.rollNumber || undefined,
      })),
    };
  });

  return (
    <AttendanceClient
      schoolSlug={school.slug}
      schoolName={school.name}
      userRole={user.role}
      classes={formattedClasses}
      currentSession={activeYear?.name || "2026-27"}
    />
  );
}
