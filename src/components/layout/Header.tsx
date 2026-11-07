"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Settings,
  Menu,
  Shield,
  CalendarCheck2,
  CreditCard,
} from "lucide-react";
import {
  getRoleDisplayName,
  getRoleTheme,
  canManageSettings,
} from "@/modules/auth/services/role-ui";
import { Modal } from "@/components/common/Modal";

/** Closes a popover on outside pointer-down or Escape. */
function useDismiss(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, open, close]);
}

const noopSubscribe = () => () => {};
const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

const iconButtonFocus =
  "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";
const menuItemClass = `flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 ${iconButtonFocus}`;

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
  const [loggingOut, setLoggingOut] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isApple = useSyncExternalStore(noopSubscribe, isApplePlatform, () => false);

  useDismiss(notificationsRef, showNotifications, () => setShowNotifications(false));
  useDismiss(profileRef, showProfileMenu, () => setShowProfileMenu(false));

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

  const roleName = getRoleDisplayName(userRole);
  const roleTheme = getRoleTheme(userRole);

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
            className={`cursor-pointer rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden ${iconButtonFocus}`}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
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
                {currentDateFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions & User Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button */}
          <button
            onClick={onOpenSearch}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 ${iconButtonFocus}`}
            aria-label="Search"
            aria-keyshortcuts={isApple ? "Meta+K" : "Control+K"}
            type="button"
          >
            <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span className="hidden md:inline">Search…</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 lg:inline">
              {isApple ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          {/* Notification Bell Button */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative cursor-pointer rounded-xl border border-slate-200/80 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${iconButtonFocus}`}
              aria-label="Notifications"
              aria-expanded={showNotifications}
              aria-controls="header-notifications"
              type="button"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </button>

            {showNotifications && (
              <div
                id="header-notifications"
                className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl"
              >
                <p className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-800">
                  Notifications
                </p>
                <div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
                  <Bell className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-700">You’re all caught up</p>
                  <p className="text-[11px] text-slate-500">
                    Updates about your school will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Platform Console Shortcut for SUPER_ADMIN */}
          {userRole === "SUPER_ADMIN" && (
            <Link
              href="/platform"
              className={`hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:inline-flex ${iconButtonFocus}`}
            >
              <Shield className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span>Platform Console</span>
            </Link>
          )}

          {/* User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-2.5 pl-1.5 shadow-xs transition-colors hover:bg-slate-50 ${iconButtonFocus}`}
              aria-label={`Account menu for ${userName}`}
              aria-expanded={showProfileMenu}
              aria-controls="header-profile-menu"
              type="button"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr ${roleTheme.avatarBg} text-xs font-bold text-white shadow-xs`}
              >
                {initials}
              </div>
              <div className="hidden flex-col text-left leading-none sm:flex">
                <span className="max-w-[120px] truncate text-xs font-bold text-slate-800">
                  {userName}
                </span>
                <span
                  className={`mt-0.5 max-w-[120px] truncate text-[10px] font-bold ${roleTheme.badgeText}`}
                >
                  {roleName}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div
                id="header-profile-menu"
                className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl"
              >
                <div className="border-b border-slate-100 p-3">
                  <p className="truncate text-xs font-bold text-slate-900">{userName}</p>
                  <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
                  <div
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
                  >
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    <span>{roleName}</span>
                  </div>
                </div>

                <div className="py-1">
                  {userRole === "SUPER_ADMIN" && (
                    <Link
                      href="/platform"
                      onClick={() => setShowProfileMenu(false)}
                      className={menuItemClass}
                    >
                      <Shield className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <span>Platform Console</span>
                    </Link>
                  )}

                  {canManageSettings(userRole) && (
                    <Link
                      href={`/school/${schoolSlug}/settings`}
                      onClick={() => setShowProfileMenu(false)}
                      className={menuItemClass}
                    >
                      <Settings className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <span>School Settings</span>
                    </Link>
                  )}

                  {userRole === "TEACHER" && (
                    <Link
                      href={`/school/${schoolSlug}/attendance`}
                      onClick={() => setShowProfileMenu(false)}
                      className={menuItemClass}
                    >
                      <CalendarCheck2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <span>Take Attendance</span>
                    </Link>
                  )}

                  {userRole === "ACCOUNTANT" && (
                    <Link
                      href={`/school/${schoolSlug}/fees`}
                      onClick={() => setShowProfileMenu(false)}
                      className={menuItemClass}
                    >
                      <CreditCard className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <span>Fees Management</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSupportModal(true);
                    }}
                    type="button"
                    className={`cursor-pointer ${menuItemClass}`}
                  >
                    <LifeBuoy className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>Help & Support</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    type="button"
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 ${iconButtonFocus}`}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <Modal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        title="Help & Support"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            For help with your school workspace, contact your platform administrator and share the
            details below.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
            <dt className="font-semibold text-slate-800">School code</dt>
            <dd className="font-mono text-slate-700">{schoolCode}</dd>
            <dt className="font-semibold text-slate-800">Workspace</dt>
            <dd className="truncate font-mono text-slate-700">{schoolSlug}</dd>
          </dl>
          <button
            onClick={() => setShowSupportModal(false)}
            type="button"
            className={`w-full cursor-pointer rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-offset-2 ${iconButtonFocus}`}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}

export default Header;
