import React from "react";
import { CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react";

/** Text input styling. 16px on touch screens to avoid iOS zoom, 14px from `sm`. */
export function inputClass(hasError = false, extra = "") {
  return `mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-800 placeholder:text-slate-400 transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm ${
    hasError
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
      : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-500/20"
  } ${extra}`;
}

export const labelClass = "block text-sm font-semibold text-slate-700";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none";

export const textLinkClass =
  "rounded font-semibold text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-rose-700">
      {children}
    </p>
  );
}

export function Notice({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

const tileTones = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  alert: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
} as const;

/** 44px icon tile used at the top of status sheets. */
export function IconTile({
  icon: Icon,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  tone?: keyof typeof tileTones;
}) {
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tileTones[tone]}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden={true} />
    </span>
  );
}

/** Eye toggle placed inside a relatively positioned password field wrapper. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none focus-visible:ring-inset"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** Full-screen loading state on the public slate desk. */
export function PublicLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 font-sans text-sm font-medium text-slate-600"
    >
      <Spinner className="h-5 w-5 text-emerald-700" />
      {label}
    </div>
  );
}
