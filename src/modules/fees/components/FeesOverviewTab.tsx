"use client";

import React from "react";
import {
  CreditCard,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Percent,
  User,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import type { FeesController } from "./useFeesController";

export function FeesOverviewTab({ vm }: { vm: FeesController }) {
  const { setActiveTab, overview, invoices, fmt, openCollectPaymentModal } = vm;
  return (
    <div className="space-y-6">
      {/* Key Financial Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Gross Invoiced"
          value={Number(overview?.invoicedGross || 0)}
          currency
          subtitle={`${overview?.totalInvoices || 0} active student invoices`}
          variant="default"
          icon={FileText}
        />
        <StatCard
          title="Net Collections"
          value={Number(overview?.netCollections || 0)}
          currency
          subtitle={`Gross collected: ${fmt(overview?.amountCollected || 0)}`}
          variant="emerald"
          icon={CheckCircle2}
        />
        <StatCard
          title="Outstanding Balance"
          value={Number(overview?.outstandingAmount || 0)}
          currency
          subtitle={`${overview?.counts?.overdue || 0} overdue invoices`}
          variant="alert"
          icon={AlertTriangle}
        />
        <StatCard
          title="Concessions & Refunds"
          value={Number(overview?.concessions || 0)}
          currency
          subtitle={`Refunds processed: ${fmt(overview?.totalRefunds || 0)}`}
          variant="default"
          icon={Percent}
        />
      </div>

      {/* Breakdown & Quick Status Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
            Invoice Status Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800">Fully Paid</span>
              </div>
              <span className="text-xs font-black text-emerald-700">
                {overview?.counts?.paid || 0}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-amber-50/50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-800">Partially Paid</span>
              </div>
              <span className="text-xs font-black text-amber-700">
                {overview?.counts?.partiallyPaid || 0}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50/50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-800">Overdue Liabilities</span>
              </div>
              <span className="text-xs font-black text-rose-700">
                {overview?.counts?.overdue || 0}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span className="text-xs font-bold text-slate-800">Issued / Current</span>
              </div>
              <span className="text-xs font-black text-slate-700">
                {overview?.counts?.issued || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
            Collections by Payment Method
          </h3>
          {overview?.paymentMethods && Object.keys(overview.paymentMethods).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(overview.paymentMethods).map(([method, total]) => (
                <div
                  key={method}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {method.replace("_", " ")}
                  </span>
                  <span className="text-xs font-black text-slate-900">{fmt(total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
              <CreditCard className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">No payment records yet</p>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-5 shadow-xs">
          <div>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
              Cashier & Accounting Desk
            </span>
            <h3 className="mt-2 text-base font-black text-slate-900">Instant Payment Counter</h3>
            <p className="mt-1 text-xs text-slate-600">
              Collect partial or full fees with offline cashier receipts, bank reconciliations, and
              verified remaining balances.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => {
                if (invoices.length > 0) openCollectPaymentModal(invoices[0]);
                else setActiveTab("invoices");
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700"
            >
              <DollarSign className="h-4 w-4" />
              <span>Record Fee Collection</span>
            </button>
            <button
              onClick={() => setActiveTab("student-account")}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white py-2 text-xs font-bold text-amber-900 hover:bg-amber-50"
            >
              <User className="h-4 w-4 text-amber-700" />
              <span>Lookup Student Fee Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
