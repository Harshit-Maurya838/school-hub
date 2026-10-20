"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserPlus, CalendarDays, Shield } from "lucide-react";

export interface StudentNavProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  userRole: string;
  currentYear?: {
    id: string;
    name: string;
  } | null;
}

export function StudentNav({ schoolSlug, schoolName, userRole, currentYear }: StudentNavProps) {
  const pathname = usePathname() || "";
  const basePath = `/school/${schoolSlug}/students`;

  const isDirectory = pathname === basePath;
  const isNewAdmission = pathname === `${basePath}/new`;

  return (
    <div className="mb-6 space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {schoolName}
            </Link>
            <span>/</span>
            <span className="text-slate-800">Students</span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Student Analytics & Directory
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Universal student roster, enrollment allocations, and demographic distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentYear ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              <span>Session: {currentYear.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              <span>No Active Session</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>{userRole}</span>
          </div>

          <Link
            href={`${basePath}/new`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Admit Student</span>
          </Link>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <nav className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <Link
          href={basePath}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            isDirectory
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xs"
              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Student Directory</span>
        </Link>
        <Link
          href={`${basePath}/new`}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            isNewAdmission
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xs"
              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>New Admission</span>
        </Link>
      </nav>
    </div>
  );
}

export default StudentNav;
