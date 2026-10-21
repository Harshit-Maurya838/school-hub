"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  BookOpen,
  CalendarCheck2,
  Settings,
  ArrowRight,
  X,
  UserPlus,
  CalendarDays,
  Shield,
  CreditCard,
} from "lucide-react";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolSlug: string;
  userRole?: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  schoolSlug,
  userRole = "SCHOOL_ADMIN",
}: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isTeacher = userRole === "TEACHER";
  const isAccountant = userRole === "ACCOUNTANT";

  const allQuickLinks = [
    ...(isSuperAdmin
      ? [
          {
            label: "Platform Admin Console",
            href: "/platform",
            icon: Shield,
            badge: "Platform",
            roles: ["SUPER_ADMIN"],
          },
        ]
      : []),
    {
      label: "Dashboard Overview",
      href: `/school/${schoolSlug}`,
      icon: BookOpen,
      badge: "Overview",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"],
    },
    {
      label: isTeacher
        ? "Student Class Roster"
        : isAccountant
          ? "Student Billing Roll"
          : "Student Directory",
      href: `/school/${schoolSlug}/students`,
      icon: Users,
      badge: "Students",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"],
    },
    {
      label: "New Student Admission",
      href: `/school/${schoolSlug}/students/new`,
      icon: UserPlus,
      badge: "Admission",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      label: "Daily Attendance Register",
      href: `/school/${schoolSlug}/attendance`,
      icon: CalendarCheck2,
      badge: "Attendance",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
    },
    {
      label: "Fees Management Desk",
      href: `/school/${schoolSlug}/fees`,
      icon: CreditCard,
      badge: "Finance",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    },
    {
      label: isTeacher ? "Curriculum & Grade Levels" : "Academic Setup & Overview",
      href: `/school/${schoolSlug}/academics`,
      icon: BookOpen,
      badge: "Academics",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
    },
    {
      label: "Academic Sessions / Calendar",
      href: `/school/${schoolSlug}/academics/sessions`,
      icon: CalendarDays,
      badge: "Sessions",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      label: "Classes & Sections",
      href: `/school/${schoolSlug}/academics/classes`,
      icon: BookOpen,
      badge: "Classes",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
      label: "School Settings & Profile",
      href: `/school/${schoolSlug}/settings`,
      icon: Settings,
      badge: "Settings",
      roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
  ];

  const quickLinks = allQuickLinks.filter((item) => item.roles.includes(userRole));

  const filteredLinks = query.trim()
    ? quickLinks.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.badge.toLowerCase().includes(query.toLowerCase())
      )
    : quickLinks;

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-20 backdrop-blur-sm duration-150">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-4 py-3.5">
          <Search className="mr-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search screens, student actions, academics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-600"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Results / Quick Actions */}
        <div className="max-h-96 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Navigation & Actions
            </p>
            <div className="space-y-1">
              {filteredLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <div
                    key={link.label}
                    onClick={() => handleSelect(link.href)}
                    className="group flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-colors hover:bg-emerald-50/70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-950">
                        {link.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-800">
                        {link.badge}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600" />
                    </div>
                  </div>
                );
              })}
              {filteredLinks.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching screens or actions found for &quot;{query}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-400">
          <span>Press ESC to dismiss</span>
          <span>Fast school navigation</span>
        </div>
      </div>
    </div>
  );
}

export default GlobalSearchModal;
