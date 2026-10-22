import React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 font-sans text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 p-0.5 shadow-md">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Campus<span className="text-emerald-400">Pulse</span>
              </span>
            </Link>

            <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
              The next-generation multi-tenant school operating system. Empowering educators with
              notebook attendance registers, automated fee collections, exam gradebooks, and
              uncompromising tenant isolation.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[11px] font-medium text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                All Systems Operational (99.99%)
              </div>
              <span className="font-mono text-[11px] text-zinc-500">v2.4 LTS</span>
            </div>
          </div>

          {/* Column 1: Core Modules */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-white uppercase">
              Platform Modules
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Digital Attendance
                </a>
              </li>
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Fees &amp; Financial Ledger
                </a>
              </li>
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Examinations &amp; Report Cards
                </a>
              </li>
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Academic Sessions &amp; Classes
                </a>
              </li>
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Faculty Roster &amp; Allocation
                </a>
              </li>
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Parent-Guardian Portal
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-white uppercase">
              Institutional Solutions
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <a href="#solutions" className="transition-colors hover:text-white">
                  For School Principals
                </a>
              </li>
              <li>
                <a href="#solutions" className="transition-colors hover:text-white">
                  For Classroom Teachers
                </a>
              </li>
              <li>
                <a href="#solutions" className="transition-colors hover:text-white">
                  For School Accountants
                </a>
              </li>
              <li>
                <a href="#solutions" className="transition-colors hover:text-white">
                  For Multi-Campus Trusts
                </a>
              </li>
              <li>
                <a href="#calculator" className="transition-colors hover:text-white">
                  School ROI Calculator
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition-colors hover:text-white">
                  Predictable Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Security */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-white uppercase">
              Portals &amp; Trust
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/login" className="transition-colors hover:text-white">
                  Portal Login
                </Link>
              </li>
              <li>
                <Link href="/register-school" className="transition-colors hover:text-white">
                  Register Your School
                </Link>
              </li>
              <li>
                <a href="#security" className="transition-colors hover:text-white">
                  Multi-Tenant Security
                </a>
              </li>
              <li>
                <a href="#security" className="transition-colors hover:text-white">
                  FERPA &amp; DPDP Compliance
                </a>
              </li>
              <li>
                <Link href="/forget-password" className="transition-colors hover:text-white">
                  Password Recovery
                </Link>
              </li>
              <li>
                <Link href="/platform" className="transition-colors hover:text-white">
                  Super Admin Console
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 pt-8 text-xs text-zinc-500 sm:flex-row">
          <p>© 2026 CampusPulse Inc. All rights reserved. Enterprise School Operating System.</p>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              100% Tenant-Isolated SaaS
            </span>
            <a href="#faq" className="transition-colors hover:text-zinc-300">
              FAQ
            </a>
            <a href="#security" className="transition-colors hover:text-zinc-300">
              Security Notice
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
