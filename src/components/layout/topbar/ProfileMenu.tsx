"use client";

import React, { useCallback, useRef, useState } from "react";
import { ChevronDown, Landmark, Mail, Phone, Shield } from "lucide-react";
import { getRoleDisplayName, getRoleTheme } from "@/modules/auth/services/role-ui";
import { focusRing, useDismiss } from "./TopBarWidgets";
import { useT } from "@/lib/i18n";

export interface ManagementContact {
  /** e.g. "Principal", "Management / Trust", "School Admin" */
  title: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface ProfileMenuProps {
  userName: string;
  userEmail: string;
  userRole: string;
  /** School leadership shown under the user's details; omit for platform users. */
  management?: ManagementContact[];
  managementHeading?: string;
  /** Extra actions rendered at the bottom of the panel. Receives a close callback. */
  actions?: (close: () => void) => React.ReactNode;
}

export function getInitials(name: string, fallback = "U"): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || fallback
  );
}

export function ProfileMenu({
  userName,
  userEmail,
  userRole,
  management,
  managementHeading = "School Management",
  actions,
}: ProfileMenuProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const roleName = t(getRoleDisplayName(userRole));
  const roleTheme = getRoleTheme(userRole);
  const initials = getInitials(userName);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pr-2 pl-1 transition-colors hover:border-slate-300 hover:bg-slate-50 ${focusRing}`}
        aria-label={`Account menu for ${userName}`}
        aria-expanded={open}
        aria-controls="topbar-profile-menu"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr text-[11px] font-bold text-white ${roleTheme.avatarBg}`}
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="hidden max-w-[140px] flex-col text-left leading-none lg:flex">
          <span className="truncate text-xs font-bold text-slate-800">{userName}</span>
          <span className={`mt-0.5 truncate text-[10px] font-bold ${roleTheme.badgeText}`}>
            {roleName}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id="topbar-profile-menu"
          role="dialog"
          aria-label={t("Account")}
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          {/* Identity */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr text-sm font-bold text-white ${roleTheme.avatarBg}`}
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
              {userEmail && <p className="truncate text-[11px] text-slate-500">{userEmail}</p>}
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
              >
                <Shield className="h-3 w-3" aria-hidden="true" />
                {roleName}
              </span>
            </div>
          </div>

          {/* School management */}
          {management && (
            <div className="max-h-[50vh] overflow-y-auto p-3">
              <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <Landmark className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                {t(managementHeading)}
              </p>
              {management.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-500">
                  {t("Leadership details have not been added to the school profile yet.")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {management.map((m, i) => (
                    <li
                      key={`${m.title}-${i}`}
                      className="rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <p className="text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                        {t(m.title)}
                      </p>
                      <p className="truncate text-xs font-bold text-slate-900">{m.name}</p>
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className={`mt-0.5 flex items-center gap-1.5 truncate rounded text-[11px] text-slate-600 hover:text-emerald-700 ${focusRing}`}
                        >
                          <Mail className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="truncate">{m.email}</span>
                        </a>
                      )}
                      {m.phone && (
                        <a
                          href={`tel:${m.phone}`}
                          className={`mt-0.5 flex items-center gap-1.5 rounded text-[11px] text-slate-600 hover:text-emerald-700 ${focusRing}`}
                        >
                          <Phone className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                          <span>{m.phone}</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {actions && <div className="border-t border-slate-100 p-2">{actions(close)}</div>}
        </div>
      )}
    </div>
  );
}
