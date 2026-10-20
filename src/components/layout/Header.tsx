"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  Globe,
  LifeBuoy,
  LogOut,
  Settings,
  Menu,
  Shield,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

function getFormattedDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return now.toLocaleDateString("en-IN", options);
}

export interface HeaderProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  userName: string;
  userRole: string;
  userEmail: string;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
}

export function Header({
  schoolSlug,
  schoolName,
  schoolCode,
  userName,
  userRole,
  userEmail,
  onOpenSearch,
  onToggleMobileMenu,
}: HeaderProps) {
  const router = useRouter();
  const [greeting] = useState(getGreeting);
  const [currentDateFormatted] = useState(getFormattedDate);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push(`/login?callbackUrl=/school/${schoolSlug}`);
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SM";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md transition-all sm:px-6">
        {/* Left: Mobile hamburger + Greeting + School Name + Code */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="cursor-pointer rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden text-xs font-medium text-slate-500 lg:inline">
                {greeting}
              </span>
              <h1 className="truncate font-sans text-sm font-black tracking-tight text-slate-900 uppercase sm:text-base">
                {schoolName}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-md border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {schoolCode}
              </span>
              <span className="hidden rounded-md border border-emerald-100/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 sm:inline">
                {currentDateFormatted || "20 Oct 2026"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions & User Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Pill */}
          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
            title="Toggle Language (Hindi / English)"
            type="button"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-600" />
            <span className={language === "hi" ? "font-extrabold text-emerald-700" : ""}>अ</span>
            <span className="text-slate-300">/</span>
            <span className={language === "en" ? "font-extrabold text-emerald-700" : ""}>A</span>
          </button>

          {/* Global Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100"
            title="Search anything (Ctrl+K)"
            type="button"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 lg:inline">
              ⌘K
            </kbd>
          </button>

          {/* Notification Bell Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative cursor-pointer rounded-xl border border-slate-200/80 p-2 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              title="Notifications"
              type="button"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-white" />
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="animate-in fade-in absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl duration-150">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">System Notifications</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    Active
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="rounded-xl bg-emerald-50/50 p-2.5 transition-colors hover:bg-emerald-50">
                    <p className="font-bold text-slate-800">School Active</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {schoolName} verified and operational.
                    </p>
                  </div>
                  <div className="rounded-xl p-2.5 transition-colors hover:bg-slate-50">
                    <p className="font-bold text-slate-800">Multi-Tenant Routing</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Session validated for tenant: {schoolSlug}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-2.5 pl-1.5 shadow-xs transition-colors hover:bg-slate-50"
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-xs font-bold text-white shadow-xs">
                {initials}
              </div>
              <div className="hidden flex-col text-left leading-none sm:flex">
                <span className="max-w-[120px] truncate text-xs font-bold text-slate-800">
                  {userName}
                </span>
                <span className="mt-0.5 max-w-[120px] truncate text-[10px] font-medium text-emerald-600">
                  {userRole}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="animate-in fade-in absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl duration-150">
                <div className="border-b border-slate-100 p-3">
                  <p className="truncate text-xs font-bold text-slate-900">{userName}</p>
                  <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    <Shield className="h-3 w-3" />
                    <span>{userRole}</span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href={`/school/${schoolSlug}/settings`}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>School Settings</span>
                  </Link>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSupportModal(true);
                    }}
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <LifeBuoy className="h-4 w-4 text-slate-400" />
                    <span>Help & Support</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Support Dialog */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">CampusPulse Support</h3>
            <p className="text-xs leading-relaxed text-slate-500">
              For administrative assistance with your School Management instance, email support or
              consult the setup prerequisites.
            </p>
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">School Code:</span> {schoolCode}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Tenant:</span> {schoolSlug}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Support Desk:</span>{" "}
                support@campuspulse.internal
              </p>
            </div>
            <button
              onClick={() => setShowSupportModal(false)}
              type="button"
              className="w-full cursor-pointer rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
