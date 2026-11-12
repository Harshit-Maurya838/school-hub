"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import type { PaymentMethod } from "./FeesTypes";
import type { FeesController } from "./useFeesController";

export function FeePaymentModals({ vm }: { vm: FeesController }) {
  const {
    schoolName,
    schoolCode,
    userName,
    actionLoading,
    showPaymentModal,
    setShowPaymentModal,
    showReceiptModal,
    setShowReceiptModal,
    selectedInvoice,
    currentReceipt,
    paymentForm,
    setPaymentForm,
    fmt,
    handleCollectPayment,
  } = vm;
  return (
    <>
      {/* ==================================================================== */}
      {/* MODAL 4: COLLECT PAYMENT & RECEIPT                                   */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Offline Fee Collection"
      >
        {selectedInvoice && (
          <form onSubmit={handleCollectPayment} className="space-y-4">
            {/* Invoice Summary Pill */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedInvoice.student.name}
                  </h4>
                  <p className="font-mono text-[11px] text-slate-400">
                    Adm: {selectedInvoice.student.admissionNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Outstanding
                  </span>
                  <p className="text-lg font-black text-rose-700">
                    {fmt(
                      selectedInvoice.outstandingAmount ??
                        Number(selectedInvoice.netAmount) - Number(selectedInvoice.paidAmount)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Amount to Collect (₹) *
              </label>
              <div className="relative">
                <span className="absolute top-2.5 left-3 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-8 text-sm font-black text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Payment Mode *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value as PaymentMethod,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DEMAND_DRAFT">Demand Draft</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Reference / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-998877 or CHQ-0012"
                  value={paymentForm.transactionReference}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, transactionReference: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Remarks / Ledger Notes
              </label>
              <input
                type="text"
                placeholder="Optional cashier remarks..."
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Collect & Print Receipt"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 5: PRINTABLE RECEIPT                                           */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Fee Collection Receipt"
        maxWidth="max-w-xl"
      >
        {currentReceipt && (
          <div className="space-y-6">
            {/* Printable Receipt Card */}
            <div
              id="printable-fee-receipt"
              className="rounded-2xl border border-slate-200 bg-white p-6 font-sans shadow-xs"
            >
              {/* Receipt Header */}
              <div className="border-b-2 border-slate-800 pb-4 text-center">
                <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                  {currentReceipt.schoolName || schoolName}
                </h2>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Affiliated Institution • School Code: {schoolCode}
                </p>
                <div className="mt-2 inline-block rounded-md bg-slate-900 px-3 py-0.5 text-[10px] font-black tracking-widest text-white uppercase">
                  Fee Payment Receipt
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="my-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Receipt Number:</p>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {currentReceipt.receiptNumber}
                  </p>
                  <p className="mt-2 text-slate-400">Payment Date:</p>
                  <p className="font-semibold text-slate-800">
                    {new Date(currentReceipt.paymentDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-slate-400">Invoice Number:</p>
                  <p className="font-mono font-bold text-slate-900">
                    {currentReceipt.invoiceNumber || "—"}
                  </p>
                  <p className="mt-2 text-slate-400">Payment Mode:</p>
                  <p className="font-semibold text-slate-800 uppercase">
                    {currentReceipt.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Student Information Box */}
              <div className="space-y-1 rounded-xl bg-slate-50 p-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{currentReceipt.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission Number:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {currentReceipt.admissionNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Class & Section:</span>
                  <span className="font-semibold text-slate-800">
                    {currentReceipt.className || "Class 10"} {currentReceipt.sectionName || "A"}
                  </span>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="my-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
                <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
                  Amount Received
                </p>
                <p className="text-2xl font-black text-emerald-700">
                  {fmt(currentReceipt.amountReceived)}
                </p>
                {currentReceipt.transactionReference && (
                  <p className="mt-1 font-mono text-[11px] text-emerald-800">
                    Ref: {currentReceipt.transactionReference}
                  </p>
                )}
              </div>

              {/* Remaining Balance Summary */}
              <div className="space-y-1 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Total Invoiced:</span>
                  <span className="font-semibold text-slate-800">
                    {fmt(currentReceipt.invoicedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Paid to Date:</span>
                  <span className="font-semibold text-emerald-700">
                    {fmt(currentReceipt.totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                  <span>Remaining Dues:</span>
                  <span className="text-rose-700">{fmt(currentReceipt.remainingBalance)}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 flex justify-between border-t border-slate-200 pt-6 text-[10px] text-slate-400">
                <div>
                  <p>Recorded by: {currentReceipt.recordedByName || userName}</p>
                  <p>Computer generated receipt</p>
                </div>
                <div className="text-right">
                  <div className="mb-1 ml-auto h-8 w-32 border-b border-slate-300" />
                  <p className="font-bold text-slate-600">Authorized Signature</p>
                </div>
              </div>
            </div>

            {/* Print and Close Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
