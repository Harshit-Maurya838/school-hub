import React from "react";
import {
  CalendarCheck2,
  BookOpen,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export function FeatureGrid() {
  const features = [
    {
      id: "attendance",
      title: "Digital Attendance Registers",
      tagline: "Notebook-grade roll calls in 30 seconds",
      description:
        "Replace messy paper logs with digital registers featuring draft, lock, and correction workflows. Instantly send automated SMS or push notifications to guardians when an absence is recorded.",
      icon: CalendarCheck2,
      accent: "from-emerald-500/20 to-teal-500/5",
      iconColor: "text-emerald-400",
      borderColor: "hover:border-emerald-500/50",
      bullets: [
        "1-click roll call (Present, Late, Absent, Excused)",
        "Lock register mechanism to prevent retroactive alterations",
        "Automated absentee alerts dispatched to parents",
        "Historical correction audit log with teacher attribution",
      ],
    },
    {
      id: "fees",
      title: "Automated Fees & Ledger Engine",
      tagline: "Zero financial discrepancies with row locking",
      description:
        "Enterprise billing with snapshotted fee structures, automated term invoices, partial payment reconciliation, and sequential human-readable receipt numbers.",
      icon: CreditCard,
      accent: "from-teal-500/20 to-indigo-500/5",
      iconColor: "text-teal-400",
      borderColor: "hover:border-teal-500/50",
      bullets: [
        "Pessimistic row locking (SELECT FOR UPDATE) prevents double-charging",
        "Snapshotted fee heads protect historical invoice integrity",
        "Partial payments, balance tracking, and auto-receipt generation",
        "Bank reconciliation and class-wise fee collection reports",
      ],
    },
    {
      id: "exams",
      title: "Examinations & Gradebook",
      tagline: "Term schedules, marks approval & report cards",
      description:
        "Complete academic evaluation lifecycle. Schedule multi-subject exams, configure maximum marks and passing criteria, review teacher submissions, and publish student report cards with one click.",
      icon: GraduationCap,
      accent: "from-indigo-500/20 to-purple-500/5",
      iconColor: "text-indigo-400",
      borderColor: "hover:border-indigo-500/50",
      bullets: [
        "Multi-term scheduling with subject weightage settings",
        "Draft → Submit → Review → Publish verification pipeline",
        "Real-time GPA, percentage, and percentile calculations",
        "Instant branded report card generation for parents",
      ],
    },
    {
      id: "academics",
      title: "Academic Sessions & Classes",
      tagline: "Curriculum structure & faculty allocations",
      description:
        "Configure academic years, class grades, section divisions, and subject curricula. Seamlessly assign class teachers and subject instructors with automated collision detection.",
      icon: BookOpen,
      accent: "from-blue-500/20 to-cyan-500/5",
      iconColor: "text-blue-400",
      borderColor: "hover:border-blue-500/50",
      bullets: [
        "Multi-session management and term rollovers",
        "Class teacher and subject-teacher mapping",
        "Section capacity management and student enrollments",
        "Curriculum subject catalogs with syllabus tracking",
      ],
    },
    {
      id: "security",
      title: "Multi-Tenant Boundary Security",
      tagline: "Strict tenant isolation & cryptographic RBAC",
      description:
        "Engineered from the ground up for zero cross-tenant contamination. Every database query is tenant-scoped by schoolId, protected by role matrices and cryptographic session tokens.",
      icon: ShieldCheck,
      accent: "from-amber-500/20 to-orange-500/5",
      iconColor: "text-amber-400",
      borderColor: "hover:border-amber-500/50",
      bullets: [
        "Enforced row-level tenant boundary isolation",
        "6 discrete user roles (Super Admin, Principal, Teacher, Accountant, Parent, Student)",
        "Permanent tamper-evident audit trails on all sensitive events",
        "FERPA, DPDP, and GDPR compliance-ready data controls",
      ],
    },
    {
      id: "staff",
      title: "Faculty & Staff Directory",
      tagline: "Comprehensive personnel & workload management",
      description:
        "Maintain teacher credentials, subject specializations, employee IDs, and joining records. Track teaching assignments and staff availability across academic terms.",
      icon: UserCheck,
      accent: "from-rose-500/20 to-pink-500/5",
      iconColor: "text-rose-400",
      borderColor: "hover:border-rose-500/50",
      bullets: [
        "Teacher profiles with employee ID and subject credentials",
        "Active teaching load distribution across sections",
        "Role-based staff invitations with secure acceptance tokens",
        "Quick search directory with department filters",
      ],
    },
  ];

  return (
    <section id="features" className="relative bg-zinc-950 py-20 sm:py-28">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Comprehensive Educational Modules
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Everything Required to Operate a Modern Institution
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Engineered as a modular monolith with decoupled domain boundaries, high-performance
            caching, and zero compromises on data integrity.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/90 ${feature.borderColor}`}
              >
                {/* Accent top glow */}
                <div
                  className={`pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${feature.accent} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`}
                />

                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-md">
                      <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                    </div>
                    <span className="rounded-full bg-zinc-800/80 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                      Module
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-white transition-colors group-hover:text-emerald-300">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-emerald-400/90">
                    {feature.tagline}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {feature.description}
                  </p>

                  <div className="mt-5 space-y-2 border-t border-zinc-800/80 pt-4">
                    {feature.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
