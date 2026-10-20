import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Users,
  IndianRupee,
  CalendarCheck2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAcademicSetupReadiness } from "@/lib/school-readiness";
import { StatCard } from "@/components/common/StatCard";
import {
  EnrollmentDistributionChart,
  ClassEnrollmentData,
} from "@/components/dashboard/EnrollmentDistributionChart";
import {
  DashboardActivityCard,
  ReminderItem,
  BirthdayItem,
} from "@/components/dashboard/DashboardActivityCard";
import { DashboardClassList, ClassSummaryItem } from "@/components/dashboard/DashboardClassList";

interface SchoolPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolSlugPage({ params }: SchoolPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}`);
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
        <div className="max-w-md rounded-2xl border border-red-200/40 bg-red-50 p-6 text-center shadow-lg">
          <h2 className="mb-2 text-xl font-bold text-red-700">Access Denied</h2>
          <p className="text-xs text-red-600">
            You do not have permission to access {school.name}. Tenant boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  // Fetch real data concurrently
  const [totalStudents, boysCount, girlsCount, classesData, readiness, studentsForBirthdays] =
    await Promise.all([
      prisma.student.count({
        where: { schoolId: school.id, deletedAt: null, isActive: true },
      }),
      prisma.student.count({
        where: { schoolId: school.id, deletedAt: null, isActive: true, gender: "MALE" },
      }),
      prisma.student.count({
        where: { schoolId: school.id, deletedAt: null, isActive: true, gender: "FEMALE" },
      }),
      prisma.class.findMany({
        where: { schoolId: school.id },
        select: {
          id: true,
          name: true,
          numericOrder: true,
          sections: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { enrollments: true },
              },
            },
          },
          _count: {
            select: {
              sections: true,
              subjects: true,
            },
          },
        },
        orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
      }),
      getAcademicSetupReadiness(school.id, school.slug),
      prisma.student.findMany({
        where: { schoolId: school.id, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          dob: true,
          enrollments: {
            where: { status: "ACTIVE" },
            take: 1,
            select: {
              section: {
                select: {
                  name: true,
                  class: { select: { name: true } },
                },
              },
            },
          },
        },
        take: 60,
      }),
    ]);

  // Aggregate classes and enrollment numbers
  const classSummaryList: ClassSummaryItem[] = classesData.map((cls) => {
    const studentsInClass = cls.sections.reduce(
      (sum, sec) => sum + (sec._count?.enrollments || 0),
      0
    );
    return {
      id: cls.id,
      name: cls.name,
      sectionsCount: cls._count.sections,
      subjectsCount: cls._count.subjects,
      studentsCount: studentsInClass,
    };
  });

  const chartData: ClassEnrollmentData[] = classSummaryList.map((cls) => ({
    className: cls.name,
    enrolledStudents: cls.studentsCount,
    sectionsCount: cls.sectionsCount,
  }));

  // Build real reminders list from readiness steps
  const reminders: ReminderItem[] = [];

  const isTeacher = user.role === "TEACHER";
  const isAccountant = user.role === "ACCOUNTANT";
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN";

  if (isAdmin) {
    if (!readiness.schoolDetails.isReady) {
      reminders.push({
        id: "school-profile",
        title: "School Profile Setup Required",
        description:
          readiness.schoolDetails.reason ||
          "Complete official school details and admin verification.",
        priority: "high",
        actionUrl: `/school/${school.slug}/settings`,
        actionLabel: "Complete Profile",
      });
    }

    if (!readiness.summary.currentAcademicYear) {
      reminders.push({
        id: "academic-year",
        title: "Active Academic Year Missing",
        description: "Configure and set an active academic calendar session.",
        priority: "high",
        actionUrl: `/school/${school.slug}/academics/sessions`,
        actionLabel: "Configure Year",
      });
    }

    if (readiness.summary.counts.classes === 0) {
      reminders.push({
        id: "classes",
        title: "Create Class Cohorts",
        description: "Define standard classes (e.g. Nursery, Class 1-10).",
        priority: "normal",
        actionUrl: `/school/${school.slug}/academics/classes`,
        actionLabel: "Add Classes",
      });
    } else if (readiness.summary.counts.sections === 0) {
      reminders.push({
        id: "sections",
        title: "Create Section Divisions",
        description: "Add sections with seating capacity for student enrollment.",
        priority: "normal",
        actionUrl: `/school/${school.slug}/academics/sections`,
        actionLabel: "Add Sections",
      });
    }
  } else if (isTeacher) {
    reminders.push({
      id: "teacher-attendance",
      title: "Daily Attendance Verification",
      description: "Mark or verify daily student attendance register for your assigned classes.",
      priority: "high",
      actionUrl: `/school/${school.slug}/attendance`,
      actionLabel: "Open Register",
    });
  } else if (isAccountant) {
    reminders.push({
      id: "accountant-fees",
      title: "Student Fee Roll Review",
      description: "Review active enrolled student rosters and prepare term fee demand schedules.",
      priority: "high",
      actionUrl: `/school/${school.slug}/fees`,
      actionLabel: "Open Fees",
    });
  }

  // Filter real student birthdays in current month
  const currentMonth = new Date().getMonth();
  const birthdays: BirthdayItem[] = studentsForBirthdays
    .filter((st) => {
      const bMonth = new Date(st.dob).getMonth();
      return bMonth === currentMonth;
    })
    .slice(0, 5)
    .map((st) => {
      const d = new Date(st.dob);
      const dobFormatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const sec = st.enrollments[0]?.section;
      const classInfo = sec ? `${sec.class.name} (${sec.name})` : undefined;
      return {
        id: st.id,
        name: st.name,
        dobFormatted,
        className: classInfo,
      };
    });

  const sessionName = readiness.summary.currentAcademicYear?.name || "No Active Session";

  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      {/* 1. Role-specific Welcome / Action Banner */}
      {user.role === "SUPER_ADMIN" ? (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-700" />
                <h2 className="text-sm font-bold text-purple-950">
                  Platform Admin Mode • Viewing {school.name}
                </h2>
              </div>
              <p className="text-xs text-purple-800">
                You are operating with Super Administrator platform credentials. You can inspect
                and manage all tenant records.
              </p>
            </div>
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800"
            >
              <span>Platform Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : isTeacher ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-blue-700" />
                <h2 className="text-sm font-bold text-blue-950">
                  Teacher Desk • Welcome back, {user.name}
                </h2>
              </div>
              <p className="text-xs text-blue-800">
                Manage today&apos;s physical attendance register, view student rosters, and check
                upcoming birthdays.
              </p>
            </div>
            <Link
              href={`/school/${school.slug}/attendance`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-800"
            >
              <span>Take Daily Attendance</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : isAccountant ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-amber-700" />
                <h2 className="text-sm font-bold text-amber-950">
                  Accounts & Finance Desk • Welcome, {user.name}
                </h2>
              </div>
              <p className="text-xs text-amber-800">
                Cross-reference student admission rosters, parent contacts, and fee ledger
                structures.
              </p>
            </div>
            <Link
              href={`/school/${school.slug}/fees`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-800"
            >
              <span>Open Fees Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : !readiness.schoolDetails.isReady ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-900">
                  Action Required: School Profile Incomplete
                </h2>
              </div>
              <p className="text-xs text-amber-800">
                {readiness.schoolDetails.reason ||
                  "Complete your school profile before configuring the academic year and student rosters."}
              </p>
            </div>
            <Link
              href={`/school/${school.slug}/settings`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-700"
            >
              <span>Complete Profile</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : !readiness.summary.currentAcademicYear ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-emerald-900">
                  Next Setup Step: Configure Academic Calendar
                </h2>
              </div>
              <p className="text-xs text-emerald-800">
                Set up and activate an academic year before creating classes and admitting students.
              </p>
            </div>
            <Link
              href={`/school/${school.slug}/academics/sessions`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-800"
            >
              <span>Configure Academic Year</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Top Metric Cards (3 Columns) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 1. Total Students */}
        <Link href={`/school/${school.slug}/students`} className="block">
          <StatCard
            title={isAccountant ? "Students on Roll" : "Total Students"}
            value={totalStudents}
            subtitle={`${boysCount} Boys • ${girlsCount} Girls enrolled`}
            icon={Users}
            variant="emerald"
            badgeText={`Session ${sessionName}`}
            badgeColor="bg-emerald-100 text-emerald-800"
          />
        </Link>

        {/* 2. Middle Card: Fees or Curriculum depending on role */}
        {isTeacher ? (
          <Link href={`/school/${school.slug}/academics`} className="block">
            <StatCard
              title="Curriculum Classes"
              value={classSummaryList.length}
              subtitle="Active grade levels and section divisions"
              icon={IndianRupee}
              variant="default"
              badgeText="Curriculum"
              badgeColor="bg-blue-100 text-blue-800"
            />
          </Link>
        ) : (
          <StatCard
            title="Fees Collected"
            value="Not Configured"
            subtitle="Financial ledger & billing module awaiting backend integration"
            icon={IndianRupee}
            variant="default"
            badgeText={isAccountant ? "In Roadmap" : "Module Pending"}
            badgeColor={isAccountant ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}
          />
        )}

        {/* 3. Daily Attendance or Student Records */}
        <Link href={`/school/${school.slug}/attendance`} className="block">
          <StatCard
            title="Daily Attendance"
            value="Register Ready"
            subtitle="Physical notebook register preview ready for class rosters"
            icon={CalendarCheck2}
            variant="rte"
            badgeText={isTeacher ? "Your Primary Action" : "UI Reference"}
            badgeColor={isTeacher ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}
          />
        </Link>
      </div>

      {/* Middle Section (2 Columns: Left 2/3, Right 1/3) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EnrollmentDistributionChart data={chartData} />
        </div>
        <div className="lg:col-span-1">
          <DashboardActivityCard reminders={reminders} birthdays={birthdays} />
        </div>
      </div>

      {/* Bottom Section - "Your Classes" */}
      <DashboardClassList schoolSlug={school.slug} classes={classSummaryList} />
    </div>
  );
}
