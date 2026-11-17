"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, setLanguage, useT } from "@/lib/i18n";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Power,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const focusRing =
  "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";

export const toolButtonClass = `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 ${focusRing}`;

/** Closes a popover on outside pointer-down or Escape. */
export function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void
) {
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

interface ToolPopoverProps {
  id: string;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Visible trigger text; hidden on narrow screens. */
  triggerText?: React.ReactNode;
  className?: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}

/** Top-bar button that toggles an anchored panel with a titled header. */
export function ToolPopover({
  id,
  label,
  title,
  icon: Icon,
  triggerText,
  className = "",
  panelClassName = "w-72",
  children,
}: ToolPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={toolButtonClass}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
      >
        <Icon className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        {triggerText && <span className="hidden xl:inline">{triggerText}</span>}
        <ChevronDown
          className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform xl:block ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={title}
          className={`absolute right-0 z-50 mt-2 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ${panelClassName}`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-800 uppercase">
              <Icon className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              {title}
            </p>
            <button
              type="button"
              onClick={close}
              className={`cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
              aria-label={`Close ${title}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {children(close)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Re-renders once a minute; renders nothing on the server to avoid hydration drift. */
function subscribeMinute(callback: () => void) {
  const id = window.setInterval(callback, 15_000);
  return () => window.clearInterval(id);
}
function getMinuteSnapshot() {
  return Math.floor(Date.now() / 60_000);
}
function useCurrentMinute(): Date | null {
  const minute = useSyncExternalStore(subscribeMinute, getMinuteSnapshot, () => null);
  return minute === null ? null : new Date(minute * 60_000);
}

function MonthGrid({ today }: { today: Date }) {
  const { t, locale } = useT();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1));

  const navClass = `cursor-pointer rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 ${focusRing}`;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900" aria-live="polite">
          {cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })}
        </p>
        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 ${focusRing}`}
            >
              {t("Today")}
            </button>
          )}
          <button
            type="button"
            onClick={() => shift(-1)}
            className={navClass}
            aria-label={t("Previous month")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className={navClass}
            aria-label={t("Next month")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-[11px] font-bold text-slate-400 uppercase">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const isToday = isCurrentMonth && day === today.getDate();
          const isSunday = (firstWeekday + day - 1) % 7 === 0;
          return (
            <span
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold ${
                isToday
                  ? "bg-emerald-700 text-white"
                  : isSunday
                    ? "text-rose-600"
                    : "text-slate-700"
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarTool({ className }: { className?: string }) {
  const { t, locale } = useT();
  const now = useCurrentMinute();
  const triggerText = now && (
    <span className="inline-flex flex-col items-start leading-tight">
      <span className="text-sm font-bold text-slate-900">
        {now.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}
      </span>
      <span className="font-mono text-[10px] text-slate-500">
        {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
      </span>
    </span>
  );

  return (
    <ToolPopover
      id="topbar-calendar"
      label={t("Open calendar")}
      title={t("Calendar")}
      icon={CalendarDays}
      triggerText={triggerText}
      className={className}
      panelClassName="w-80"
    >
      {() => (now ? <MonthGrid today={now} /> : null)}
    </ToolPopover>
  );
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

/** Minimal language switch: shows the current language, dropdown lists only the choices. */
export function LanguageTool({ className = "" }: { className?: string }) {
  const { t, language } = useT();
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => {
    document.documentElement.lang = current.code;
  }, [current.code]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${t("Language")}: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="topbar-language"
        className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 ${focusRing}`}
      >
        {current.label}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id="topbar-language"
          role="listbox"
          aria-label={t("Choose language")}
          className="absolute right-0 z-50 mt-2 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {LANGUAGES.map((l) => {
            const selected = l.code === current.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setLanguage(l.code);
                    close();
                  }}
                  className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${focusRing} ${
                    selected ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {l.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export function LogoutIconButton({ redirectTo = "/auth" }: { redirectTo?: string }) {
  const router = useRouter();
  const { t } = useT();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error("Sign-out failed", err);
      setLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      aria-label={t(loggingOut ? "Signing out" : "Logout")}
      className="inline-flex shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-rose-600 transition-colors hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-xs font-semibold underline underline-offset-2">{t("Logout")}</span>
      {loggingOut ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <Power className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
      )}
    </button>
  );
}
