"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck2,
  CreditCard,
  GraduationCap,
  Users,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Download,
  Send,
  Sparkles,
} from "lucide-react";

type DemoTab = "dashboard" | "attendance" | "fees" | "exams";

interface StudentAttendanceMock {
  rollNo: string;
  name: string;
  avatar: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
}

interface FeeInvoiceMock {
  id: string;
  invoiceNumber: string;
  studentName: string;
  class: string;
  amount: number;
  paidAmount: number;
  status: "PAID" | "PARTIAL" | "OVERDUE";
  dueDate: string;
}

interface ExamMarkMock {
  rollNo: string;
  studentName: string;
  math: number;
  physics: number;
  english: number;
  compSci: number;
  total: number;
  grade: string;
}

export function InteractiveProductDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");
  const [registerLocked, setRegisterLocked] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [collectedPayment, setCollectedPayment] = useState<string | null>(null);

  // Mock attendance state for interactive demo
  const [students, setStudents] = useState<StudentAttendanceMock[]>([
    { rollNo: "101", name: "Aarav Sharma", avatar: "AS", status: "PRESENT" },
    { rollNo: "102", name: "Sophia Martinez", avatar: "SM", status: "PRESENT" },
    { rollNo: "103", name: "Devon Cooper", avatar: "DC", status: "LATE" },
    { rollNo: "104", name: "Ananya Patel", avatar: "AP", status: "PRESENT" },
    { rollNo: "105", name: "Liam O'Connor", avatar: "LO", status: "ABSENT" },
    { rollNo: "106", name: "Zara Chen", avatar: "ZC", status: "EXCUSED" },
  ]);

  const updateStudentStatus = (
    rollNo: string,
    newStatus: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED"
  ) => {
    if (registerLocked) return;
    setStudents((prev) => prev.map((s) => (s.rollNo === rollNo ? { ...s, status: newStatus } : s)));
  };

  const markAllPresent = () => {
    if (registerLocked) return;
    setStudents((prev) => prev.map((s) => ({ ...s, status: "PRESENT" })));
  };

  const invoices: FeeInvoiceMock[] = [
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-0412",
      studentName: "Devon Cooper",
      class: "Grade 10-A",
      amount: 1450,
      paidAmount: 1450,
      status: "PAID",
      dueDate: "Oct 15, 2026",
    },
    {
      id: "inv-2",
      invoiceNumber: "INV-2026-0413",
      studentName: "Liam O'Connor",
      class: "Grade 10-A",
      amount: 1450,
      paidAmount: 800,
      status: "PARTIAL",
      dueDate: "Oct 25, 2026",
    },
    {
      id: "inv-3",
      invoiceNumber: "INV-2026-0414",
      studentName: "Zara Chen",
      class: "Grade 10-A",
      amount: 1450,
      paidAmount: 0,
      status: "OVERDUE",
      dueDate: "Oct 10, 2026",
    },
  ];

  const examMarks: ExamMarkMock[] = [
    {
      rollNo: "101",
      studentName: "Aarav Sharma",
      math: 94,
      physics: 88,
      english: 92,
      compSci: 98,
      total: 372,
      grade: "A+",
    },
    {
      rollNo: "102",
      studentName: "Sophia Martinez",
      math: 89,
      physics: 91,
      english: 95,
      compSci: 92,
      total: 367,
      grade: "A+",
    },
    {
      rollNo: "103",
      studentName: "Devon Cooper",
      math: 78,
      physics: 82,
      english: 85,
      compSci: 80,
      total: 325,
      grade: "B+",
    },
    {
      rollNo: "104",
      studentName: "Ananya Patel",
      math: 96,
      physics: 94,
      english: 90,
      compSci: 95,
      total: 375,
      grade: "A+",
    },
  ];

  return (
    <section id="demo" className="relative bg-zinc-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-400">
            <Sparkles className="h-3.5 w-3.5" />
            Interactive Experience
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Experience the CampusPulse Platform Live
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Click through our operational modules below to test our notebook attendance registers,
            concurrency-locked fee collections, and automated grade calculations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            id="tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "dashboard"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Executive Overview
          </button>

          <button
            type="button"
            id="tab-attendance"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "attendance"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <CalendarCheck2 className="h-4 w-4" />
            Smart Attendance Register
          </button>

          <button
            type="button"
            id="tab-fees"
            onClick={() => setActiveTab("fees")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "fees"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Fees &amp; Financial Ledger
          </button>

          <button
            type="button"
            id="tab-exams"
            onClick={() => setActiveTab("exams")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "exams"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Examinations &amp; Report Cards
          </button>
        </div>

        {/* Interactive Dashboard Window Shell */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-2xl">
          {/* Mock Browser/App Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <div className="ml-3 hidden items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-xs text-zinc-400 sm:flex">
                <span className="text-emerald-400">https://</span>
                app.campuspulse.io/school/oakridge-intl
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Oakridge International School (Live Tenant)
              </span>
              <span className="rounded-md border border-indigo-700/50 bg-indigo-950/60 px-2 py-0.5 font-mono text-[10px] font-medium text-indigo-300">
                Session 2026-27
              </span>
            </div>
          </div>

          {/* Interactive Screen Body */}
          <div className="min-h-[480px] p-4 sm:p-6 lg:p-8">
            {/* VIEW 1: EXECUTIVE DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white sm:text-xl">
                      Institutional Executive Health
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Real-time rollups from academic classes, daily registers, and fee
                      reconciliation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-lg border border-emerald-800/50 bg-emerald-950/60 px-3 py-1 text-xs font-medium text-emerald-400">
                      <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                      All 48 Sections Active
                    </span>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4 transition-all hover:border-zinc-700">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Total Enrolled</span>
                      <Users className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">1,480</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <TrendingUp className="h-3 w-3" /> +4.2% vs last term
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4 transition-all hover:border-zinc-700">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Today’s Attendance</span>
                      <CalendarCheck2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-emerald-400">96.8%</div>
                    <div className="mt-1 text-[11px] text-zinc-400">1,432 Present · 6 Absent</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4 transition-all hover:border-zinc-700">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Fees Collected (Mo)</span>
                      <CreditCard className="h-4 w-4 text-teal-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">$184,200</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-teal-400">
                      87.4% Collection velocity
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4 transition-all hover:border-zinc-700">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Faculty On Duty</span>
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">94 / 96</div>
                    <div className="mt-1 text-[11px] text-zinc-400">2 on approved leave</div>
                  </div>
                </div>

                {/* Operational Quick View */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <h4 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
                      Daily Attendance Real-Time Distribution
                    </h4>
                    <div className="mt-3 flex items-center gap-2">
                      <div
                        className="h-3 flex-1 overflow-hidden rounded-full bg-emerald-500"
                        style={{ width: "96.8%" }}
                      />
                      <div className="h-3 w-4 rounded-full bg-amber-500" />
                      <div className="h-3 w-3 rounded-full bg-rose-500" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-2">
                        <span className="font-bold text-emerald-400">1,432 (96.8%)</span>
                        <p className="text-[10px] text-zinc-400">Present On-Time</p>
                      </div>
                      <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 p-2">
                        <span className="font-bold text-amber-400">31 (2.1%)</span>
                        <p className="text-[10px] text-zinc-400">Late Marked</p>
                      </div>
                      <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 p-2">
                        <span className="font-bold text-rose-400">17 (1.1%)</span>
                        <p className="text-[10px] text-zinc-400">Absent / Excused</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <h4 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
                      Live Multi-Tenant Audit Feed
                    </h4>
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
                        <span className="flex items-center gap-2 text-zinc-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Attendance submitted for Grade 10-A
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">2 min ago</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
                        <span className="flex items-center gap-2 text-zinc-200">
                          <Receipt className="h-3.5 w-3.5 text-teal-400" />
                          Payment recorded: REC-2026-0421 ($1,450)
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">14 min ago</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-zinc-200">
                          <Lock className="h-3.5 w-3.5 text-amber-400" />
                          Midterm marks locked by Head of Academics
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">42 min ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: NOTEBOOK ATTENDANCE REGISTER */}
            {activeTab === "attendance" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Daily Attendance Roll Call</h3>
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Class 10-A • Science Section
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Click the buttons on each student row to change their status, or test batch
                      actions.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={markAllPresent}
                      disabled={registerLocked}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterLocked(!registerLocked)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        registerLocked
                          ? "bg-amber-600 text-white"
                          : "border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60"
                      }`}
                    >
                      {registerLocked ? (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Register Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5" /> Lock Register
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationSent(true);
                        setTimeout(() => setNotificationSent(false), 3000);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {notificationSent ? "Alerts Sent!" : "Notify Absent Guardians"}
                    </button>
                  </div>
                </div>

                {notificationSent && (
                  <div className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-950/60 p-3 text-xs text-indigo-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Automated SMS and in-app alerts dispatched to 1 absent guardian (Liam
                    O&apos;Connor).
                  </div>
                )}

                {/* Notebook Spine Register UI */}
                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-zinc-900/80 font-semibold text-zinc-300">
                      <tr>
                        <th className="px-3 py-2.5">Roll</th>
                        <th className="px-3 py-2.5">Student Name</th>
                        <th className="px-3 py-2.5 text-center">Current Status</th>
                        <th className="px-3 py-2.5 text-right">Quick Roll Call</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-medium">
                      {students.map((student) => {
                        const statusColors = {
                          PRESENT: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
                          LATE: "bg-amber-950/60 text-amber-400 border-amber-800/60",
                          ABSENT: "bg-rose-950/60 text-rose-400 border-rose-800/60",
                          EXCUSED: "bg-blue-950/60 text-blue-400 border-blue-800/60",
                        };

                        return (
                          <tr key={student.rollNo} className="hover:bg-zinc-900/40">
                            <td className="px-3 py-2.5 font-mono text-zinc-400">
                              {student.rollNo}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 font-mono text-[10px] text-zinc-300">
                                  {student.avatar}
                                </div>
                                <span className="font-semibold text-white">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                  statusColors[student.status]
                                }`}
                              >
                                {student.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="inline-flex gap-1">
                                {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const).map(
                                  (stateKey) => (
                                    <button
                                      key={stateKey}
                                      type="button"
                                      disabled={registerLocked}
                                      onClick={() => updateStudentStatus(student.rollNo, stateKey)}
                                      className={`rounded px-2 py-1 text-[10px] font-bold transition disabled:opacity-40 ${
                                        student.status === stateKey
                                          ? "bg-white text-zinc-950 shadow-sm"
                                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                      }`}
                                    >
                                      {stateKey[0]}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: FEES & INVOICING */}
            {activeTab === "fees" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Automated Fee Billing &amp; Invoices
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Immutable snapshots, row-level pessimistic locking, and instant sequential
                      receipts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1 font-mono text-[11px] text-indigo-300">
                      Pessimistic Lock: ACTIVE
                    </span>
                  </div>
                </div>

                {collectedPayment && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-3 text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Payment recorded for {collectedPayment}. Auto-generated receipt:{" "}
                      <span className="font-mono font-bold text-white">REC-2026-10492</span>
                    </div>
                    <span className="rounded bg-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-white">
                      Row Released
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-indigo-400">
                          {inv.invoiceNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inv.status === "PAID"
                              ? "border border-emerald-800 bg-emerald-950 text-emerald-400"
                              : inv.status === "PARTIAL"
                                ? "border border-amber-800 bg-amber-950 text-amber-400"
                                : "border border-rose-800 bg-rose-950 text-rose-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-bold text-white">{inv.studentName}</div>
                        <div className="text-xs text-zinc-400">{inv.class}</div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500">Paid / Total</span>
                          <p className="font-bold text-zinc-200">
                            ${inv.paidAmount} / ${inv.amount}
                          </p>
                        </div>
                        {inv.status !== "PAID" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCollectedPayment(inv.studentName);
                              setTimeout(() => setCollectedPayment(null), 4000);
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-emerald-500"
                          >
                            Collect Payment
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white"
                          >
                            <Download className="h-3 w-3" /> Receipt PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 4: EXAMINATIONS & GRADEBOOK */}
            {activeTab === "exams" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Examinations &amp; Automated Gradebook
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Midterm Examination 2026 • Real-time GPA computation and PDF report card
                      readiness.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      Published to Parent Portal
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-zinc-900/80 font-semibold text-zinc-300">
                      <tr>
                        <th className="px-3 py-2.5">Roll</th>
                        <th className="px-3 py-2.5">Student</th>
                        <th className="px-2 py-2.5 text-center">Math (100)</th>
                        <th className="px-2 py-2.5 text-center">Physics (100)</th>
                        <th className="px-2 py-2.5 text-center">English (100)</th>
                        <th className="px-2 py-2.5 text-center">CompSci (100)</th>
                        <th className="px-3 py-2.5 text-center">Total (400)</th>
                        <th className="px-3 py-2.5 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-medium">
                      {examMarks.map((m) => (
                        <tr key={m.rollNo} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2.5 font-mono text-zinc-400">{m.rollNo}</td>
                          <td className="px-3 py-2.5 font-bold text-white">{m.studentName}</td>
                          <td className="px-2 py-2.5 text-center font-mono text-zinc-200">
                            {m.math}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono text-zinc-200">
                            {m.physics}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono text-zinc-200">
                            {m.english}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono text-zinc-200">
                            {m.compSci}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-400">
                            {m.total}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                              {m.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer note inside dashboard mockup */}
          <div className="flex flex-wrap items-center justify-between border-t border-zinc-800/80 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Isolated PostgreSQL multi-tenant database row partitioning
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              CampusPulse Cloud v2.4 • Active Node: us-east-prod-1
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
