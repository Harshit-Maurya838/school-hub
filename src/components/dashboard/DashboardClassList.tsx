"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Users, ChevronRight, BookOpen } from "lucide-react";

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
  /** Whether the viewer can add or edit classes (school admins). */
  canManage?: boolean;
  title?: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function DashboardClassList({
  schoolSlug,
  classes = [],
  canManage = false,
  title = "Classes",
}: DashboardClassListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const query = searchTerm.trim().toLowerCase();
  const filtered = query ? classes.filter((c) => c.name.toLowerCase().includes(query)) : classes;
  const classesHref = `/school/${schoolSlug}/academics/classes`;

  return (
    <section
      aria-labelledby="dashboard-classes-title"
      className="shadow-card space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="dashboard-classes-title" className="text-base font-bold text-slate-900">
              {title}
            </h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
              {classes.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Sections, subjects and students enrolled this session
          </p>
        </div>

        {classes.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search classes"
              placeholder="Search classes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
          <BookOpen className="h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-700">
            {query ? "No matching classes" : "No classes yet"}
          </p>
          <p className="max-w-sm text-xs text-slate-500">
            {query
              ? `No class name contains “${searchTerm.trim()}”.`
              : canManage
                ? "Add your school's classes and sections in Academics to start admitting students."
                : "Classes will appear here once the school administrator sets them up."}
          </p>
          {query ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="mt-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              Clear search
            </button>
          ) : (
            canManage && (
              <Link
                href={classesHref}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Add classes
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={classesHref}
                className="group flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 truncate text-sm font-extrabold text-slate-900 group-hover:text-emerald-800">
                    {item.name}
                  </h4>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-700"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="font-mono font-bold tabular-nums">{item.studentsCount}</span>
                  <span className="text-slate-500">
                    {item.studentsCount === 1 ? "student" : "students"}
                  </span>
                </p>
                <p className="mt-auto pt-2 text-[11px] text-slate-500">
                  {plural(item.sectionsCount, "section", "sections")} ·{" "}
                  {plural(item.subjectsCount, "subject", "subjects")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DashboardClassList;
