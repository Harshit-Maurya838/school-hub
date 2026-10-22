import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, LogIn } from "lucide-react";

export interface CtaBannerProps {
  userDestination?: string;
  isLoggedIn?: boolean;
}

export function CtaBanner({ userDestination = "/login", isLoggedIn = false }: CtaBannerProps) {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-indigo-950/60 p-8 shadow-2xl backdrop-blur-2xl sm:p-14">
          {/* Background ambient accents */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-4 py-1 text-xs font-semibold text-emerald-400 shadow-inner">
              <Sparkles className="h-3.5 w-3.5" />
              Launch Your Institution Today
            </div>

            <h2 className="mt-6 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-tight">
              Ready to Modernize Your School’s Digital Infrastructure?
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              Eliminate paper registers, fee collection discrepancies, and grading chaos. Experience
              the power of an all-in-one educational operating system built with institutional
              security.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {isLoggedIn ? (
                <Link
                  href={userDestination}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 transition-all hover:scale-102 hover:brightness-110 active:scale-98"
                >
                  Return to Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register-school"
                    className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-2xl shadow-emerald-500/30 transition-all hover:scale-102 hover:shadow-emerald-500/40 active:scale-98"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-200" />
                    Register Your School (14-Day Free Trial)
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-6 py-4 text-sm font-semibold text-zinc-200 shadow-sm backdrop-blur-md transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                  >
                    <LogIn className="h-4 w-4 text-zinc-400" />
                    Sign In to Portal
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Instant Workspace Provisioning
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Free Setup &amp; Migration Support
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
