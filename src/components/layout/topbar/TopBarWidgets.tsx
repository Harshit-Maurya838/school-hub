"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
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
// Calculator
// ---------------------------------------------------------------------------

type Operator = "+" | "-" | "×" | "÷";

function applyOperator(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  return String(Number.parseFloat(value.toPrecision(12)));
}

function CalculatorPad() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [freshEntry, setFreshEntry] = useState(true);

  const inputDigit = (digit: string) => {
    if (display === "Error" || freshEntry) {
      setDisplay(digit === "." ? "0." : digit);
      setFreshEntry(false);
      return;
    }
    if (digit === "." && display.includes(".")) return;
    if (display.length >= 14) return;
    setDisplay(display === "0" && digit !== "." ? digit : display + digit);
  };

  const chooseOperator = (op: Operator) => {
    const current = Number.parseFloat(display);
    if (stored !== null && operator && !freshEntry) {
      const result = formatResult(applyOperator(stored, current, operator));
      setDisplay(result);
      setStored(result === "Error" ? null : Number.parseFloat(result));
    } else if (display !== "Error") {
      setStored(current);
    }
    setOperator(op);
    setFreshEntry(true);
  };

  const evaluate = () => {
    if (stored === null || !operator) return;
    const result = formatResult(applyOperator(stored, Number.parseFloat(display), operator));
    setDisplay(result);
    setStored(null);
    setOperator(null);
    setFreshEntry(true);
  };

  const clear = () => {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setFreshEntry(true);
  };

  const backspace = () => {
    if (freshEntry || display === "Error") return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { key } = e;
    if (/^[0-9.]$/.test(key)) inputDigit(key);
    else if (key === "+" || key === "-") chooseOperator(key);
    else if (key === "*") chooseOperator("×");
    else if (key === "/") chooseOperator("÷");
    else if (key === "=" || key === "Enter") evaluate();
    else if (key === "Backspace") backspace();
    else if (key === "Delete" || key.toLowerCase() === "c") clear();
    else return;
    e.preventDefault();
  };

  const keyClass = `flex h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-bold transition-colors ${focusRing}`;
  const digitClass = `${keyClass} bg-slate-50 text-slate-800 hover:bg-slate-100`;
  const opClass = (op: Operator) =>
    `${keyClass} ${operator === op && freshEntry ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`;

  return (
    <div className="space-y-3 p-4" onKeyDown={onKeyDown}>
      <output
        aria-live="polite"
        className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right"
      >
        <span className="block h-4 font-mono text-[11px] text-slate-400">
          {stored !== null && operator ? `${formatResult(stored)} ${operator}` : ""}
        </span>
        <span className="block truncate font-mono text-2xl font-bold text-slate-900">
          {display}
        </span>
      </output>
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={clear}
          className={`${keyClass} bg-rose-50 text-rose-700 hover:bg-rose-100`}
        >
          C
        </button>
        <button type="button" onClick={backspace} className={digitClass} aria-label="Backspace">
          ⌫
        </button>
        <button
          type="button"
          onClick={() => chooseOperator("÷")}
          className={opClass("÷")}
          aria-label="Divide"
        >
          ÷
        </button>
        <button
          type="button"
          onClick={() => chooseOperator("×")}
          className={opClass("×")}
          aria-label="Multiply"
        >
          ×
        </button>
        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={digitClass}>
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => chooseOperator("-")}
          className={opClass("-")}
          aria-label="Subtract"
        >
          −
        </button>
        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={digitClass}>
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => chooseOperator("+")}
          className={opClass("+")}
          aria-label="Add"
        >
          +
        </button>
        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={digitClass}>
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={evaluate}
          className={`${keyClass} row-span-2 h-auto bg-emerald-700 text-white hover:bg-emerald-800`}
          aria-label="Equals"
        >
          =
        </button>
        <button
          type="button"
          onClick={() => inputDigit("0")}
          className={`${digitClass} col-span-2`}
        >
          0
        </button>
        <button
          type="button"
          onClick={() => inputDigit(".")}
          className={digitClass}
          aria-label="Decimal point"
        >
          .
        </button>
      </div>
    </div>
  );
}

export function CalculatorTool({ className }: { className?: string }) {
  return (
    <ToolPopover
      id="topbar-calculator"
      label="Open calculator"
      title="Quick Calculator"
      icon={Calculator}
      triggerText="Calc"
      className={className}
      panelClassName="w-72"
    >
      {() => <CalculatorPad />}
    </ToolPopover>
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
          {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 ${focusRing}`}
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => shift(-1)}
            className={navClass}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className={navClass}
            aria-label="Next month"
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
  const now = useCurrentMinute();
  const triggerText = now
    ? now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <ToolPopover
      id="topbar-calendar"
      label="Open calendar"
      title="Calendar"
      icon={CalendarDays}
      triggerText={triggerText && <span className="font-mono">{triggerText}</span>}
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

export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
] as const;

const LANGUAGE_STORAGE_KEY = "cg-language";
const languageListeners = new Set<() => void>();

function readLanguage(): string {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "en";
  } catch (err) {
    console.error("Unable to read language preference", err);
    return "en";
  }
}

function subscribeLanguage(callback: () => void) {
  languageListeners.add(callback);
  return () => languageListeners.delete(callback);
}

function writeLanguage(code: string) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch (err) {
    console.error("Unable to save language preference", err);
  }
  document.documentElement.lang = code;
  languageListeners.forEach((l) => l());
}

export function LanguageTool({ className }: { className?: string }) {
  const language = useSyncExternalStore(subscribeLanguage, readLanguage, () => "en");
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = current.code;
  }, [current.code]);

  return (
    <ToolPopover
      id="topbar-language"
      label={`Language: ${current.label}`}
      title="Language"
      icon={Languages}
      triggerText={current.native}
      className={className}
      panelClassName="w-56"
    >
      {(close) => (
        <ul className="p-2" role="listbox" aria-label="Choose language">
          {LANGUAGES.map((l) => {
            const selected = l.code === current.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    writeLanguage(l.code);
                    close();
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${focusRing} ${
                    selected ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{l.native}</span>
                  <span className="text-[11px] font-medium text-slate-400">{l.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ToolPopover>
  );
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export function LogoutIconButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();
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
      aria-label={loggingOut ? "Signing out" : "Sign out"}
      title="Sign out"
      className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loggingOut ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Power className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
