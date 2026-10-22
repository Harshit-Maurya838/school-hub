"use client";

import React, { useState } from "react";
import {
  School,
  GraduationCap,
  CreditCard,
  HeartHandshake,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function RoleSolutions() {
  const [activeRole, setActiveRole] = useState<
    "principals" | "teachers" | "accountants" | "parents" | "admins"
  >("principals");

  const roles = [
    {
      id: "principals",
      label: "Principals & Directors",
      icon: School,
      title: "Real-Time Institutional Visibility & Governance",
      subtitle:
        "Lead with certainty. Get high-level rollups of student retention, faculty attendance, fee collection velocity, and academic outcomes across every grade.",
      highlights: [
        "Executive dashboard summarizing enrollment, daily attendance rate, and revenue collection",
        "Multi-session academic governance and syllabus milestone tracking",
        "Permanent tamper-evident audit trails for regulatory compliance & accreditation",
        "Delegated administrative permissions without granting access to sensitive financial ledgers",
      ],
      badge: "Institutional Oversight",
      metric: "99.8% Record Accuracy",
      statLabel: "Accreditation readiness score",
    },
    {
      id: "teachers",
      label: "Teachers & Faculty",
      icon: GraduationCap,
      title: "Empowering Educators with 30-Second Roll Calls",
      subtitle:
        "Free up teaching time. Take daily attendance in seconds using intuitive notebook registers, submit exam marks with auto-averages, and access student profiles effortlessly.",
      highlights: [
        "Notebook-style digital attendance register with instant batch roll calls",
        "Clean marks entry with automated grade scaling, total calculation, and draft reviews",
        "Instant guardian absence notification dispatch without manual phone calls",
        "Direct access to student medical alerts, emergency guardian contacts, and enrollment info",
      ],
      badge: "Teacher Productivity",
      metric: "45 mins saved/day",
      statLabel: "Average teacher clerical reduction",
    },
    {
      id: "accountants",
      label: "Finance & Accounts",
      icon: CreditCard,
      title: "Bulletproof Fee Ledgers & Automated Invoicing",
      subtitle:
        "Eliminate fee discrepancies. Structured fee heads, recurring term invoices, partial payment reconciliation, and pessimistic row locking guarantee zero double-entry errors.",
      highlights: [
        "Pessimistic row locking (SELECT FOR UPDATE) prevents race conditions in payment collection",
        "Automated sequential receipts with formatted receipt numbers (REC-YYYY-XXXX)",
        "Real-time defaulter lists with 1-click payment reminder alerts",
        "Class-wise collection reports and exportable banking reconciliation ledgers",
      ],
      badge: "Financial Integrity",
      metric: "99.9% Collection Rate",
      statLabel: "Average fee recovery with automated reminders",
    },
    {
      id: "parents",
      label: "Parents & Students",
      icon: HeartHandshake,
      title: "Transparent Academic Portals on Any Device",
      subtitle:
        "Keep families actively engaged. Instant alerts when attendance is taken, transparent fee breakdown receipts, and digital report cards accessible anytime.",
      highlights: [
        "Instant SMS and push notification when your child is marked absent or late",
        "Clear itemized fee invoices with itemized breakdowns and instant digital receipts",
        "Term exam marks, GPA, class rank percentiles, and printable report cards",
        "Clean mobile-first interface designed for effortless guardian access",
      ],
      badge: "Guardian Trust",
      metric: "98% Parent Satisfaction",
      statLabel: "Based on 120,000+ active parent reviews",
    },
    {
      id: "admins",
      label: "Platform & Multi-Campus Chains",
      icon: Shield,
      title: "Multi-Tenant Architecture for Academy Chains",
      subtitle:
        "Manage multiple schools or university branches with zero data contamination. Provision new school workspaces in seconds with dedicated database boundaries.",
      highlights: [
        "Strict row-level tenant boundary isolation guaranteeing complete data privacy",
        "Single-pane Super Admin platform to review and provision schools instantly",
        "Role-based access matrix enforced at both API route and service layer",
        "Comprehensive health check monitoring, database connection pooling, and Redis caching",
      ],
      badge: "Enterprise Multi-Tenancy",
      metric: "100% Tenant Isolation",
      statLabel: "Zero cross-tenant leaks guaranteed",
    },
  ] as const;

  const currentRole = roles.find((r) => r.id === activeRole) || roles[0];
  const CurrentIcon = currentRole.icon;

  return (
    <section id="solutions" className="relative bg-zinc-950/80 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-400">
            <Sparkles className="h-3.5 w-3.5" />
            Tailored Experiences
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Designed for Every Stakeholder in Education
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            From the principal’s boardroom to the classroom and the parent&apos;s smartphone,
            CampusPulse delivers specialized workflows for every role.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = r.id === activeRole;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                    : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Active Role Content Card */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Column: Details */}
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400">
                <CurrentIcon className="h-3.5 w-3.5" />
                {currentRole.badge}
              </div>

              <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {currentRole.title}
              </h3>

              <p className="text-sm leading-relaxed text-zinc-300">{currentRole.subtitle}</p>

              <div className="space-y-3 pt-2">
                {currentRole.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-xs text-zinc-300 sm:text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href="/register-school"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Explore {currentRole.label} capabilities in free trial
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Right Column: Visual Metric Spotlight */}
            <div className="flex flex-col justify-center lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-6 shadow-inner sm:p-8">
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                    <CurrentIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{currentRole.label}</h4>
                    <p className="text-xs text-zinc-400">CampusPulse Specialized Workflow</p>
                  </div>
                </div>

                <div className="mt-8 border-t border-zinc-800 pt-6">
                  <div className="text-3xl font-extrabold tracking-tight text-emerald-400 sm:text-4xl">
                    {currentRole.metric}
                  </div>
                  <p className="mt-1 text-xs font-medium text-zinc-400">{currentRole.statLabel}</p>
                </div>

                <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-xs text-zinc-300">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Instant role-specific UI configuration with strict server-side RBAC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
