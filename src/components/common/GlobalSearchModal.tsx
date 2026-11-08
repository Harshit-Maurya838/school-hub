"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  CalendarCheck2,
  Settings,
  UserPlus,
  CalendarDays,
  Shield,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CommandPalette, type CommandItem } from "@/components/hairline/command-palette";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the ⌘K / Ctrl K hotkey opens the palette. */
  onOpen?: () => void;
  schoolSlug: string;
  userRole?: string;
}

type Role = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "ACCOUNTANT";

interface Destination {
  id: string;
  group: "Go to" | "Actions" | "Settings";
  label: string;
  description?: string;
  path: string;
  icon: LucideIcon;
  keywords?: string[];
  roles: Role[];
}

const ALL: Role[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"];

function destinations(schoolSlug: string, role: string): Destination[] {
  const base = `/school/${schoolSlug}`;
  const isTeacher = role === "TEACHER";
  const isAccountant = role === "ACCOUNTANT";

  return [
    {
      id: "platform",
      group: "Go to",
      label: "Platform admin console",
      description: "All schools and registrations",
      path: "/platform",
      icon: Shield,
      keywords: ["super", "admin", "schools"],
      roles: ["SUPER_ADMIN"],
    },
    {
      id: "dashboard",
      group: "Go to",
      label: "Dashboard",
      description: "Today at a glance",
      path: base,
      icon: LayoutDashboard,
      keywords: ["home", "overview"],
      roles: ALL,
    },
    {
      id: "students",
      group: "Go to",
      label: isTeacher ? "Class roster" : isAccountant ? "Student billing roll" : "Students",
      description: "Profiles, guardians and enrollments",
      path: `${base}/students`,
      icon: Users,
      keywords: ["pupils", "directory", "children"],
      roles: ALL,
    },
    {
      id: "attendance",
      group: "Go to",
      label: "Attendance",
      description: "Daily registers",
      path: `${base}/attendance`,
      icon: CalendarCheck2,
      keywords: ["register", "present", "absent"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
    },
    {
      id: "fees",
      group: "Go to",
      label: "Fees",
      description: "Invoices, collections and dues",
      path: `${base}/fees`,
      icon: CreditCard,
      keywords: ["finance", "payment", "invoice", "receipt"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    },
    {
      id: "exams",
      group: "Go to",
      label: isTeacher ? "Marks entry" : "Examinations",
      description: "Schedules, marks and results",
      path: `${base}/exams`,
      icon: GraduationCap,
      keywords: ["marks", "results", "tests"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
    },
    {
      id: "academics",
      group: "Go to",
      label: "Academics",
      description: "Classes, sections and subjects",
      path: `${base}/academics`,
      icon: BookOpen,
      keywords: ["curriculum", "subjects"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
    },
    {
      id: "staff",
      group: "Go to",
      label: "Staff",
      description: "Teachers and accountants",
      path: `${base}/staff`,
      icon: Building2,
      keywords: ["teachers", "faculty", "employees"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      id: "admit",
      group: "Actions",
      label: "Admit a student",
      path: `${base}/students/new`,
      icon: UserPlus,
      keywords: ["admission", "new student", "enroll"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      id: "classes",
      group: "Actions",
      label: "Manage classes and sections",
      path: `${base}/academics/classes`,
      icon: Layers,
      keywords: ["section", "grade"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      id: "school-settings",
      group: "Settings",
      label: "School profile",
      description: "Identity, contacts and branding",
      path: `${base}/settings`,
      icon: Settings,
      keywords: ["profile", "udise", "address", "logo"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      id: "academic-settings",
      group: "Settings",
      label: "Academic sessions",
      description: "Years and the active session",
      path: `${base}/settings/academic`,
      icon: CalendarDays,
      keywords: ["session", "year", "term"],
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
  ].filter((d) => d.roles.includes(role as Role)) as Destination[];
}

/**
 * The ⌘K palette for the school portal: jump to any screen the viewer's role can open.
 * Opens from the sidebar's Search button or the ⌘K / Ctrl K hotkey.
 */
export function GlobalSearchModal({
  isOpen,
  onClose,
  onOpen,
  schoolSlug,
  userRole = "SCHOOL_ADMIN",
}: GlobalSearchModalProps) {
  const router = useRouter();

  const items = useMemo<CommandItem[]>(
    () =>
      destinations(schoolSlug, userRole).map(
        ({ id, group, label, description, path, icon: Icon, keywords }) => ({
          id,
          group,
          label,
          description,
          keywords,
          icon: <Icon className="h-4 w-4" aria-hidden="true" />,
          onSelect: () => router.push(path),
        })
      ),
    [router, schoolSlug, userRole]
  );

  return (
    <CommandPalette
      items={items}
      placeholder="Search screens and actions…"
      showTrigger={false}
      open={isOpen}
      onOpenChange={(next) => (next ? onOpen?.() : onClose())}
    />
  );
}

export default GlobalSearchModal;
