"use client";

import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Info } from "lucide-react";

export interface ClassEnrollmentData {
  className: string;
  enrolledStudents: number;
  sectionsCount: number;
}

export interface EnrollmentDistributionChartProps {
  data: ClassEnrollmentData[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="space-y-1 rounded-xl bg-slate-900 p-3 text-xs text-white shadow-xl">
        <p className="font-semibold text-slate-300">{label}</p>
        <p className="text-sm font-bold text-emerald-400">
          Enrolled: {payload[0].value} {payload[0].value === 1 ? "student" : "students"}
        </p>
      </div>
    );
  }
  return null;
};

export function EnrollmentDistributionChart({ data }: EnrollmentDistributionChartProps) {
  const [activeTab, setActiveTab] = useState<"enrollment" | "fees">("enrollment");

  const totalStudents = data.reduce((acc, curr) => acc + (curr.enrolledStudents || 0), 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Header & Filter */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Class Enrollment Distribution</h3>
            <span className="flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              <Users className="mr-0.5 h-3 w-3" /> Real Database Metrics
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Active student enrollment allocations grouped by scholastic class
          </p>
        </div>

        {/* Tab switch between Enrollment and Fees Placeholder */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("enrollment")}
            className={`cursor-pointer rounded-lg px-3 py-1 transition-all ${
              activeTab === "enrollment"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Enrollment
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`cursor-pointer rounded-lg px-3 py-1 transition-all ${
              activeTab === "fees"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fee Ledger
          </button>
        </div>
      </div>

      {/* Chart Area */}
      {activeTab === "enrollment" ? (
        data.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-2 p-6 text-center text-slate-400">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No classes configured yet</p>
            <p className="max-w-sm text-xs">
              Configure academic classes and admit students to visualize enrollment distributions.
            </p>
          </div>
        ) : (
          <div className="my-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="className"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="enrolledStudents"
                  fill="url(#emeraldBarGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        <div className="my-2 flex h-64 flex-col items-center justify-center space-y-3 rounded-xl bg-slate-50/60 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Fee Ledger Module Pending</h4>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Fee collection records, installments, and payment realization trends are awaiting
              backend fee engine integration. Real metrics will populate once activated.
            </p>
          </div>
        </div>
      )}

      {/* Footer Total */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span className="text-xs text-slate-500">Total Enrolled Cohort:</span>
        </div>
        <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1 font-mono text-sm font-extrabold text-emerald-800">
          {totalStudents} {totalStudents === 1 ? "Student" : "Students"}
        </span>
      </div>
    </div>
  );
}

export default EnrollmentDistributionChart;
