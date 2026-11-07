"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  CalendarDays,
  X,
  Shield,
} from "lucide-react";
import { getRoleDisplayName, getRoleTheme } from "@/modules/auth/services/role-ui";
import { BrandEmblem, BrandWordmark } from "@/components/common/Brand";

export interface SidebarProps {
  schoolSlug: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  session?: string;
  userRole?: string;
}

export function Sidebar({
  schoolSlug,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
  session = "Current Session",
  userRole = "SCHOOL_ADMIN",
}: SidebarProps) {
  const router = useRouter();
  const rawPathname = usePathname() || "";
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(rawPathname);
  const [, startNavTransition] = useTransition();

  if (rawPathname !== prevPathname) {
    setPrevPathname(rawPathname);
    setPendingHref(null);
  }

  const pathname = pendingHref ?? rawPathname;
  const roleTheme = getRoleTheme(userRole);
  const roleName = getRoleDisplayName(userRole);

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isTeacher = userRole === "TEACHER";
  const isAccountant = userRole === "ACCOUNTANT";

  // Build role-specific main modules
  const allMainModules = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: `/school/${schoolSlug}`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "PARENT", "STUDENT"],
      isActive:
        pathname === `/school/${schoolSlug}` || pathname === `/school/${schoolSlug}/dashboard`,
    },
    {
      id: "attendance",
      label: isTeacher ? "Take Attendance" : "Daily Attendance",
      icon: CalendarCheck2,
      href: `/school/${schoolSlug}/attendance`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
      isActive: pathname.startsWith(`/school/${schoolSlug}/attendance`),
    },
    {
      id: "students",
      label: isTeacher
        ? "Student Roster"
        : isAccountant
          ? "Student Billing Roll"
          : "Manage Students",
      icon: Users,
      href: `/school/${schoolSlug}/students`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"],
      isActive: pathname.startsWith(`/school/${schoolSlug}/students`),
    },
    {
      id: "classes",
      label: isTeacher ? "Curriculum & Classes" : "Class & Subjects",
      icon: BookOpen,
      href: `/school/${schoolSlug}/academics`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
      isActive:
        pathname.startsWith(`/school/${schoolSlug}/academics`) &&
        !pathname.startsWith(`/school/${schoolSlug}/academics/sessions`),
    },
    {
      id: "staff",
      label: "Staff Directory",
      icon: UserCheck,
      href: `/school/${schoolSlug}/staff`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      isActive: pathname.startsWith(`/school/${schoolSlug}/staff`),
    },
    {
      id: "fees",
      label: "Fees Management",
      icon: CreditCard,
      href: `/school/${schoolSlug}/fees`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
      isActive: pathname.startsWith(`/school/${schoolSlug}/fees`),
    },
  ];

  const mainModules = allMainModules.filter((m) => m.roles.includes(userRole));

  const allExamModules = [
    {
      id: "exams",
      label: isTeacher ? "Marks & Exams" : "Exam & Results",
      icon: GraduationCap,
      href: `/school/${schoolSlug}/exams`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
      isActive: pathname.startsWith(`/school/${schoolSlug}/exams`),
    },
  ];

  const examModules = allExamModules.filter((m) => m.roles.includes(userRole));

  const allManagementModules = [
    {
      id: "academic-settings",
      label: "Academic Settings",
      icon: CalendarDays,
      href: `/school/${schoolSlug}/settings/academic`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      isActive:
        pathname.startsWith(`/school/${schoolSlug}/settings/academic`) ||
        pathname.startsWith(`/school/${schoolSlug}/academics/sessions`),
    },
    {
      id: "settings",
      label: "School Settings",
      icon: Settings,
      href: `/school/${schoolSlug}/settings`,
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      isActive:
        pathname === `/school/${schoolSlug}/settings` ||
        (pathname.startsWith(`/school/${schoolSlug}/settings`) &&
          !pathname.startsWith(`/school/${schoolSlug}/settings/academic`)),
    },
  ];

  const managementModules = allManagementModules.filter((m) => m.roles.includes(userRole));

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen?.(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  // Pre-warm router cache for accessible modules so sidebar navigation is instant
  useEffect(() => {
    const accessibleHrefs = [
      `/school/${schoolSlug}`,
      `/school/${schoolSlug}/attendance`,
      `/school/${schoolSlug}/students`,
      `/school/${schoolSlug}/academics`,
      `/school/${schoolSlug}/staff`,
      `/school/${schoolSlug}/fees`,
      `/school/${schoolSlug}/exams`,
      `/school/${schoolSlug}/settings/academic`,
      `/school/${schoolSlug}/settings`,
    ];
    accessibleHrefs.forEach((href) => router.prefetch(href));
  }, [router, schoolSlug]);

  const renderNavItem = (item: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    href: string;
    isActive: boolean;
  }) => {
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        href={item.href}
        prefetch={true}
        onMouseEnter={() => router.prefetch(item.href)}
        onTouchStart={() => router.prefetch(item.href)}
        onClick={() => {
          startNavTransition(() => {
            setPendingHref(item.href);
          });
          setIsMobileOpen?.(false);
        }}
        title={isCollapsed ? item.label : undefined}
        aria-current={item.isActive ? "page" : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
          item.isActive
            ? "bg-emerald-50 font-semibold text-emerald-800"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        } ${isCollapsed ? "md:justify-center md:px-2" : ""}`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 transition-colors ${
            item.isActive ? "text-emerald-700" : "text-slate-500 group-hover:text-slate-700"
          }`}
          strokeWidth={item.isActive ? 2.2 : 1.75}
          aria-hidden="true"
        />

        {(!isCollapsed || isMobileOpen) && (
          <span className="flex-1 truncate text-left">{item.label}</span>
        )}

        {/* Active Pill Bar */}
        {item.isActive && (!isCollapsed || isMobileOpen) && (
          <span className="h-4 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
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
            aria-label="Classic Giga dashboard"
            className="flex items-center gap-3 overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <BrandEmblem size="lg" />
            {(!isCollapsed || isMobileOpen) && <BrandWordmark />}
          </Link>

          {/* Collapse Button (Desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden cursor-pointer items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none md:flex"
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
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
          {/* Platform Admin Console Shortcut */}
          {isSuperAdmin && (
            <div>
              <Link
                href="/platform"
                onClick={() => setIsMobileOpen?.(false)}
                className={`group flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100/70 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                  isCollapsed ? "md:justify-center md:px-2" : ""
                }`}
                title={isCollapsed ? "Platform Console" : undefined}
              >
                <Shield className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="flex-1 truncate">Platform Console</span>
                )}
              </Link>
            </div>
          )}

          {/* Main Modules */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {isTeacher ? "Teaching Desk" : isAccountant ? "Accounts Desk" : "Main Modules"}
              </p>
            )}
            <nav className="space-y-1">{mainModules.map(renderNavItem)}</nav>
          </div>

          {/* Exam & Results */}
          {examModules.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Exam & Results
                </p>
              )}
              <nav className="space-y-1">{examModules.map(renderNavItem)}</nav>
            </div>
          )}

          {/* Management */}
          {managementModules.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Management
                </p>
              )}
              <nav className="space-y-1">{managementModules.map(renderNavItem)}</nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-3">
          {/* User Role Card */}
          {!isCollapsed || isMobileOpen ? (
            <div
              className={`flex items-center justify-between rounded-xl border px-3 py-1.5 text-[11px] font-bold ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
            >
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{roleName}</span>
              </div>
              <span className="text-[10px] uppercase">Role</span>
            </div>
          ) : (
            <div
              className={`flex justify-center rounded-xl p-2 text-xs font-bold ${roleTheme.badgeBg} ${roleTheme.badgeText}`}
              title={`Role: ${roleName}`}
            >
              <Shield className="h-4 w-4" aria-label={`Role: ${roleName}`} />
            </div>
          )}

          {/* Academic Session Indicator */}
          {!isCollapsed || isMobileOpen ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span className="truncate">Session: {session}</span>
              </div>
            </div>
          ) : (
            <div
              className="flex justify-center rounded-xl bg-emerald-50 p-2 text-emerald-700"
              title={`Session: ${session}`}
            >
              <CalendarDays className="h-4 w-4" aria-label={`Session: ${session}`} />
            </div>
          )}

          {(!isCollapsed || isMobileOpen) && (
            <p className="pt-1 text-center text-[11px] font-medium text-slate-500">
              © 2026 Classic Giga
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
