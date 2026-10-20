"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
}

export function AcademicNav({
  schoolSlug,
  schoolName,
  schoolCode,
  currentYear,
  userRole,
}: AcademicNavProps) {
  const pathname = usePathname();
  const basePath = `/school/${schoolSlug}/academics`;

  const navItems = [
    { label: "Overview", href: basePath, exact: true },
    { label: "Academic Sessions", href: `${basePath}/sessions` },
    { label: "Classes", href: `${basePath}/classes` },
    { label: "Sections", href: `${basePath}/sections` },
    { label: "Subjects", href: `${basePath}/subjects` },
  ];

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
            <span className="text-zinc-200">Academics</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Academic Management</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Prominent Active Academic Year Indicator */}
          {currentYear ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-950">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Active Session: {currentYear.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/60 px-3.5 py-1 text-xs font-medium text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <span>No Active Session Set</span>
            </div>
          )}

          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
            {userRole}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex space-x-1 overflow-x-auto border-b border-zinc-800/80 pb-px">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-b-2 border-indigo-500 text-white"
                  : "text-zinc-400 hover:border-b-2 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
