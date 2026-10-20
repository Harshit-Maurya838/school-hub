"use client";

import Link from "next/link";
import { AcademicYearData } from "./AcademicSessionsClient";
import { AcademicSetupReadiness } from "@/lib/school-readiness";
import {
  CalendarDays,
  Layers,
  Grid,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface Props {
  schoolSlug: string;
  overview: {
    currentYear: AcademicYearData | null;
    stats: {
      yearsCount: number;
      classesCount: number;
      sectionsCount: number;
      subjectsCount: number;
    };
    readiness?: AcademicSetupReadiness;
  };
  recentYears: AcademicYearData[];
}

export function AcademicHubClient({ schoolSlug, overview, recentYears }: Props) {
  const { currentYear, stats, readiness } = overview;
  const basePath = `/school/${schoolSlug}/academics`;

  const checklist = readiness
    ? [
        readiness.steps.schoolDetails,
        readiness.steps.academicYear,
        readiness.steps.classes,
        readiness.steps.sections,
        readiness.steps.subjects,
      ]
    : [
        {
          id: "schoolDetails",
          title: "1. School Details & Activation",
          status: "COMPLETE" as const,
          isComplete: true,
          isBlocked: false,
          message: "School details and profile verified",
          actionUrl: `/school/${schoolSlug}/settings`,
          actionLabel: "View Profile",
        },
        {
          id: "academicYear",
          title: "2. Academic Session",
          status: currentYear ? ("COMPLETE" as const) : ("PENDING" as const),
          isComplete: Boolean(currentYear),
          isBlocked: false,
          message: currentYear ? `Active: ${currentYear.name}` : "No active session configured",
          actionUrl: `${basePath}/sessions`,
          actionLabel: "Configure Sessions",
        },
        {
          id: "classes",
          title: "3. Grade Levels / Classes",
          status: !currentYear
            ? ("BLOCKED" as const)
            : stats.classesCount > 0
              ? ("COMPLETE" as const)
              : ("PENDING" as const),
          isComplete: stats.classesCount > 0,
          isBlocked: !currentYear,
          message: !currentYear
            ? "Set up and activate an academic year before creating classes."
            : stats.classesCount > 0
              ? `${stats.classesCount} class(es) defined`
              : "No classes created yet",
          actionUrl: !currentYear ? `${basePath}/sessions` : `${basePath}/classes`,
          actionLabel: "Configure Classes",
        },
        {
          id: "sections",
          title: "4. Class Sections",
          status:
            !currentYear || stats.classesCount === 0
              ? ("BLOCKED" as const)
              : stats.sectionsCount > 0
                ? ("COMPLETE" as const)
                : ("PENDING" as const),
          isComplete: stats.sectionsCount > 0,
          isBlocked: !currentYear || stats.classesCount === 0,
          message: !currentYear
            ? "Set up and activate an academic year before creating sections."
            : stats.classesCount === 0
              ? "Create at least one class before creating sections."
              : stats.sectionsCount > 0
                ? `${stats.sectionsCount} section(s) defined`
                : "No sections created yet",
          actionUrl: !currentYear
            ? `${basePath}/sessions`
            : stats.classesCount === 0
              ? `${basePath}/classes`
              : `${basePath}/sections`,
          actionLabel: "Configure Sections",
        },
        {
          id: "subjects",
          title: "5. Curriculum Subjects",
          status: !currentYear
            ? ("BLOCKED" as const)
            : stats.subjectsCount > 0
              ? ("COMPLETE" as const)
              : ("PENDING" as const),
          isComplete: stats.subjectsCount > 0,
          isBlocked: !currentYear,
          message: !currentYear
            ? "Set up and activate an academic year before creating subjects."
            : stats.subjectsCount > 0
              ? `${stats.subjectsCount} subject(s) cataloged`
              : "No subjects defined yet",
          actionUrl: !currentYear ? `${basePath}/sessions` : `${basePath}/subjects`,
          actionLabel: "Configure Subjects",
        },
      ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Session Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Active Session
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              {currentYear ? currentYear.name : "None Set"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {currentYear
                ? `${new Date(currentYear.startDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                  })} - ${new Date(currentYear.endDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                  })}`
                : "Institutional calendar"}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] font-bold text-emerald-700">
              {currentYear ? "Operational" : "Setup needed"}
            </span>
            <Link
              href={`${basePath}/sessions`}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Classes Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Classes / Standards
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              {stats.classesCount}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">Educational grade levels</p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-500">Configured grades</span>
            <Link
              href={`${basePath}/classes`}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Sections Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Class Sections
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Grid className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              {stats.sectionsCount}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">Active classroom divisions</p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-500">Classrooms defined</span>
            <Link
              href={`${basePath}/sections`}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Subjects Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Curriculum Subjects
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              {stats.subjectsCount}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">Cataloged course subjects</p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-500">Active syllabi</span>
            <Link
              href={`${basePath}/subjects`}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Setup Checklist & Overview Modules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Academic Setup Readiness Checklist */}
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Setup Readiness</h3>
              <p className="text-xs text-slate-400">Academic prerequisite checklist</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-1 text-emerald-700">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-2.5">
            {checklist.map((item, index) => {
              const isComp = item.status === "COMPLETE";
              const isPend = item.status === "PENDING";

              return (
                <Link
                  key={index}
                  href={item.actionUrl}
                  className={`group flex items-start justify-between rounded-xl border p-3 transition-all ${
                    isComp
                      ? "border-emerald-100 bg-emerald-50/20 hover:border-emerald-200 hover:bg-emerald-50/40"
                      : isPend
                        ? "border-amber-100 bg-amber-50/20 hover:border-amber-200 hover:bg-amber-50/40"
                        : "border-slate-100 bg-slate-50/50 opacity-80 hover:border-slate-200"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <p
                      className={`text-xs font-bold transition-colors ${
                        isComp
                          ? "text-emerald-950 group-hover:text-emerald-800"
                          : isPend
                            ? "text-amber-950 group-hover:text-amber-800"
                            : "text-slate-700 group-hover:text-slate-900"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[11px] leading-tight text-slate-500">{item.message}</p>
                  </div>
                  <div>
                    {isComp ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Ready</span>
                      </span>
                    ) : isPend ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        <AlertCircle className="h-3 w-3 text-slate-500" />
                        <span>Blocked</span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Config Modules */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {/* Card 1: Academic Sessions */}
          <Link
            href={`${basePath}/sessions`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition-transform group-hover:translate-x-0.5">
                  <span>Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-900">
                Academic Sessions
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Configure school calendar years, designate the active operational session, and
                prevent date conflicts.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
              {stats.yearsCount} Total Session(s) Recorded
            </div>
          </Link>

          {/* Card 2: Classes */}
          <Link
            href={`${basePath}/classes`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                  <Layers className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition-transform group-hover:translate-x-0.5">
                  <span>Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-900">
                Classes & Standards
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Define standard grade levels (Nursery, LKG, Grade 1 to 12) with custom numeric
                sorting.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
              {stats.classesCount} Class(es) Active
            </div>
          </Link>

          {/* Card 3: Sections */}
          <Link
            href={`${basePath}/sections`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 font-bold text-purple-700">
                  <Grid className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition-transform group-hover:translate-x-0.5">
                  <span>Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-900">
                Class Sections
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Establish divisions (A, B, C) under each class and configure maximum student
                capacities.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
              {stats.sectionsCount} Classroom Division(s)
            </div>
          </Link>

          {/* Card 4: Subjects */}
          <Link
            href={`${basePath}/subjects`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 font-bold text-amber-700">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 transition-transform group-hover:translate-x-0.5">
                  <span>Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-900">
                Curriculum Subjects
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Maintain school-wide foundational courses or class-specific academic subjects.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
              {stats.subjectsCount} Syllabus Subject(s)
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Sessions Overview */}
      {recentYears.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Recent Academic Sessions</h3>
              <p className="text-xs text-slate-400">
                School calendar sessions and activation status
              </p>
            </div>
            <Link
              href={`${basePath}/sessions`}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentYears.slice(0, 4).map((year) => (
              <div
                key={year.id}
                className="flex items-center justify-between rounded-xl px-2 py-3.5 text-sm transition hover:bg-slate-50/50"
              >
                <div>
                  <div className="font-bold text-slate-900">{year.name}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(year.startDate).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}{" "}
                    &rarr;{" "}
                    {new Date(year.endDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                </div>
                <div>
                  {year.isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                      <span>Active Session</span>
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Archived / Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
