"use client";

import React, { useState } from "react";
import { Calculator, Clock, DollarSign, FileText, Sparkles, ArrowRight } from "lucide-react";

export function RoiCalculator() {
  const [studentCount, setStudentCount] = useState<number>(850);
  const [monthlyTuition, setMonthlyTuition] = useState<number>(350);

  // Calculations
  const hoursSavedPerMonth = Math.round(studentCount * 0.06);
  const annualPrintingSavings = Math.round(studentCount * 22);
  const annualFeeRecovery = Math.round(studentCount * monthlyTuition * 12 * 0.025);
  const totalAnnualValue = Math.round(
    hoursSavedPerMonth * 12 * 25 + annualPrintingSavings + annualFeeRecovery
  );

  return (
    <section id="calculator" className="relative bg-zinc-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
            <Calculator className="h-3.5 w-3.5" />
            Instant Return on Investment
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Calculate Your School’s Annual Efficiency &amp; Savings
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            See how much administrative time and operational expense your school will save by
            replacing manual registers, paper invoices, and disconnected systems.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-2xl sm:p-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Sliders Column */}
            <div className="space-y-8 lg:col-span-6">
              {/* Slider 1: Student Count */}
              <div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <label htmlFor="student-slider" className="text-zinc-200">
                    Total Enrolled Students
                  </label>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {studentCount.toLocaleString()} Students
                  </span>
                </div>
                <input
                  id="student-slider"
                  type="range"
                  min="100"
                  max="4000"
                  step="50"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
                />
                <div className="mt-1.5 flex justify-between font-mono text-[11px] text-zinc-500">
                  <span>100 Students</span>
                  <span>2,000 Students</span>
                  <span>4,000+ Students</span>
                </div>
              </div>

              {/* Slider 2: Monthly Fee */}
              <div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <label htmlFor="tuition-slider" className="text-zinc-200">
                    Average Monthly Tuition / Student
                  </label>
                  <span className="font-mono text-base font-bold text-indigo-400">
                    ${monthlyTuition} / mo
                  </span>
                </div>
                <input
                  id="tuition-slider"
                  type="range"
                  min="50"
                  max="1200"
                  step="25"
                  value={monthlyTuition}
                  onChange={(e) => setMonthlyTuition(Number(e.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-indigo-500"
                />
                <div className="mt-1.5 flex justify-between font-mono text-[11px] text-zinc-500">
                  <span>$50/mo</span>
                  <span>$600/mo</span>
                  <span>$1,200+/mo</span>
                </div>
              </div>

              {/* Qualitative bullet factors */}
              <div className="space-y-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-zinc-200">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Key Impact Drivers Included in Calculation:
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Automated attendance roll call saves 30-45 minutes per teacher daily. Automated
                  SMS reminders reduce fee default rates by 2.5%. Elimination of paper registers,
                  printed report cards, and receipt slips cuts printing costs directly.
                </p>
              </div>
            </div>

            {/* Calculated Results Card */}
            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-indigo-950/30 p-6 shadow-xl sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                    Estimated Annual Value Created
                  </span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    ROI &gt; 800%
                  </span>
                </div>

                <div className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  ${totalAnnualValue.toLocaleString()}
                  <span className="block text-xs font-normal text-zinc-400 sm:ml-2 sm:inline">
                    per academic year
                  </span>
                </div>

                {/* Submetrics grid */}
                <div className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-800/80 pt-6 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      Time Saved
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">
                      {hoursSavedPerMonth}h <span className="text-[10px] text-zinc-400">/ mo</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Teacher roll calls &amp; reports</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <DollarSign className="h-3.5 w-3.5 text-teal-400" />
                      Fee Recovery
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">
                      ${annualFeeRecovery.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-zinc-500">Defaulter reduction</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      Paper &amp; Print
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">
                      ${annualPrintingSavings.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-zinc-500">Direct paper savings</p>
                  </div>
                </div>

                {/* CTA inside calculator */}
                <div className="mt-8">
                  <a
                    href="/register-school"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-98"
                  >
                    Unlock These Savings with 14-Day Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
