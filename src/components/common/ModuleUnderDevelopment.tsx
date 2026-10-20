"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, LucideIcon } from "lucide-react";

interface ModuleUnderDevelopmentProps {
  moduleName: string;
  description: string;
  icon: LucideIcon;
  schoolSlug: string;
  plannedFeatures: string[];
}

export function ModuleUnderDevelopment({
  moduleName,
  description,
  icon: Icon,
  schoolSlug,
  plannedFeatures,
}: ModuleUnderDevelopmentProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-50 text-amber-700 shadow-xs">
          <Icon className="h-8 w-8" />
        </div>

        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Planned Backend Module</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{moduleName}</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{description}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Database Integrity Notice</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            The {moduleName} module is not yet backed by database models in PostgreSQL / Prisma. In
            strict compliance with multi-tenant architecture and security requirements, mock data
            and client-side fallbacks are prohibited in production workflows.
          </p>

          <div className="border-t border-slate-200/80 pt-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Roadmap Capabilities:
            </span>
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
              {plannedFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/school/${schoolSlug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:scale-[1.02] hover:bg-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to School Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
export default ModuleUnderDevelopment;
