"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does the 14-day free trial work?",
      answer:
        "When you register your school, an isolated workspace tenant is provisioned immediately. You can test digital attendance registers, generate sample fee invoices, allocate teachers, and invite staff members. No credit card is required to begin, and you can export your data at any time.",
    },
    {
      question: "Can we import our existing student rosters and fee records from Excel or CSV?",
      answer:
        "Yes. CampusPulse features built-in CSV bulk import tools for students, guardian relationships, faculty profiles, and fee heads with pre-upload schema validation to prevent malformed records or duplicates.",
    },
    {
      question: "How does multi-tenant isolation protect our school's private data?",
      answer:
        "CampusPulse enforces strict tenant boundary isolation at the ORM and database query layer. Every read and mutation query is filtered by your dedicated schoolId. There is zero co-mingling of institutional data, guaranteeing that no other school on the platform can ever query your records.",
    },
    {
      question: "How does the attendance lock workflow prevent unauthorized edits?",
      answer:
        "Once a class teacher completes the daily roll call and locks the register, standard modification controls are disabled. Any subsequent attendance corrections must be submitted through an authorized workflow that captures the timestamp, actor ID, and documented justification in an immutable audit log.",
    },
    {
      question: "Can parents view fee balances and pay tuition online?",
      answer:
        "Yes. The parent portal allows guardians to inspect itemized invoices (tuition, laboratory, athletic amenities, transport), track pending balances, make digital payments, and download official PDF receipts stamped with sequential receipt numbers (REC-YYYY-XXXX).",
    },
    {
      question: "Can an educational trust or group manage multiple campuses?",
      answer:
        "Yes. Our Trust & Multi-Campus tier provides centralized governance across multiple affiliated institutions. Executive directors can monitor cross-campus KPIs and enrollment trends while maintaining strict operational separation for each branch's teachers and ledgers.",
    },
    {
      question: "What devices and hardware do teachers need in the classroom?",
      answer:
        "None beyond standard classroom devices. CampusPulse is a fully responsive cloud application optimized for Chromebooks, iPads, Android tablets, laptops, and smartphones. No local server installation or hardware maintenance is needed.",
    },
    {
      question: "How are examination report cards reviewed and published?",
      answer:
        "Teachers submit marks for their designated subjects into a draft register. The Head of Academics can review class-wide grade distributions, verify passing thresholds, and officially publish results to parents in one unified click.",
    },
  ];

  return (
    <section id="faq" className="relative bg-zinc-950/80 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
            <HelpCircle className="h-3.5 w-3.5" />
            Frequently Asked Questions
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Everything You Need to Know
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Common questions regarding onboarding, data privacy, fee management, and school
            operations.
          </p>
        </div>

        {/* Accordion List */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-zinc-800/40"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-white sm:text-base">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-emerald-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800/60 px-5 pt-3 pb-5 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
