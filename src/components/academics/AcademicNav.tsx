"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CalendarDays,
  Layers,
  Grid,
  BookOpen,
  AlertTriangle,
  Shield,
  GraduationCap,
} from "lucide-react";
import { getRoleDisplayName, getRoleTheme } from "@/lib/role-ui";

interface AcademicNavProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  currentYear?: {
    id: string;
    name: string;
    startDate: string | Date;
    endDate: string | Date;
  } | null;
  userRole: string;
  isSchoolDetailsReady?: boolean;
  schoolDetailsReason?: string;
}

export function AcademicNav({
  schoolSlug,
  schoolName,
  schoolCode,
  currentYear,
  userRole,
  isSchoolDetailsReady,
  schoolDetailsReason,
}: AcademicNavProps) {
  const pathname = usePathname() || "";
  const basePath = `/school/${schoolSlug}/academics`;
  const isTeacher = userRole === "TEACHER";
  const roleName = getRoleDisplayName(userRole);
  const roleTheme = getRoleTheme(userRole);

  const allNavItems = [
    { label: "Overview", href: basePath, exact: true, icon: LayoutGrid, teacher: true },
    {
      label: "Academic Sessions",
      href: `${basePath}/sessions`,
      icon: CalendarDays,
      teacher: false,
    },
    {
      label: isTeacher ? "Curriculum Classes" : "Classes",
      href: `${basePath}/classes`,
      icon: Layers,
      teacher: true,
    },
    { label: "Sections", href: `${basePath}/sections`, icon: Grid, teacher: true },
    { label: "Subjects", href: `${basePath}/subjects`, icon: BookOpen, teacher: true },
  ];

  const navItems = isTeacher ? allNavItems.filter((item) => item.teacher) : allNavItems;

  return (
    <header className="mb-6 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {schoolName} ({schoolCode})
            </Link>
            <span>/</span>
            <span className="text-slate-800">Academics</span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {isTeacher ? "Curriculum & Syllabus Directory" : "Academic Setup & Curriculum"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {isTeacher
              ? "Browse grade-level standards, section allocations, and subject course syllabi"
              : "Configure academic sessions, grade standards, student sections, and subject syllabi"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Active Academic Year Indicator */}
          {currentYear ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
              </span>
              <span>Active Session: {currentYear.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>No Active Session Set</span>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{roleName}</span>
          </div>
        </div>
      </div>

      {/* Teacher notice banner */}
      {isTeacher && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-3.5 text-xs text-blue-900 shadow-xs">
          <GraduationCap className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            <strong>Teacher Curriculum View:</strong> You can browse grade levels, class rosters,
            and subject courses. Structural modifications and session roll-over are managed by
            School Administrators.
          </span>
        </div>
      )}

      {/* Prerequisite Alert Banner */}
      {isSchoolDetailsReady === false && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="font-medium">
              {schoolDetailsReason ||
                "School profile details are incomplete. Academic setup is locked until profile is complete."}
            </span>
          </div>
          <Link
            href={`/school/${schoolSlug}/settings`}
            className="flex items-center gap-1 font-bold text-amber-800 underline hover:text-amber-950"
          >
            Complete School Profile &rarr;
          </Link>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 pb-2">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
