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
import { getRoleDisplayName } from "@/modules/auth/services/role-ui";
import { BrandEmblem, BrandWordmark } from "@/components/common/Brand";
import { useT } from "@/lib/i18n";

export interface SidebarProps {
  schoolSlug: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  userRole?: string;
}

export function Sidebar({
  schoolSlug,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
  userRole = "SCHOOL_ADMIN",
}: SidebarProps) {
  const router = useRouter();
  const { t } = useT();
  const rawPathname = usePathname() || "";
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(rawPathname);
  const [, startNavTransition] = useTransition();

  if (rawPathname !== prevPathname) {
    setPrevPathname(rawPathname);
    setPendingHref(null);
  }

  const pathname = pendingHref ?? rawPathname;
  const roleName = t(getRoleDisplayName(userRole));

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
        title={isCollapsed ? t(item.label) : undefined}
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
          <span className="flex-1 truncate text-left">{t(item.label)}</span>
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
          className="fixed inset-x-0 top-16 bottom-0 z-30 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 left-0 z-30 flex h-[calc(100dvh-4rem)] flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-64 md:w-20" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Sidebar toolbar: collapse (desktop only) */}
        <div
          className={`hidden items-center justify-end gap-2 border-b border-slate-100 p-3 md:flex ${
            isCollapsed && !isMobileOpen ? "md:flex-col" : ""
          }`}
        >
          {/* Collapse Button (Desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden cursor-pointer items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none md:flex"
            aria-label={t(isCollapsed ? "Expand Sidebar" : "Collapse Sidebar")}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Close Button (Mobile) */}
          <button
            onClick={() => setIsMobileOpen?.(false)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none md:hidden"
            aria-label={t("Close menu")}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
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
                title={isCollapsed ? t("Platform Console") : undefined}
              >
                <Shield className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="flex-1 truncate">{t("Platform Console")}</span>
                )}
              </Link>
            </div>
          )}

          {/* Main Modules */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {t(isTeacher ? "Teaching Desk" : isAccountant ? "Accounts Desk" : "Main Modules")}
              </p>
            )}
            <nav className="space-y-1">{mainModules.map(renderNavItem)}</nav>
          </div>

          {/* Exam & Results */}
          {examModules.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  {t("Exam & Results")}
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
                  {t("Management")}
                </p>
              )}
              <nav className="space-y-1">{managementModules.map(renderNavItem)}</nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-3">
          <Link
            href={`/school/${schoolSlug}`}
            aria-label="Academix AI dashboard"
            onClick={() => setIsMobileOpen?.(false)}
            className={`flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
              isCollapsed && !isMobileOpen ? "md:justify-center" : ""
            }`}
          >
            <BrandEmblem />
            {(!isCollapsed || isMobileOpen) && (
              <span className="flex flex-col">
                <BrandWordmark />
                <span className="mt-0.5 text-[10px] font-medium text-slate-500">
                  © 2026 · {roleName}
                </span>
              </span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
