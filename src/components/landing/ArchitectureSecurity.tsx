import React from "react";
import { ShieldCheck, Lock, FileCheck2, Database, KeyRound, CheckCircle2 } from "lucide-react";

export function ArchitectureSecurity() {
  const pillars = [
    {
      icon: Database,
      title: "Enforced Tenant Scoping",
      tagline: "Zero cross-tenant data contamination",
      description:
        "Every database query is strictly scoped by schoolId at both application and ORM layers. Schools exist in logical isolation with dedicated partitions and separate encryption contexts.",
      metric: "100% Boundary Isolation",
    },
    {
      icon: Lock,
      title: "Pessimistic Concurrency Locking",
      tagline: "SELECT ... FOR UPDATE transaction integrity",
      description:
        "Financial transactions utilize row-level pessimistic locks during invoice payments, refund issuance, and ledger recalculations. Zero race conditions or double payments under high load.",
      metric: "ACID Guaranteed",
    },
    {
      icon: FileCheck2,
      title: "Tamper-Evident Audit Logging",
      tagline: "Irrevocable operational compliance records",
      description:
        "Every sensitive administrative action—mark revisions, attendance corrections, fee refunds, and user invitations—is permanently captured with IP address, actor ID, and exact change deltas.",
      metric: "SOC2 & FERPA Ready",
    },
    {
      icon: KeyRound,
      title: "Role-Based Access Matrix (RBAC)",
      tagline: "Server-side cryptographic token verification",
      description:
        "Granular authorization matrices ensure teachers only access assigned sections, accountants view financial ledgers without modifying grades, and parents view only their enrolled children.",
      metric: "6 Discrete System Roles",
    },
  ];

  return (
    <section id="security" className="relative bg-zinc-950 py-20 sm:py-28">
      {/* Background ambient light */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[450px] w-[700px] rounded-full bg-indigo-500/5 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Institutional Trust &amp; Engineering
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Engineered for Military-Grade Privacy &amp; Reliability
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            School records demand the highest data integrity standards. CampusPulse eliminates the
            security pitfalls of legacy multi-tenant web applications.
          </p>
        </div>

        {/* Security Pillars Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:bg-zinc-900/90"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-400 shadow-md">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white transition-colors group-hover:text-emerald-300">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-emerald-400/90">{pillar.tagline}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{pillar.description}</p>
                </div>

                <div className="mt-6 border-t border-zinc-800/80 pt-4">
                  <span className="font-mono text-xs font-bold text-zinc-300">{pillar.metric}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Technical Architecture Badge Bar */}
        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-around gap-6 text-center">
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>FERPA Compliant Student Data Handling</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Global DPDP &amp; GDPR Privacy Controls</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>AES-256 Encryption at Rest &amp; TLS 1.3 in Flight</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>99.99% Uptime with Automated Daily Backups</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
