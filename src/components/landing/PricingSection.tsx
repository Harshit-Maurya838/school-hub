"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const tiers = [
    {
      id: "starter",
      name: "Starter Academy",
      description: "Ideal for boutique preschools, prep schools, and emerging institutions.",
      priceMonthly: 99,
      priceAnnual: 79,
      studentCap: "Up to 300 Students",
      popular: false,
      features: [
        "Digital notebook attendance registers",
        "Student directory & emergency contacts",
        "Academic sessions, classes & section allocations",
        "Teacher profiles & subject assignments",
        "Automated email absentee alerts",
        "Standard email & ticket support",
        "100% Tenant-scoped security isolation",
      ],
      cta: "Start 14-Day Free Trial",
      href: "/register-school",
    },
    {
      id: "growth",
      name: "Institutional Growth",
      description: "Our most popular plan for established K-12 schools and academies.",
      priceMonthly: 249,
      priceAnnual: 199,
      studentCap: "Up to 1,500 Students",
      popular: true,
      features: [
        "Everything in Starter, plus:",
        "Automated fee engine & recurring term invoicing",
        "Pessimistic row locking for zero fee double-charging",
        "Sequential receipt numbers (REC-YYYY-XXXX)",
        "Examinations, marks entry & GPA report cards",
        "Parent & student portal access",
        "Automated SMS & push notifications for absences",
        "Priority 24/7 school operations support",
      ],
      cta: "Start 14-Day Free Trial",
      href: "/register-school",
    },
    {
      id: "enterprise",
      name: "Trust & Multi-Campus",
      description: "Engineered for school chains, collegiate trusts, and large campuses.",
      priceMonthly: 599,
      priceAnnual: 479,
      studentCap: "Unlimited Students",
      popular: false,
      features: [
        "Everything in Growth, plus:",
        "Unlimited students & multi-branch school network",
        "Centralized Super Admin governance portal",
        "Custom domain mapping (e.g., portal.yourschool.edu)",
        "White-label institutional theme branding",
        "Full legacy database migration assistance",
        "Dedicated institutional account manager & custom SLA",
        "Permanent tamper-proof compliance audit exports",
      ],
      cta: "Contact Enterprise Sales",
      href: "/register-school",
    },
  ];

  return (
    <section id="pricing" className="relative bg-zinc-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-400">
            <Sparkles className="h-3.5 w-3.5" />
            Transparent Institutional Pricing
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Predictable Plans with Zero Hidden Per-User Fees
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            All plans include unlimited staff and teacher accounts. Choose the tier that matches
            your student body capacity.
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/80 p-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                !isAnnual ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                isAnnual
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
          {tiers.map((tier) => {
            const price = isAnnual ? tier.priceAnnual : tier.priceMonthly;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-3xl p-6 backdrop-blur-2xl transition-all duration-300 sm:p-8 ${
                  tier.popular
                    ? "border-2 border-emerald-500 bg-zinc-900/90 shadow-2xl shadow-emerald-500/10 lg:-translate-y-2"
                    : "border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1 text-[11px] font-bold text-white shadow-md">
                    Most Popular Choice
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-300">
                      {tier.studentCap}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{tier.description}</p>

                  <div className="mt-6 flex items-baseline gap-1 border-t border-zinc-800/80 pt-6">
                    <span className="text-4xl font-extrabold tracking-tight text-white">
                      ${price}
                    </span>
                    <span className="text-xs text-zinc-400">/ month</span>
                    {isAnnual && (
                      <span className="ml-2 text-[11px] font-medium text-emerald-400">
                        billed annually
                      </span>
                    )}
                  </div>

                  {/* Feature checklist */}
                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
                      Included with plan:
                    </p>
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-zinc-800/80 pt-6">
                  <Link
                    href={tier.href}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
                      tier.popular
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-98"
                        : "border border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <p className="mt-2 text-center text-[10px] text-zinc-500">
                    14-day free trial • No credit card required
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free Sandbox Callout */}
        <div className="mt-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 text-center text-xs text-zinc-400">
          <p>
            Need a custom deployment for government educational ministries, state boards, or
            districts exceeding 10,000+ students?{" "}
            <a href="/register-school" className="font-semibold text-emerald-400 hover:underline">
              Contact our institutional architects
            </a>{" "}
            for on-premise, air-gapped, or hybrid cloud requirements.
          </p>
        </div>
      </div>
    </section>
  );
}
