import React from "react";
import { Users, User, UserCheck } from "lucide-react";

export interface StudentAnalyticsCardsProps {
  total: number;
  boys: number;
  girls: number;
  activeEnrolled: number;
}

export function StudentAnalyticsCards({
  total = 0,
  boys = 0,
  girls = 0,
  activeEnrolled = 0,
}: StudentAnalyticsCardsProps) {
  const boysPct = total > 0 ? Math.round((boys / total) * 100) : 0;
  const girlsPct = total > 0 ? Math.round((girls / total) * 100) : 0;
  const enrolledPct = total > 0 ? Math.round((activeEnrolled / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Students */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
              Total Students
            </p>
            <h3 className="mt-1 font-sans text-3xl font-black text-slate-900">{total}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span>{boys} Boys</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{girls} Girls</span>
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shadow-emerald-200">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 border-t border-emerald-100/60 pt-2">
          <svg
            className="h-8 w-full text-emerald-600"
            viewBox="0 0 100 25"
            preserveAspectRatio="none"
          >
            <path
              d="M0 18 Q 20 6, 40 14 T 70 8 T 100 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Boys */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-[#E0F2FE] via-white to-[#F0F9FF] p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-sky-800 uppercase">Boys Cohort</p>
            <h3 className="mt-1 font-sans text-3xl font-black text-slate-900">{boys}</h3>
            <p className="mt-1 text-xs font-semibold text-sky-700">{boysPct}% of total directory</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs shadow-sky-200">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-sky-100 pt-2 text-xs">
          <span className="text-slate-500">Gender Ratio</span>
          <span className="font-mono font-bold text-sky-800">
            {girls > 0 ? (boys / girls).toFixed(2) : boys} : 1
          </span>
        </div>
      </div>

      {/* 3. Girls */}
      <div className="relative overflow-hidden rounded-2xl border border-pink-200/80 bg-gradient-to-br from-[#FCE7F3] via-white to-[#FDF2F8] p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-pink-800 uppercase">Girls Cohort</p>
            <h3 className="mt-1 font-sans text-3xl font-black text-slate-900">{girls}</h3>
            <p className="mt-1 text-xs font-semibold text-pink-700">
              {girlsPct}% of total directory
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500 text-white shadow-xs shadow-pink-200">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-pink-100 pt-2 text-xs">
          <span className="text-slate-500">Empowerment</span>
          <span className="font-mono font-bold text-pink-700">{girlsPct}% Active</span>
        </div>
      </div>

      {/* 4. Active Enrollments */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#D1FAE5] via-white to-[#ECFDF5] p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
              Allocated Roster
            </p>
            <h3 className="mt-1 font-sans text-3xl font-black text-slate-900">{activeEnrolled}</h3>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              {enrolledPct}% assigned to section
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shadow-emerald-200">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-emerald-200 pt-2 text-xs">
          <span className="text-slate-500">Section Allocation</span>
          <span className="font-mono font-bold text-emerald-800">
            {activeEnrolled}/{total} Enrolled
          </span>
        </div>
      </div>
    </div>
  );
}

export default StudentAnalyticsCards;
