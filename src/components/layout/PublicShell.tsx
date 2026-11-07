import React from "react";
import Link from "next/link";
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
