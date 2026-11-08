"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  CreditCard,
  LifeBuoy,
  Menu,
  School,
  Settings,
  Shield,
} from "lucide-react";
import { canManageSettings } from "@/modules/auth/services/role-ui";
import { Modal } from "@/components/common/Modal";
import {
  CalculatorTool,
  CalendarTool,
  LanguageTool,
  LogoutIconButton,
  focusRing,
} from "./topbar/TopBarWidgets";
import { ProfileMenu, type ManagementContact } from "./topbar/ProfileMenu";

const menuItemClass = `flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 ${focusRing}`;

export interface HeaderProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  udiseCode?: string | null;
  currentSession: string;
  userName: string;
  userRole: string;
  userEmail: string;
  management: ManagementContact[];
  onToggleMobileMenu: () => void;
}

/**
 * Full-width school top bar.
 * Left: school identity. Right (in order): session · calculator · calendar ·
 * language · profile (with school management) · logout.
 */
export function Header({
  schoolSlug,
  schoolName,
  schoolCode,
  udiseCode,
  currentSession,
  userName,
  userRole,
  userEmail,
  management,
  onToggleMobileMenu,
}: HeaderProps) {
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-md sm:px-5">
        {/* Left: school identity */}
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onToggleMobileMenu}
            className={`cursor-pointer rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden ${focusRing}`}
            aria-label="Open navigation menu"
            type="button"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link
            href={`/school/${schoolSlug}`}
            className={`flex min-w-0 items-center gap-3 rounded-xl ${focusRing}`}
          >
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white sm:flex">
              <School className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-black tracking-tight text-slate-900 uppercase sm:text-base">
                {schoolName}
              </span>
              <span className="truncate font-mono text-[11px] text-slate-500">
                {udiseCode ? (
                  <>
                    UDISE: <span className="font-semibold text-slate-700">{udiseCode}</span>
                    <span className="hidden sm:inline">
                      {" · "}Code:{" "}
                      <span className="font-semibold text-slate-700">{schoolCode}</span>
                    </span>
                  </>
                ) : (
                  <>
                    School code: <span className="font-semibold text-slate-700">{schoolCode}</span>
                  </>
                )}
              </span>
            </span>
          </Link>
        </div>

        {/* Right: tools */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span
            className="hidden h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 lg:inline-flex"
            title="Current academic session"
          >
            <CalendarClock className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span className="sr-only">Current session:</span>
            <span>Session {currentSession}</span>
          </span>

          <CalculatorTool className="hidden sm:block" />
          <CalendarTool className="hidden sm:block" />
          <LanguageTool />

          <ProfileMenu
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            management={management}
            actions={(close) => (
              <>
                <p className="px-3 pt-1 pb-2 text-[11px] font-semibold text-emerald-800 lg:hidden">
                  Session {currentSession}
                </p>
                {userRole === "SUPER_ADMIN" && (
                  <Link href="/platform" onClick={close} className={menuItemClass}>
                    <Shield className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>Platform Console</span>
                  </Link>
                )}
                {canManageSettings(userRole) && (
                  <Link
                    href={`/school/${schoolSlug}/settings`}
                    onClick={close}
                    className={menuItemClass}
                  >
                    <Settings className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>School Settings</span>
                  </Link>
                )}
                {userRole === "TEACHER" && (
                  <Link
                    href={`/school/${schoolSlug}/attendance`}
                    onClick={close}
                    className={menuItemClass}
                  >
                    <CalendarCheck2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>Take Attendance</span>
                  </Link>
                )}
                {userRole === "ACCOUNTANT" && (
                  <Link
                    href={`/school/${schoolSlug}/fees`}
                    onClick={close}
                    className={menuItemClass}
                  >
                    <CreditCard className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>Fees Management</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setShowSupportModal(true);
                  }}
                  className={menuItemClass}
                >
                  <LifeBuoy className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>Help & Support</span>
                </button>
              </>
            )}
          />

          <LogoutIconButton redirectTo={`/login?callbackUrl=/school/${schoolSlug}`} />
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
            className={`w-full cursor-pointer rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-offset-2 ${focusRing}`}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}

export default Header;
