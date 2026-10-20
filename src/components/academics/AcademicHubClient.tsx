"use-client";

import Link from "next/link";
import { AcademicYearData } from "./AcademicSessionsClient";

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
  };
  recentYears: AcademicYearData[];
}

export function AcademicHubClient({ schoolSlug, overview, recentYears }: Props) {
  const { currentYear, stats } = overview;
  const basePath = `/school/${schoolSlug}/academics`;

  const checklist = [
    {
      title: "1. Academic Session",
      done: Boolean(currentYear),
      message: currentYear ? `Active: ${currentYear.name}` : "No active session configured",
      href: `${basePath}/sessions`,
    },
    {
      title: "2. Grade Levels / Classes",
      done: stats.classesCount > 0,
      message:
        stats.classesCount > 0
          ? `${stats.classesCount} class(es) defined`
          : "No classes created yet",
      href: `${basePath}/classes`,
    },
    {
      title: "3. Class Sections",
      done: stats.sectionsCount > 0,
      message:
        stats.sectionsCount > 0
          ? `${stats.sectionsCount} section(s) defined`
          : "No sections created yet",
      href: `${basePath}/sections`,
    },
    {
      title: "4. Curriculum Subjects",
      done: stats.subjectsCount > 0,
      message:
        stats.subjectsCount > 0
          ? `${stats.subjectsCount} subject(s) cataloged`
          : "No subjects defined yet",
      href: `${basePath}/subjects`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Session Card */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Current Session
            </span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                currentYear ? "animate-pulse bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
            {currentYear ? currentYear.name : "None Set"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
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
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href={`${basePath}/sessions`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Manage Sessions &rarr;
            </Link>
          </div>
        </div>

        {/* Classes Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-sm">
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Total Classes
          </span>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-white">
            {stats.classesCount}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Active educational grades</p>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href={`${basePath}/classes`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Configure Classes &rarr;
            </Link>
          </div>
        </div>

        {/* Sections Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-sm">
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Total Sections
          </span>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-white">
            {stats.sectionsCount}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Classrooms and student divisions</p>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href={`${basePath}/sections`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Configure Sections &rarr;
            </Link>
          </div>
        </div>

        {/* Subjects Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-sm">
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Total Subjects
          </span>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-white">
            {stats.subjectsCount}
          </p>
          <p className="mt-1 text-xs text-zinc-400">School curriculum catalog</p>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href={`${basePath}/subjects`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Configure Subjects &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Setup Checklist & Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Academic Setup Readiness Checklist */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm lg:col-span-1">
          <h3 className="text-base font-semibold text-white">Setup Readiness</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Verify academic configuration prerequisites.
          </p>

          <div className="mt-5 space-y-3">
            {checklist.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="group flex items-start justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 transition hover:border-zinc-700 hover:bg-zinc-800/40"
              >
                <div>
                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{item.message}</p>
                </div>
                {item.done ? (
                  <span className="rounded-full border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Ready
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-800 bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    Pending
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Modules Navigation Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {/* Card 1: Academic Sessions */}
          <Link
            href={`${basePath}/sessions`}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-indigo-500/50 hover:bg-zinc-900/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-xl border border-indigo-500/20 bg-indigo-950/50 p-2.5 text-indigo-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </span>
              <span className="text-xs font-medium text-zinc-500 group-hover:text-indigo-400">
                Manage &rarr;
              </span>
            </div>
            <h4 className="mt-4 text-base font-semibold text-white group-hover:text-indigo-300">
              Academic Sessions
            </h4>
            <p className="mt-1 text-xs text-zinc-400">
              Configure school calendar years, designate the active operational session, and prevent
              conflicts.
            </p>
          </Link>

          {/* Card 2: Classes */}
          <Link
            href={`${basePath}/classes`}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-indigo-500/50 hover:bg-zinc-900/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-xl border border-indigo-500/20 bg-indigo-950/50 p-2.5 text-indigo-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </span>
              <span className="text-xs font-medium text-zinc-500 group-hover:text-indigo-400">
                Manage &rarr;
              </span>
            </div>
            <h4 className="mt-4 text-base font-semibold text-white group-hover:text-indigo-300">
              Classes & Standards
            </h4>
            <p className="mt-1 text-xs text-zinc-400">
              Define standard grade levels (Nursery, LKG, Class 1 to 12) with custom numeric
              sorting.
            </p>
          </Link>

          {/* Card 3: Sections */}
          <Link
            href={`${basePath}/sections`}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-indigo-500/50 hover:bg-zinc-900/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-xl border border-indigo-500/20 bg-indigo-950/50 p-2.5 text-indigo-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </span>
              <span className="text-xs font-medium text-zinc-500 group-hover:text-indigo-400">
                Manage &rarr;
              </span>
            </div>
            <h4 className="mt-4 text-base font-semibold text-white group-hover:text-indigo-300">
              Class Sections
            </h4>
            <p className="mt-1 text-xs text-zinc-400">
              Establish divisions (A, B, C) under each class and configure maximum student
              capacities.
            </p>
          </Link>

          {/* Card 4: Subjects */}
          <Link
            href={`${basePath}/subjects`}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-indigo-500/50 hover:bg-zinc-900/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-xl border border-indigo-500/20 bg-indigo-950/50 p-2.5 text-indigo-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </span>
              <span className="text-xs font-medium text-zinc-500 group-hover:text-indigo-400">
                Manage &rarr;
              </span>
            </div>
            <h4 className="mt-4 text-base font-semibold text-white group-hover:text-indigo-300">
              Subject Catalog
            </h4>
            <p className="mt-1 text-xs text-zinc-400">
              Maintain school-wide foundational courses or class-specific academic subjects.
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Sessions Overview */}
      {recentYears.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-white">Recent Academic Sessions</h3>
              <p className="text-xs text-zinc-400">Institutional calendar sessions and status.</p>
            </div>
            <Link
              href={`${basePath}/sessions`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View All &rarr;
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {recentYears.slice(0, 3).map((year) => (
              <div
                key={year.id}
                className="flex items-center justify-between px-6 py-3.5 text-sm transition hover:bg-zinc-800/20"
              >
                <div>
                  <div className="font-medium text-white">{year.name}</div>
                  <div className="text-xs text-zinc-400">
                    {new Date(year.startDate).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}{" "}
                    &rarr;{" "}
                    {new Date(year.endDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                </div>
                <div>
                  {year.isCurrent ? (
                    <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      Active Session
                    </span>
                  ) : (
                    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-400">
                      Inactive
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
