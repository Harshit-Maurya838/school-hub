"use client";

import React from "react";
import type { FeesController } from "./useFeesController";

export function FeesReportsTab({ vm }: { vm: FeesController }) {
  const {
    schoolName,
    classSummaries,
    collectionsReport,
    setShowReceiptModal,
    setCurrentReceipt,
    fmt,
  } = vm;
  return (
    <div className="space-y-6">
      {/* Class-wise Collection Summary Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
          Class-wise Fee Collection Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase">
                <th className="py-2.5">Class</th>
                <th className="py-2.5">Students</th>
                <th className="py-2.5">Gross Billed</th>
                <th className="py-2.5">Concessions</th>
                <th className="py-2.5">Net Billed</th>
                <th className="py-2.5">Collected</th>
                <th className="py-2.5">Outstanding</th>
                <th className="py-2.5">Collection %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {classSummaries.map((cs) => (
                <tr key={cs.classId} className="hover:bg-slate-50/50">
                  <td className="py-3 font-bold text-slate-900">{cs.className}</td>
                  <td className="py-3">{cs.studentCount}</td>
                  <td className="py-3">{fmt(cs.invoicedGross)}</td>
                  <td className="py-3 font-semibold text-emerald-600">{fmt(cs.concessions)}</td>
                  <td className="py-3 font-bold">{fmt(cs.invoicedNet)}</td>
                  <td className="py-3 font-bold text-emerald-700">{fmt(cs.collected)}</td>
                  <td className="py-3 font-bold text-rose-700">{fmt(cs.outstanding)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${Math.min(100, Number(cs.collectionPercentage))}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold">{cs.collectionPercentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Collections Log */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h3 className="mb-4 text-xs font-black tracking-wider text-slate-400 uppercase">
          Recent Offline Payment Receipts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase">
                <th className="py-2.5">Receipt #</th>
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Student</th>
                <th className="py-2.5">Method</th>
                <th className="py-2.5">Ref #</th>
                <th className="py-2.5">Amount</th>
                <th className="py-2.5">Recorded By</th>
                <th className="py-2.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {collectionsReport.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="py-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                  <td className="py-3 text-slate-500">
                    {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="py-3 font-bold text-slate-900">
                    {p.invoice?.student?.name || "Student"}
                  </td>
                  <td className="py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-slate-500">
                    {p.transactionReference || "—"}
                  </td>
                  <td className="py-3 font-black text-emerald-700">{fmt(p.amount)}</td>
                  <td className="py-3 text-slate-500">{p.recordedBy?.name || "Staff"}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setCurrentReceipt({
                          receiptNumber: p.receiptNumber,
                          paymentDate: p.paymentDate,
                          amountReceived: p.amount,
                          paymentMethod: p.paymentMethod,
                          transactionReference: p.transactionReference,
                          remarks: p.remarks,
                          invoiceNumber: p.invoice?.invoiceNumber,
                          invoiceTitle: p.invoice?.title,
                          schoolName: schoolName,
                          studentName: p.invoice?.student?.name,
                          admissionNumber: p.invoice?.student?.admissionNumber,
                          className: p.invoice?.enrollment?.section?.class?.name,
                          sectionName: p.invoice?.enrollment?.section?.name,
                          invoicedAmount: p.invoice?.netAmount,
                          totalPaid: p.invoice?.paidAmount,
                          remainingBalance:
                            Number(p.invoice?.netAmount || 0) - Number(p.invoice?.paidAmount || 0),
                          recordedByName: p.recordedBy?.name,
                        });
                        setShowReceiptModal(true);
                      }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
