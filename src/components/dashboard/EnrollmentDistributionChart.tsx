"use client";

import React, { useMemo, useState } from "react";
import { EarningsChart, type EarningsPeriod } from "@/components/hairline/earnings-chart";
import { EmptyState } from "@/components/hairline/empty-state";

export interface ClassEnrollmentData {
  className: string;
  enrolledStudents: number;
  sectionsCount: number;
}

export interface ClassFeeData {
  className: string;
  collected: number;
  outstanding: number;
}

export interface EnrollmentDistributionChartProps {
  data: ClassEnrollmentData[];
  /** Class-wise fee position for the session; omit when the viewer cannot see fees. */
  feeData?: ClassFeeData[] | null;
}

type ViewId = "students" | "collected" | "outstanding";

const TITLES: Record<ViewId, string> = {
  students: "Students on roll, by class",
  collected: "Fees collected this session, by class",
  outstanding: "Fees outstanding this session, by class",
};

const COUNT_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
const RUPEE_FORMAT: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The class with the largest value, drawn in the primary colour. */
function largest(bars: { key: string; value: number }[]): string | undefined {
  return bars.reduce<{ key: string; value: number } | undefined>(
    (best, bar) => (!best || bar.value > best.value ? bar : best),
    undefined
  )?.key;
}

/**
 * Dashboard chart: one bar per class. The switch moves between students on roll and, for
 * viewers who can see fees, collected and outstanding amounts; each class keeps its bar, so
 * the bars glide between views instead of redrawing.
 */
export function EnrollmentDistributionChart({ data, feeData }: EnrollmentDistributionChartProps) {
  const [view, setView] = useState<ViewId>("students");

  const periods = useMemo<EarningsPeriod[]>(() => {
    const sections = new Map(data.map((d) => [d.className, d.sectionsCount]));
    const list: EarningsPeriod[] = [
      {
        id: "students",
        label: "Students",
        bars: data.map((d) => ({
          key: d.className,
          label: d.className,
          title: `${d.className} · ${plural(d.sectionsCount, "section", "sections")}`,
          value: d.enrolledStudents,
        })),
      },
    ];

    const fees = feeData ?? [];
    if (fees.some((r) => r.collected > 0 || r.outstanding > 0)) {
      const feeBars = (pick: (r: ClassFeeData) => number) =>
        fees.map((r) => ({
          key: r.className,
          label: r.className,
          title: `${r.className} · ${plural(sections.get(r.className) ?? 0, "section", "sections")}`,
          value: pick(r),
        }));
      list.push(
        { id: "collected", label: "Collected", bars: feeBars((r) => r.collected) },
        { id: "outstanding", label: "Outstanding", bars: feeBars((r) => r.outstanding) }
      );
    }
    return list;
  }, [data, feeData]);

  const active = periods.find((p) => p.id === view) ?? periods[0];
  const activeId = active.id as ViewId;

  if (data.length === 0) {
    return (
      <section className="shadow-card flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5">
        <h3 className="text-base font-bold text-slate-900">Students by class</h3>
        <EmptyState
          scene="chart"
          className="min-h-64 flex-1"
          title="No classes yet"
          description="Add classes and admit students to see how enrollment is spread across the school."
        />
      </section>
    );
  }

  return (
    <EarningsChart
      className="shadow-card h-full"
      title={TITLES[activeId]}
      periods={periods}
      value={activeId}
      onValueChange={(id) => setView(id as ViewId)}
      format={activeId === "students" ? COUNT_FORMAT : RUPEE_FORMAT}
      locales="en-IN"
      highlight={largest(active.bars)}
    />
  );
}

export default EnrollmentDistributionChart;
