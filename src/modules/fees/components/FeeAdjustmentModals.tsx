"use client";

import React from "react";
import { Modal } from "@/components/common/Modal";
import type { AdjustmentType, RefundMethod } from "./FeesTypes";
import type { FeesController } from "./useFeesController";

export function FeeAdjustmentModals({ vm }: { vm: FeesController }) {
  const {
    actionLoading,
    showConcessionModal,
    setShowConcessionModal,
    showRefundModal,
    setShowRefundModal,
    showCancelModal,
    setShowCancelModal,
    selectedInvoice,
    concessionForm,
    setConcessionForm,
    refundForm,
    setRefundForm,
    cancelReason,
    setCancelReason,
    fmt,
    handleApplyConcession,
    handleProcessRefund,
    handleCancelInvoice,
  } = vm;
  return (
    <>
      {/* ==================================================================== */}
      {/* MODAL 6: APPLY CONCESSION / ADJUSTMENT                               */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showConcessionModal}
        onClose={() => setShowConcessionModal(false)}
        title="Approve Student Fee Concession"
      >
        {selectedInvoice && (
          <form onSubmit={handleApplyConcession} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-900">{selectedInvoice.student.name}</p>
              <p className="text-slate-500">
                Invoice {selectedInvoice.invoiceNumber} • Gross Amount:{" "}
                {fmt(selectedInvoice.grossAmount)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Concession Category *
                </label>
                <select
                  value={concessionForm.type}
                  onChange={(e) =>
                    setConcessionForm({ ...concessionForm, type: e.target.value as AdjustmentType })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="CONCESSION">Fee Concession</option>
                  <option value="SCHOLARSHIP">Merit Scholarship</option>
                  <option value="WAIVER">Special Waiver</option>
                  <option value="DISCOUNT">Sibling Discount</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={concessionForm.amount}
                  onChange={(e) => setConcessionForm({ ...concessionForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Approval Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="State the authorized justification for this concession..."
                value={concessionForm.reason}
                onChange={(e) => setConcessionForm({ ...concessionForm, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowConcessionModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? "Applying..." : "Approve Concession"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 7: PROCESS REFUND                                              */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Process Fee Refund"
      >
        {selectedInvoice && (
          <form onSubmit={handleProcessRefund} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-900">{selectedInvoice.student.name}</p>
              <p className="text-slate-500">
                Collected: {fmt(selectedInvoice.paidAmount)} • Existing Refunds:{" "}
                {fmt(selectedInvoice.refundedAmount || 0)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Refund Method</label>
                <select
                  value={refundForm.refundMethod}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, refundMethod: e.target.value as RefundMethod })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Refund Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="State the audit justification for this refund..."
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Process Refund"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 8: CANCEL INVOICE                                              */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Student Invoice"
      >
        {selectedInvoice && (
          <form onSubmit={handleCancelInvoice} className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <p className="font-bold">Caution: Cancellation is permanent</p>
              <p className="mt-0.5">
                Invoices with active payments cannot be cancelled unless all collections are
                refunded or reversed first.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Enter audit reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
