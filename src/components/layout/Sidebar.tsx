"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  BookOpen,
  CalendarCheck2,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  School,
  CalendarDays,
  X,
} from "lucide-react";

export interface SidebarProps {
  schoolSlug: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  session?: string;
}

export function Sidebar({
  schoolSlug,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
  session = "Current Session",
}: SidebarProps) {
  const pathname = usePathname() || "";

  const mainModules = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: `/school/${schoolSlug}`,
      isActive:
        pathname === `/school/${schoolSlug}` || pathname === `/school/${schoolSlug}/dashboard`,
    },
    {
      id: "students",
      label: "Manage Students",
      icon: Users,
      href: `/school/${schoolSlug}/students`,
      isActive: pathname.startsWith(`/school/${schoolSlug}/students`),
    },
    {
      id: "classes",
      label: "Class & Subjects",
      icon: BookOpen,
      href: `/school/${schoolSlug}/academics`,
      isActive: pathname.startsWith(`/school/${schoolSlug}/academics`),
    },
    {
      id: "attendance",
      label: "Daily Attendance",
      icon: CalendarCheck2,
      href: `/school/${schoolSlug}/attendance`,
      badge: "PREVIEW",
      badgeVariant: "bg-emerald-100 text-emerald-800",
      isActive: pathname.startsWith(`/school/${schoolSlug}/attendance`),
    },
    {
      id: "staff",
      label: "Staff Directory",
      icon: UserCheck,
      href: `/school/${schoolSlug}/staff`,
      isActive: pathname.startsWith(`/school/${schoolSlug}/staff`),
    },
    {
      id: "fees",
      label: "Fees Management",
      icon: CreditCard,
      href: `/school/${schoolSlug}/fees`,
      badge: "SOON",
      badgeVariant: "bg-slate-100 text-slate-500",
      isActive: pathname.startsWith(`/school/${schoolSlug}/fees`),
    },
  ];

  const examModules = [
    {
      id: "exams",
      label: "Exam & Results",
      icon: GraduationCap,
      href: `/school/${schoolSlug}/exams`,
      badge: "SOON",
      badgeVariant: "bg-slate-100 text-slate-500",
      isActive: pathname.startsWith(`/school/${schoolSlug}/exams`),
    },
  ];

  const managementModules = [
    {
      id: "settings",
      label: "School Settings",
      icon: Settings,
      href: `/school/${schoolSlug}/settings`,
      isActive: pathname.startsWith(`/school/${schoolSlug}/settings`),
    },
  ];

  const renderNavItem = (item: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    href: string;
    isActive: boolean;
    badge?: string;
    badgeVariant?: string;
  }) => {
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => setIsMobileOpen?.(false)}
        title={isCollapsed ? item.label : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
          item.isActive
            ? "bg-emerald-50 font-semibold text-emerald-800 shadow-xs"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        } ${isCollapsed ? "md:justify-center md:px-2" : ""}`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 transition-colors ${
            item.isActive ? "text-emerald-700" : "text-slate-500 group-hover:text-slate-700"
          }`}
          strokeWidth={item.isActive ? 2.2 : 1.75}
        />

        {(!isCollapsed || isMobileOpen) && (
          <span className="flex-1 truncate text-left">{item.label}</span>
        )}

        {(!isCollapsed || isMobileOpen) && item.badge && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
              item.badgeVariant || "bg-amber-500 text-white"
            }`}
          >
            {item.badge}
          </span>
        )}

        {/* Active Pill Bar */}
        {item.isActive && (!isCollapsed || isMobileOpen) && (
          <span className="h-4 w-1.5 rounded-full bg-emerald-600" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-64 md:w-20" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <Link
            href={`/school/${schoolSlug}`}
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md shadow-emerald-700/20">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col">
                <span className="font-sans text-lg leading-none font-extrabold tracking-tight text-slate-900">
                  Campus<span className="text-emerald-700">Pulse</span>
                </span>
                <span className="mt-1 text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">
                  School ERP
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Button (Desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden cursor-pointer items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 md:flex"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Close Button (Mobile) */}
          <button
            onClick={() => setIsMobileOpen?.(false)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
          {/* Main Modules */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Main Modules
              </p>
            )}
            <nav className="space-y-1">{mainModules.map(renderNavItem)}</nav>
          </div>

          {/* Exam & Results */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Exam & Results
              </p>
            )}
            <nav className="space-y-1">{examModules.map(renderNavItem)}</nav>
          </div>

          {/* Management */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Management
              </p>
            )}
            <nav className="space-y-1">{managementModules.map(renderNavItem)}</nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-3">
          {/* Academic Session Indicator */}
          {!isCollapsed || isMobileOpen ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="truncate">Session: {session}</span>
              </div>
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            </div>
          ) : (
            <div
              className="flex justify-center rounded-xl bg-emerald-50 p-2 text-emerald-700"
              title={`Session: ${session}`}
            >
              <CalendarDays className="h-4 w-4" />
            </div>
          )}

          {/* School Settings Shortcut */}
          {(!isCollapsed || isMobileOpen) && (
            <Link
              href={`/school/${schoolSlug}/settings`}
              onClick={() => setIsMobileOpen?.(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <School className="h-3.5 w-3.5 text-slate-500" />
              <span>School Settings</span>
            </Link>
          )}

          {/* Version Footer */}
          {!isCollapsed || isMobileOpen ? (
            <p className="pt-1 text-center text-[11px] font-medium text-slate-400">
              v2.3 • © 2026 CampusPulse
            </p>
          ) : (
            <p className="text-center text-[9px] font-medium text-slate-400">v2.3</p>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
