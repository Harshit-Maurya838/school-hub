"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Users, ChevronRight, BookOpen, Layers } from "lucide-react";

export interface ClassSummaryItem {
  id: string;
  name: string;
  sectionsCount: number;
  subjectsCount: number;
  studentsCount: number;
}

export interface DashboardClassListProps {
  schoolSlug: string;
  classes: ClassSummaryItem[];
}

export function DashboardClassList({ schoolSlug, classes = [] }: DashboardClassListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = classes.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Title & Search */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Configured Classes & Divisions</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-500">
              {classes.length} Total
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Active class cohorts, section capacities, and enrolled student allocations
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search class cohort..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Class Cards Grid */}
      {filtered.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No classes found</p>
          <p className="mx-auto max-w-sm text-xs text-slate-400">
            {searchTerm
              ? `No classes matching "${searchTerm}".`
              : "Get started by adding your school's classes and sections in Academic Setup."}
          </p>
          <div className="pt-2">
            <Link
              href={`/school/${schoolSlug}/academics/classes`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-800"
            >
              <span>Manage Classes &rarr;</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/school/${schoolSlug}/academics/classes`}
              className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:to-emerald-50/20 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1 rounded-lg border border-emerald-100/70 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  <Layers className="h-3 w-3 text-emerald-600" />
                  <span>{item.sectionsCount} Sec</span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span>{item.studentsCount}</span>
                </span>
              </div>

              <h4 className="text-base font-extrabold text-slate-900 transition-colors group-hover:text-emerald-800">
                {item.name}
              </h4>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                <span className="truncate text-[11px]">
                  {item.subjectsCount} {item.subjectsCount === 1 ? "Subject" : "Subjects"}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 transition-transform group-hover:translate-x-0.5">
                  <span>View</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardClassList;
