"use client";

import React from "react";
import { Search, RefreshCw, User } from "lucide-react";
import type { PaymentItem, Invoice } from "./FeesTypes";
import type { FeesController } from "./useFeesController";

export function StudentAccountTab({ vm }: { vm: FeesController }) {
  const {
    studentSearchAdmission,
    setStudentSearchAdmission,
    studentAccount,
    loadingStudentAccount,
    fmt,
    getInvoiceBadge,
    handleSearchStudentAccount,
    openDetailModal,
  } = vm;
  return (
    <div className="space-y-6">
      {/* Student Search Box */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">
            Student Name or Admission Number
          </label>
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. ADM-FEE-001 or Alice..."
              value={studentSearchAdmission}
              onChange={(e) => setStudentSearchAdmission(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchStudentAccount()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearchStudentAccount}
          disabled={loadingStudentAccount}
          className="mt-5 flex cursor-pointer items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
        >
          {loadingStudentAccount ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>Lookup Ledger</span>
        </button>
      </div>

      {/* Ledger Output */}
      {studentAccount ? (
        <div className="space-y-6">
          {/* Student Summary Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{studentAccount.student.name}</h3>
                <p className="text-xs text-slate-500">
                  Admission Number:{" "}
                  <span className="font-mono font-bold text-slate-800">
                    {studentAccount.student.admissionNumber}
                  </span>{" "}
                  • Class:{" "}
                  <span className="font-bold text-slate-800">
                    {studentAccount.student.currentEnrollment?.section?.class?.name || "N/A"}{" "}
                    {studentAccount.student.currentEnrollment?.section?.name || ""}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Outstanding Dues</p>
                <p className="text-2xl font-black text-rose-700">
                  {fmt(studentAccount.summary.outstandingAmount)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</p>
                <p className="text-sm font-bold text-slate-800">
                  {fmt(studentAccount.summary.totalGross)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/50 p-3">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Concessions</p>
                <p className="text-sm font-bold text-emerald-700">
                  {fmt(studentAccount.summary.totalConcessions)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/50 p-3">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Paid</p>
                <p className="text-sm font-bold text-emerald-700">
                  {fmt(studentAccount.summary.totalPaid)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/50 p-3">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Refunded</p>
                <p className="text-sm font-bold text-amber-700">
                  {fmt(studentAccount.summary.totalRefunded)}
                </p>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h4 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
              Invoice & Billing History
            </h4>
            <div className="space-y-4">
              {studentAccount.invoices.map((inv: Invoice) => (
                <div
                  key={inv.id}
                  className="rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </span>
                      <span className="ml-2 text-xs font-bold text-slate-700">{inv.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getInvoiceBadge(inv.status)}
                      <button
                        onClick={() => openDetailModal(inv)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Net Payable: </span>
                      <span className="font-bold text-slate-900">{fmt(inv.netAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Paid: </span>
                      <span className="font-bold text-emerald-700">{fmt(inv.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Balance: </span>
                      <span className="font-bold text-rose-700">
                        {fmt(Number(inv.netAmount) - Number(inv.paidAmount))}
                      </span>
                    </div>
                  </div>

                  {/* Payment receipts under this invoice */}
                  {inv.payments && inv.payments.length > 0 && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px]">
                      <p className="mb-1 font-bold text-slate-500">Receipts Generated:</p>
                      {inv.payments.map((p: PaymentItem) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-0.5 text-slate-700"
                        >
                          <span className="font-mono font-bold text-slate-900">
                            {p.receiptNumber} ({p.paymentMethod})
                          </span>
                          <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          <User className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-xs font-semibold">
            Enter a student admission number to display their ledger
          </p>
        </div>
      )}
    </div>
  );
}
