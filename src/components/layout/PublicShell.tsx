import React from "react";
import Link from "next/link";
import { ClipboardCheck, ReceiptText, ShieldCheck } from "lucide-react";
import { BrandEmblem, BrandWordmark } from "@/components/common/Brand";

/**
 * Brand lockup for surfaces outside the school workspace (landing, sign-in,
 * registration, invitations). Mirrors the sidebar emblem in a flat fill.
 */
export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 focus-visible:outline-none"
    >
      <BrandEmblem />
      <BrandWordmark />
    </Link>
  );
}

const widths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
} as const;

export interface PublicShellProps {
  children: React.ReactNode;
  /** Width of the centred sheet. */
  width?: keyof typeof widths;
  /** Optional element on the right of the top bar (e.g. a sign-in link). */
  aside?: React.ReactNode;
}

/** Page frame for public and pre-sign-in screens: slate desk, brand bar, one white sheet. */
export function PublicShell({ children, width = "md", aside }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <BrandMark />
        {aside}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:px-6 sm:pt-0">
        <div
          className={`w-full ${widths[width]} shadow-card rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/** Title block at the top of a public sheet. */
export function PublicSheetHeader({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      {icon}
      <h1
        className={`text-2xl font-black tracking-tight text-balance text-slate-900 ${icon ? "mt-4" : ""}`}
      >
        {title}
      </h1>
      {children && <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>}
    </div>
  );
}

export default PublicShell;

/** What a school gets, stated as the product's own guarantees (see PRODUCT.md). */
const AUTH_GUARANTEES = [
  {
    icon: ClipboardCheck,
    title: "Registers lock once submitted",
    body: "Attendance becomes a record. Corrections are audited, never silent.",
  },
  {
    icon: ShieldCheck,
    title: "Marks are reviewed before parents see them",
    body: "Entry, review and publication are separate steps with a clear owner.",
  },
  {
    icon: ReceiptText,
    title: "Every payment gets a numbered receipt",
    body: (
      <>
        Sequential receipts like <span className="font-mono text-slate-700">REC-20260412-0007</span>
        , with reversals and refunds on the record.
      </>
    ),
  },
];

/**
 * Sign-in / registration page: a brand column stating what the school gets, beside a
 * sheet whose header holds the Sign in / Register school switch.
 */
export function AuthShell({
  switcher,
  children,
}: {
  switcher: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      <div className="mx-auto grid max-w-6xl content-start lg:min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:content-stretch lg:gap-16 lg:px-8">
        <aside className="px-4 pt-6 sm:px-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-0 lg:py-12">
          <BrandMark />
          <div className="hidden lg:block">
            <h2 className="max-w-sm text-3xl leading-tight font-black tracking-tight text-balance text-slate-900">
              Your school&apos;s records, kept like a well-run register.
            </h2>
            <ul className="mt-8 max-w-sm divide-y divide-slate-200 border-y border-slate-200">
              {AUTH_GUARANTEES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3.5 py-4">
                  <Icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="hidden text-xs text-slate-500 lg:block">
            For CBSE and state-board schools across India.
          </p>
        </aside>

        <main className="flex items-start px-4 pt-6 pb-16 sm:px-6 lg:px-0 lg:pt-24 lg:pb-12">
          <div className="shadow-card w-full rounded-2xl border border-slate-200/80 bg-white">
            <div className="border-b border-slate-100 p-2">{switcher}</div>

            <div className="px-5 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-9">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Title block at the top of a sign-in or registration panel. */
export function AuthPanelHeader({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-black tracking-tight text-balance text-slate-900">{title}</h1>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
      )}
    </div>
  );
}

/** Pill primary action used with the Hairline controls on the sign-in and registration sheets. */
export const authPrimaryButtonClass =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
