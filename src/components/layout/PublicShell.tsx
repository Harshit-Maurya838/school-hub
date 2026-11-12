import React from "react";
import Link from "next/link";
import { LogIn, School } from "lucide-react";
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

/**
 * Sign-in / registration card: centred brand header, a two-tab switch between
 * /login and /register-school, then the active form.
 */
export function AuthShell({
  active,
  children,
}: {
  active: "login" | "register";
  children: React.ReactNode;
}) {
  const tabs = [
    { key: "login", href: "/login", label: "Sign In", icon: LogIn },
    { key: "register", href: "/register-school", label: "Register School", icon: School },
  ] as const;

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-10 font-sans text-slate-800 antialiased sm:items-center sm:px-6">
      <div className="shadow-card w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col items-center gap-3 border-b border-slate-100 bg-gradient-to-b from-emerald-50/70 to-white px-6 pt-8 pb-6 text-center">
          <Link
            href="/"
            aria-label="Classic Giga home"
            className="rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4 focus-visible:outline-none"
          >
            <BrandEmblem size="lg" />
          </Link>
          <div>
            <BrandWordmark />
            <p className="mt-1.5 text-xs font-semibold text-emerald-700">
              School ERP &amp; Management
            </p>
          </div>
        </div>

        <nav
          aria-label="Account"
          className="grid grid-cols-2 gap-2 border-b border-slate-100 bg-slate-50/60 p-2"
        >
          {tabs.map(({ key, href, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-emerald-700"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
