import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  IndianRupee,
  CalendarCheck2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ClipboardList,
  Lock,
  Layers,
  CalendarRange,
} from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { getAcademicSetupReadiness } from "@/lib/school-readiness";
import { getSchoolProfile } from "@/modules/onboarding/services/school-profile";
import { canViewSchoolFees } from "@/modules/auth";
import { getFeeDashboardSummary, getClassWiseCollectionSummary } from "@/modules/fees";
import { getAttendanceDaySummary } from "@/modules/attendance";
import { StatCard } from "@/components/common/StatCard";
import {
  EnrollmentDistributionChart,
  ClassEnrollmentData,
  ClassFeeData,
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

const SCHOOL_TIME_ZONE = "Asia/Kolkata";
const BIRTHDAY_LIST_LIMIT = 20;

/** Today's calendar date at the school, as YYYY-MM-DD plus month/day numbers. */
function schoolToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  return { dateStr, month: Number(get("month")) - 1, day: Number(get("day")) };
}

const primaryActionClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none";
const secondaryActionClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none";

interface NoticeProps {
  tone: "neutral" | "pending";
  icon: LucideIcon;
  title: string;
  body: string;
  action: { href: string; label: string; secondary?: boolean };
}

/** The one banner on the dashboard: what this person should do first. */
function Notice({ tone, icon: Icon, title, body, action }: NoticeProps) {
  const pending = tone === "pending";
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
        pending ? "border-amber-200 bg-amber-50" : "shadow-card border-slate-200/80 bg-white"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            pending ? "bg-white text-amber-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h2 className={`text-sm font-bold ${pending ? "text-amber-950" : "text-slate-900"}`}>
            {title}
          </h2>
          <p className={`text-xs ${pending ? "text-amber-900" : "text-slate-600"}`}>{body}</p>
        </div>
      </div>
      <Link
        href={action.href}
        className={action.secondary ? secondaryActionClass : primaryActionClass}
      >
        {action.label}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
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
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h2 className="mb-1.5 text-lg font-bold text-rose-900">Access denied</h2>
          <p className="text-xs text-rose-800">
            Your account does not belong to {school.name}, so its records are not available to you.
          </p>
        </div>
      </div>
    );
  }

  const isTeacher = user.role === "TEACHER";
  const isAccountant = user.role === "ACCOUNTANT";
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = isSuperAdmin || user.role === "SCHOOL_ADMIN";
  const canSeeFees = canViewSchoolFees(user, school.id);
  const canSeeAttendance = isAdmin || isTeacher;

  const [readiness, schoolProfile] = await Promise.all([
    getAcademicSetupReadiness(school.id, school.slug),
    isAdmin ? getSchoolProfile(school.id) : Promise.resolve(null),
  ]);
  const currentYear = readiness.summary.currentAcademicYear;
  const profileStepsSaved = schoolProfile
    ? Object.values(schoolProfile.completion).filter(Boolean).length
    : 0;

  let teacherAssignments: import("@/lib/rbac").TeacherAssignmentContext | null = null;
  if (isTeacher) {
    const { getTeacherActiveAssignments } = await import("@/lib/rbac");
    teacherAssignments = await getTeacherActiveAssignments(school.id, user.id, currentYear?.id);
  }
  const permittedSectionIds = teacherAssignments?.allPermittedSectionIds ?? [];

  // Teacher student filter condition
  const studentWhere: Record<string, unknown> = {
    schoolId: school.id,
    deletedAt: null,
    isActive: true,
  };

  if (isTeacher) {
    if (teacherAssignments && permittedSectionIds.length > 0) {
      studentWhere.enrollments = {
        some: {
          sectionId: { in: permittedSectionIds },
          academicYearId: teacherAssignments.academicYearId,
          status: "ACTIVE",
        },
      };
    } else {
      // Teacher has no active assignments: match no students
      studentWhere.id = "none";
    }
  }

  // Enrollment counts reflect the current session only.
  const activeEnrollmentWhere = {
    status: "ACTIVE" as const,
    academicYearId: currentYear?.id,
    student: { isActive: true, deletedAt: null },
  };

  const today = schoolToday();

  const [
    totalStudents,
    boysCount,
    girlsCount,
    rawClassesData,
    studentDobs,
    feeSummary,
    classFees,
    attendanceToday,
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.student.count({ where: { ...studentWhere, gender: "MALE" } }),
    prisma.student.count({ where: { ...studentWhere, gender: "FEMALE" } }),
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
              select: { enrollments: { where: activeEnrollmentWhere } },
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
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, dob: true },
    }),
    canSeeFees && currentYear
      ? getFeeDashboardSummary(school.id, user, currentYear.id)
      : Promise.resolve(null),
    canSeeFees && currentYear
      ? getClassWiseCollectionSummary(school.id, user, currentYear.id)
      : Promise.resolve(null),
    canSeeAttendance && currentYear
      ? getAttendanceDaySummary(school.id, user, currentYear.id, today.dateStr)
      : Promise.resolve(null),
  ]);

  // If teacher, filter classesData to only assigned classes and sections
  const classesData = isTeacher
    ? rawClassesData
        .filter((cls) => cls.sections.some((sec) => permittedSectionIds.includes(sec.id)))
        .map((cls) => ({
          ...cls,
          sections: cls.sections.filter((sec) => permittedSectionIds.includes(sec.id)),
        }))
    : rawClassesData;

  const classSummaryList: ClassSummaryItem[] = classesData.map((cls) => ({
    id: cls.id,
    name: cls.name,
    sectionsCount: cls.sections.length,
    subjectsCount: cls._count.subjects,
    studentsCount: cls.sections.reduce((sum, sec) => sum + (sec._count?.enrollments || 0), 0),
  }));
  const totalSections = classSummaryList.reduce((sum, c) => sum + c.sectionsCount, 0);

  const chartData: ClassEnrollmentData[] = classSummaryList.map((cls) => ({
    className: cls.name,
    enrolledStudents: cls.studentsCount,
    sectionsCount: cls.sectionsCount,
  }));

  // Display-only conversion: the ledger maths stays in Decimal inside the fee service.
  const feeChartData: ClassFeeData[] | null = classFees
    ? classFees.map((c) => ({
        className: c.className,
        collected: c.collected.toNumber(),
        outstanding: c.outstanding.toNumber(),
      }))
    : null;

  // Build reminders list
  const reminders: ReminderItem[] = [];

  if (isAdmin) {
    if (!readiness.schoolDetails.isReady) {
      reminders.push({
        id: "school-profile",
        title: "Complete the school profile",
        description:
          readiness.schoolDetails.reason ||
          "Add the official school details and verify the administrator.",
        priority: "high",
        actionUrl: `/school/${school.slug}/settings`,
        actionLabel: "Complete profile",
      });
    }

    if (!currentYear) {
      reminders.push({
        id: "academic-year",
        title: "No active session",
        description: "Create an academic session and set it as current.",
        priority: "high",
        actionUrl: `/school/${school.slug}/settings/academic`,
        actionLabel: "Set up session",
      });
    }

    if (readiness.summary.counts.classes === 0) {
      reminders.push({
        id: "classes",
        title: "Add classes",
        description: "Define the classes your school runs, for example Nursery to Class 10.",
        priority: "normal",
        actionUrl: `/school/${school.slug}/academics/classes`,
        actionLabel: "Add classes",
      });
    } else if (readiness.summary.counts.sections === 0) {
      reminders.push({
        id: "sections",
        title: "Add sections",
        description: "Add sections with seating capacity so students can be enrolled.",
        priority: "normal",
        actionUrl: `/school/${school.slug}/academics/sections`,
        actionLabel: "Add sections",
      });
    }

    if (attendanceToday && attendanceToday.draft > 0) {
      reminders.push({
        id: "attendance-drafts",
        title: `${attendanceToday.draft} ${attendanceToday.draft === 1 ? "register is" : "registers are"} still in draft`,
        description: "Draft registers are not part of the record until they are submitted.",
        priority: "normal",
        actionUrl: `/school/${school.slug}/attendance`,
        actionLabel: "Review registers",
      });
    }
  } else if (isTeacher) {
    if (teacherAssignments && teacherAssignments.isClassTeacher) {
      const sectionNames = teacherAssignments.classTeacherSections
        .map((s) => `${s.className} - ${s.sectionName}`)
        .join(", ");
      reminders.push({
        id: "teacher-attendance",
        title: "Take today's attendance",
        description: `You are class teacher for ${sectionNames}.`,
        priority: "high",
        actionUrl: `/school/${school.slug}/attendance`,
        actionLabel: "Open register",
      });
    } else if (teacherAssignments && teacherAssignments.isSubjectTeacher) {
      reminders.push({
        id: "teacher-subjects",
        title: "Your subject sections",
        description: `You teach ${teacherAssignments.subjectAssignments.length} subject ${
          teacherAssignments.subjectAssignments.length === 1 ? "section" : "sections"
        } this session.`,
        priority: "normal",
        actionUrl: `/school/${school.slug}/students`,
        actionLabel: "View students",
      });
    } else {
      reminders.push({
        id: "teacher-no-assignments",
        title: "No teaching assignments yet",
        description:
          "You have no class-teacher or subject assignments this session. Ask your school administrator to assign you.",
        priority: "normal",
        actionUrl: `/school/${school.slug}/academics`,
        actionLabel: "View academics",
      });
    }
  } else if (isAccountant) {
    if (feeSummary && feeSummary.overdueCount > 0) {
      reminders.push({
        id: "accountant-overdue",
        title: `${feeSummary.overdueCount} overdue ${feeSummary.overdueCount === 1 ? "invoice" : "invoices"}`,
        description: "These invoices are past their due date with a balance still owed.",
        priority: "high",
        actionUrl: `/school/${school.slug}/fees`,
        actionLabel: "Open fees",
      });
    } else if (feeSummary && feeSummary.totalInvoices === 0) {
      reminders.push({
        id: "accountant-invoices",
        title: "No invoices this session",
        description: "Generate invoices from a fee structure to start collecting fees.",
        priority: "normal",
        actionUrl: `/school/${school.slug}/fees`,
        actionLabel: "Open fees",
      });
    }
  }

  // Birthdays this month at the school's local date. Dates of birth are stored as
  // calendar dates (UTC midnight), so read their UTC month and day.
  const monthBirthdays = studentDobs
    .filter((st) => st.dob && new Date(st.dob).getUTCMonth() === today.month)
    .sort((a, b) => new Date(a.dob).getUTCDate() - new Date(b.dob).getUTCDate());
  const upcomingFirst = [
    ...monthBirthdays.filter((st) => new Date(st.dob).getUTCDate() >= today.day),
    ...monthBirthdays.filter((st) => new Date(st.dob).getUTCDate() < today.day),
  ].slice(0, BIRTHDAY_LIST_LIMIT);

  const birthdayStudents = upcomingFirst.length
    ? await prisma.student.findMany({
        where: { schoolId: school.id, id: { in: upcomingFirst.map((s) => s.id) } },
        select: {
          id: true,
          name: true,
          enrollments: {
            where: { status: "ACTIVE", academicYearId: currentYear?.id },
            take: 1,
            select: {
              section: { select: { name: true, class: { select: { name: true } } } },
            },
          },
        },
      })
    : [];
  const birthdayById = new Map(birthdayStudents.map((s) => [s.id, s]));

  const birthdays: BirthdayItem[] = upcomingFirst.flatMap((st) => {
    const student = birthdayById.get(st.id);
    if (!student) return [];
    const d = new Date(st.dob);
    const sec = student.enrollments[0]?.section;
    return [
      {
        id: st.id,
        name: student.name,
        dobFormatted: d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }),
        className: sec ? `${sec.class.name} - ${sec.name}` : undefined,
        isToday: d.getUTCDate() === today.day,
      },
    ];
  });

  // Banner: one, the most important thing for this person right now.
  let notice: NoticeProps | null = null;
  if (isSuperAdmin) {
    notice = {
      tone: "neutral",
      icon: ShieldCheck,
      title: `Viewing ${school.name} as platform admin`,
      body: "You are signed in with platform credentials. Finance records stay with the school's own staff.",
      action: { href: "/platform", label: "Platform console", secondary: true },
    };
  } else if (isAdmin && !readiness.schoolDetails.isReady) {
    notice = {
      tone: "pending",
      icon: AlertCircle,
      title: "Finish the school profile",
      body:
        readiness.schoolDetails.reason ||
        "Complete the school profile before setting up the session and admitting students.",
      action: { href: `/school/${school.slug}/settings`, label: "Complete profile" },
    };
  } else if (isAdmin && !currentYear) {
    notice = {
      tone: "neutral",
      icon: CalendarRange,
      title: "Next: set up the academic session",
      body: "Create and activate a session before adding classes and admitting students.",
      action: { href: `/school/${school.slug}/settings/academic`, label: "Set up session" },
    };
  }

  const sessionName = currentYear?.name ?? null;
  const roleLine = isTeacher
    ? "Your sections and today's registers"
    : isAccountant
      ? "Fee position and students on roll"
      : "Today across the school";

  // Attendance card content
  const attendanceCard = (() => {
    if (!canSeeAttendance) return null;
    if (!attendanceToday) {
      return {
        value: "—",
        subtitle: "Set an active session to start taking attendance.",
        badge: undefined as { text: string; className: string } | undefined,
      };
    }
    const { submitted, totalSections: sections, draft, present, absent, late } = attendanceToday;
    const allIn = sections > 0 && submitted >= sections;
    const marked = present + absent + late + attendanceToday.excused;
    return {
      value: (
        <>
          {submitted}
          <span className="text-base font-bold text-slate-400"> / {sections}</span>
        </>
      ),
      subtitle:
        sections === 0
          ? "No sections with enrolled students yet."
          : marked > 0
            ? `${present + late} present · ${absent} absent on submitted registers`
            : "Registers submitted today",
      badge: allIn
        ? {
            text: "All submitted",
            className: "border border-emerald-200 bg-emerald-50 text-emerald-800",
          }
        : draft > 0
          ? {
              text: `${draft} in draft`,
              className: "border border-amber-200 bg-amber-50 text-amber-800",
            }
          : sections > 0
            ? { text: "Pending", className: "border border-amber-200 bg-amber-50 text-amber-800" }
            : undefined,
    };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Dashboard</h2>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {roleLine}
          {" · "}
          {sessionName ? (
            <>
              Session <span className="font-mono text-slate-700">{sessionName}</span>
            </>
          ) : (
            "No active session"
          )}
        </p>
      </div>

      {notice && <Notice {...notice} />}

      {/* Master School Profile shortcut (admins) */}
      {schoolProfile && (
        <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Master school profile</h2>
                {schoolProfile.lock.isLocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Locked
                  </span>
                ) : schoolProfile.isComplete ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Complete
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {profileStepsSaved} of 3 steps saved
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                UDISE+ identity, academic setup and head-of-school details
                {schoolProfile.identity.udiseCode && (
                  <>
                    {" "}
                    · U-DISE{" "}
                    <span className="font-mono text-slate-800">
                      {schoolProfile.identity.udiseCode}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Link
            href={`/school/${school.slug}/settings`}
            className={
              notice && !notice.action.secondary ? secondaryActionClass : primaryActionClass
            }
          >
            Open school profile
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Key figures */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          href={`/school/${school.slug}/students`}
          title={isTeacher ? "Your students" : "Students on roll"}
          value={totalStudents}
          subtitle={`${boysCount} boys · ${girlsCount} girls`}
          icon={Users}
          variant="emerald"
        />

        {canSeeFees && (
          <StatCard
            href={`/school/${school.slug}/fees`}
            title="Fees collected"
            value={
              feeSummary ? (
                <span className="font-mono tracking-tighter">
                  {formatINR(feeSummary.collected)}
                </span>
              ) : (
                "—"
              )
            }
            subtitle={
              !feeSummary
                ? "Set an active session to issue invoices."
                : feeSummary.totalInvoices === 0
                  ? "No invoices issued this session."
                  : `${formatINR(feeSummary.outstanding)} outstanding on ${feeSummary.totalInvoices} ${
                      feeSummary.totalInvoices === 1 ? "invoice" : "invoices"
                    }`
            }
            icon={IndianRupee}
            badgeText={
              feeSummary && feeSummary.overdueCount > 0
                ? `${feeSummary.overdueCount} overdue`
                : undefined
            }
            badgeColor="border border-rose-200 bg-rose-50 text-rose-800"
          />
        )}

        {attendanceCard && (
          <StatCard
            href={`/school/${school.slug}/attendance`}
            title="Registers submitted today"
            value={attendanceCard.value}
            subtitle={attendanceCard.subtitle}
            icon={CalendarCheck2}
            variant="emerald"
            badgeText={attendanceCard.badge?.text}
            badgeColor={attendanceCard.badge?.className}
          />
        )}

        {(!canSeeFees || !attendanceCard) && (
          <StatCard
            href={`/school/${school.slug}/academics`}
            title={isTeacher ? "Your classes" : "Classes"}
            value={classSummaryList.length}
            subtitle={`${totalSections} ${totalSections === 1 ? "section" : "sections"}`}
            icon={Layers}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EnrollmentDistributionChart data={chartData} feeData={feeChartData} />
        </div>
        <div className="lg:col-span-1">
          <DashboardActivityCard
            reminders={reminders}
            birthdays={birthdays}
            birthdaysTotal={monthBirthdays.length}
            allClearMessage={
              isAdmin ? "School profile, session, classes and sections are all set up." : undefined
            }
          />
        </div>
      </div>

      <DashboardClassList
        schoolSlug={school.slug}
        classes={classSummaryList}
        canManage={isAdmin}
        title={isTeacher ? "Your classes" : "Classes"}
      />
    </div>
  );
}
