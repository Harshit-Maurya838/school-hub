"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface StudentNavProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  userRole: string;
  currentYear?: {
    id: string;
    name: string;
  } | null;
}

export function StudentNav({
  schoolSlug,
  schoolName,
  schoolCode,
  userRole,
  currentYear,
}: StudentNavProps) {
  const pathname = usePathname();
  const basePath = `/school/${schoolSlug}/students`;

  const isDirectory = pathname === basePath;
  const isNewAdmission = pathname === `${basePath}/new`;

  return (
    <header className="mb-8 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Link href={`/school/${schoolSlug}`} className="transition hover:text-indigo-400">
              {schoolName} ({schoolCode})
            </Link>
            <span>/</span>
            <span className="text-zinc-200">Students</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Student Management</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentYear ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-950">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Active Session: {currentYear.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/60 px-3 py-1 text-xs font-medium text-amber-300">
              <span>No Active Session</span>
            </div>
          )}

          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
            {userRole}
          </span>

          <Link
            href={`/school/${schoolSlug}/students/new`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Admission
          </Link>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <nav className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
        <Link
          href={basePath}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isDirectory
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          Student Directory
        </Link>
        <Link
          href={`${basePath}/new`}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isNewAdmission
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          New Admission
        </Link>
      </nav>
    </header>
  );
}
