"use client";

import React, { useId, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, IndianRupee } from "lucide-react";
import { formatINR } from "@/lib/utils";

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

// Validated pair (dataviz validator, light surface): register green for money that is
// in, rose for money still owed. Rose sits below 3:1 on white, so the legend and the
// exact figures in the tooltip and footer carry the values as text.
const COLLECTED_COLOR = "#047857";
const OUTSTANDING_COLOR = "#fb7185";

const axisTick = { fill: "#64748b", fontSize: 11 };

function TooltipSheet({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-36 space-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-slate-900">{label}</p>
      {children}
    </div>
  );
}

function EnrollmentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ClassEnrollmentData }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: row } = payload[0];
  return (
    <TooltipSheet label={label}>
      <p className="flex justify-between gap-4 text-slate-600">
        <span>Enrolled</span>
        <span className="font-mono font-semibold text-slate-900">{value}</span>
      </p>
      <p className="flex justify-between gap-4 text-slate-600">
        <span>Sections</span>
        <span className="font-mono font-semibold text-slate-900">{row.sectionsCount}</span>
      </p>
    </TooltipSheet>
  );
}

function FeeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: ClassFeeData }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <TooltipSheet label={label}>
      <p className="flex items-center justify-between gap-4 text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: COLLECTED_COLOR }} />
          Collected
        </span>
        <span className="font-mono font-semibold text-slate-900">{formatINR(row.collected)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: OUTSTANDING_COLOR }} />
          Outstanding
        </span>
        <span className="font-mono font-semibold text-slate-900">{formatINR(row.outstanding)}</span>
      </p>
    </TooltipSheet>
  );
}

function compactRupees(value: number): string {
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
  if (value >= 10000000) return `₹${trim(value / 10000000)}Cr`;
  if (value >= 100000) return `₹${trim(value / 100000)}L`;
  if (value >= 1000) return `₹${trim(value / 1000)}k`;
  return `₹${value}`;
}

function EmptyChart({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon className="h-8 w-8 text-slate-300" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="max-w-sm text-xs text-slate-500">{body}</p>
    </div>
  );
}

type TabKey = "enrollment" | "fees";

export function EnrollmentDistributionChart({ data, feeData }: EnrollmentDistributionChartProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("enrollment");
  const baseId = useId();
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    enrollment: null,
    fees: null,
  });

  const showFees = Array.isArray(feeData);
  const tabs: { key: TabKey; label: string }[] = showFees
    ? [
        { key: "enrollment", label: "Enrollment" },
        { key: "fees", label: "Fees" },
      ]
    : [{ key: "enrollment", label: "Enrollment" }];

  const totalStudents = data.reduce((acc, curr) => acc + (curr.enrolledStudents || 0), 0);
  const feeRows = feeData ?? [];
  const totalCollected = feeRows.reduce((acc, r) => acc + r.collected, 0);
  const totalOutstanding = feeRows.reduce((acc, r) => acc + r.outstanding, 0);
  const hasFeeActivity = feeRows.some((r) => r.collected > 0 || r.outstanding > 0);

  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (tabs.length < 2) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.key === activeTab);
    const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].key;
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  const isFees = activeTab === "fees" && showFees;

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="shadow-card flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
        <div>
          <h3 id={`${baseId}-title`} className="text-base font-bold text-slate-900">
            {isFees ? "Fees by class" : "Students by class"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isFees
              ? "Collected and outstanding amounts on this session's invoices"
              : "Active enrollments in the current session"}
          </p>
        </div>

        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="Chart view"
            className="flex shrink-0 items-center gap-1 self-start rounded-xl bg-slate-100 p-1 text-xs font-semibold"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[tab.key] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.key}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
                  onKeyDown={onTabKeyDown}
                  className={`cursor-pointer rounded-lg px-3 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                    selected
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        id={`${baseId}-panel`}
        role={tabs.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={tabs.length > 1 ? `${baseId}-tab-${activeTab}` : undefined}
        className="flex-1"
      >
        {!isFees ? (
          data.length === 0 ? (
            <EmptyChart
              icon={Users}
              title="No classes yet"
              body="Add classes and admit students to see how enrollment is spread across the school."
            />
          ) : (
            <div className="my-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="className"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    interval="preserveStartEnd"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
                  <Tooltip content={<EnrollmentTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar
                    dataKey="enrolledStudents"
                    name="Enrolled"
                    fill={COLLECTED_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        ) : !hasFeeActivity ? (
          <EmptyChart
            icon={IndianRupee}
            title="No invoices this session"
            body="Once invoices are generated from a fee structure, collected and outstanding amounts appear here by class."
          />
        ) : (
          <>
            <ul className="mt-3 flex items-center gap-4 text-xs text-slate-600" aria-hidden="true">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLLECTED_COLOR }} />
                Collected
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: OUTSTANDING_COLOR }}
                />
                Outstanding
              </li>
            </ul>
            <div className="my-2 h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeRows} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="className"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    tickFormatter={compactRupees}
                    width={56}
                  />
                  <Tooltip content={<FeeTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    stackId="fees"
                    fill={COLLECTED_COLOR}
                    stroke="#ffffff"
                    strokeWidth={2}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="outstanding"
                    name="Outstanding"
                    stackId="fees"
                    fill={OUTSTANDING_COLOR}
                    stroke="#ffffff"
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <dl className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs">
        {isFees ? (
          <>
            <div className="flex items-baseline gap-2">
              <dt className="text-slate-500">Collected</dt>
              <dd className="font-mono font-bold text-slate-900">{formatINR(totalCollected)}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-slate-500">Outstanding</dt>
              <dd className="font-mono font-bold text-rose-800">{formatINR(totalOutstanding)}</dd>
            </div>
          </>
        ) : (
          <div className="flex items-baseline gap-2">
            <dt className="text-slate-500">Total enrolled</dt>
            <dd className="font-mono font-bold text-slate-900">
              {totalStudents} {totalStudents === 1 ? "student" : "students"}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default EnrollmentDistributionChart;
