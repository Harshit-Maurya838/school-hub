"use client";

import React from "react";
import { FileText, Plus, Search, Percent, Ban, RotateCcw, Eye } from "lucide-react";
import type { FeesController } from "./useFeesController";

export function FeesInvoicesTab({ vm }: { vm: FeesController }) {
  const {
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    invoices,
    setShowGenerateModal,
    isSchoolAdmin,
    fmt,
    getInvoiceBadge,
    openCollectPaymentModal,
    openConcessionModal,
    openRefundModal,
    openCancelModal,
    openDetailModal,
  } = vm;
  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Generate Batch Invoices</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Concession</th>
                <th className="px-4 py-3">Net Payable</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{inv.student.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {inv.student.admissionNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3">{inv.enrollment?.section?.class?.name || "All"}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmt(inv.grossAmount)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {Number(inv.concessionAmount) > 0 ? `-${fmt(inv.concessionAmount)}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{fmt(inv.netAmount)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{fmt(inv.paidAmount)}</td>
                    <td className="px-4 py-3 font-black text-rose-700">
                      {fmt(inv.outstandingAmount ?? Number(inv.netAmount) - Number(inv.paidAmount))}
                    </td>
                    <td className="px-4 py-3">{getInvoiceBadge(inv.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailModal(inv)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="View Invoice Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                          <button
                            onClick={() => openCollectPaymentModal(inv)}
                            className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            Collect
                          </button>
                        )}

                        {isSchoolAdmin && inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                          <button
                            onClick={() => openConcessionModal(inv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Apply Concession"
                          >
                            <Percent className="h-4 w-4" />
                          </button>
                        )}

                        {isSchoolAdmin && Number(inv.paidAmount) > 0 && (
                          <button
                            onClick={() => openRefundModal(inv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Process Refund"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}

                        {isSchoolAdmin && inv.status !== "CANCELLED" && (
                          <button
                            onClick={() => openCancelModal(inv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Cancel Invoice"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-xs font-semibold">No invoices found matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
