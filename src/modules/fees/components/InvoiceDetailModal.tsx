"use client";

import React from "react";
import { Modal } from "@/components/common/Modal";
import type { FeesController } from "./useFeesController";

export function InvoiceDetailModal({ vm }: { vm: FeesController }) {
  const { showDetailModal, setShowDetailModal, selectedInvoice, fmt, getInvoiceBadge } = vm;
  return (
    <>
      {/* ==================================================================== */}
      {/* MODAL 9: INVOICE DETAIL VIEW                                         */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ""}`}
        maxWidth="max-w-2xl"
      >
        {selectedInvoice && (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header Card */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedInvoice.title}</h4>
                <p className="text-slate-500">
                  Student:{" "}
                  <span className="font-bold text-slate-800">{selectedInvoice.student.name}</span> (
                  {selectedInvoice.student.admissionNumber})
                </p>
              </div>
              <div>{getInvoiceBadge(selectedInvoice.status)}</div>
            </div>

            {/* Line Items Breakdown */}
            <div>
              <h5 className="mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Fee Items Breakdown
              </h5>
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                      <th className="p-2.5">Head</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium">{it.headName}</td>
                        <td className="p-2.5 text-right font-bold">{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 font-semibold">
              <div>Gross Amount:</div>
              <div className="text-right text-slate-900">{fmt(selectedInvoice.grossAmount)}</div>
              <div>Approved Concessions:</div>
              <div className="text-right text-emerald-700">
                -{fmt(selectedInvoice.concessionAmount)}
              </div>
              <div className="border-t border-slate-200 pt-1 font-bold">Net Payable:</div>
              <div className="border-t border-slate-200 pt-1 text-right font-bold text-slate-900">
                {fmt(selectedInvoice.netAmount)}
              </div>
              <div>Total Paid:</div>
              <div className="text-right font-bold text-emerald-700">
                {fmt(selectedInvoice.paidAmount)}
              </div>
              <div className="border-t border-slate-200 pt-1 font-black text-rose-700">
                Outstanding:
              </div>
              <div className="border-t border-slate-200 pt-1 text-right font-black text-rose-700">
                {fmt(
                  selectedInvoice.outstandingAmount ??
                    Number(selectedInvoice.netAmount) - Number(selectedInvoice.paidAmount)
                )}
              </div>
            </div>

            {/* Payments History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div>
                <h5 className="mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Collections History
                </h5>
                <div className="space-y-1.5">
                  {selectedInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </span>
                        <span className="ml-2 text-slate-500">({p.paymentMethod})</span>
                        {p.isReversed && (
                          <span className="ml-2 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-800">
                            REVERSED
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
