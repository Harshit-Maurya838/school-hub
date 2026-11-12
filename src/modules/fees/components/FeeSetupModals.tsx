"use client";

import React from "react";
import { Ban } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import type { FeeFrequency } from "./FeesTypes";
import type { FeesController } from "./useFeesController";

export function FeeSetupModals({ vm }: { vm: FeesController }) {
  const {
    allAcademicYears,
    classes,
    feeHeads,
    feeStructures,
    actionLoading,
    showHeadModal,
    setShowHeadModal,
    showStructureModal,
    setShowStructureModal,
    showGenerateModal,
    setShowGenerateModal,
    newHead,
    setNewHead,
    newStructure,
    setNewStructure,
    generateForm,
    setGenerateForm,
    fmt,
    handleCreateFeeHead,
    handleCreateFeeStructure,
    handleGenerateInvoices,
  } = vm;
  return (
    <>
      {/* ==================================================================== */}
      {/* MODAL 1: CREATE FEE HEAD                                             */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showHeadModal}
        onClose={() => setShowHeadModal(false)}
        title="Create New Fee Head"
      >
        <form onSubmit={handleCreateFeeHead} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Fee Head Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tuition Fee"
              value={newHead.name}
              onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Code (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TUIT"
              value={newHead.code}
              onChange={(e) => setNewHead({ ...newHead, code: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium uppercase outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={2}
              placeholder="Detailed description..."
              value={newHead.description}
              onChange={(e) => setNewHead({ ...newHead, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowHeadModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? "Creating..." : "Save Fee Head"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE FEE STRUCTURE                                        */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        title="Create Fee Structure Template"
      >
        <form onSubmit={handleCreateFeeStructure} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Structure Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Class 10 Annual 2026-27"
                value={newStructure.name}
                onChange={(e) => setNewStructure({ ...newStructure, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Academic Session *
              </label>
              <select
                value={newStructure.academicYearId}
                onChange={(e) =>
                  setNewStructure({ ...newStructure, academicYearId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
              >
                {allAcademicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Applicable Class
              </label>
              <select
                value={newStructure.classId}
                onChange={(e) => setNewStructure({ ...newStructure, classId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
              >
                <option value="">All Classes (School-wide)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Billing Frequency
              </label>
              <select
                value={newStructure.frequency}
                onChange={(e) =>
                  setNewStructure({ ...newStructure, frequency: e.target.value as FeeFrequency })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
              >
                <option value="TERM">Term-wise</option>
                <option value="ANNUAL">Annual</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ONE_TIME">One-Time</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Due Date</label>
              <input
                type="date"
                value={newStructure.dueDate}
                onChange={(e) => setNewStructure({ ...newStructure, dueDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Dynamic Items Builder */}
          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                Fee Heads & Fixed Amounts
              </label>
              <button
                type="button"
                onClick={() =>
                  setNewStructure({
                    ...newStructure,
                    items: [...newStructure.items, { feeHeadId: "", amount: "" }],
                  })
                }
                className="cursor-pointer text-[11px] font-bold text-amber-700 hover:text-amber-800"
              >
                + Add Another Head
              </button>
            </div>

            <div className="space-y-2">
              {newStructure.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    required
                    value={item.feeHeadId}
                    onChange={(e) => {
                      const updated = [...newStructure.items];
                      updated[idx].feeHeadId = e.target.value;
                      setNewStructure({ ...newStructure, items: updated });
                    }}
                    className="flex-1 rounded-xl border border-slate-200 p-2 text-xs font-medium outline-none focus:border-amber-500"
                  >
                    <option value="">Select Fee Head</option>
                    {feeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.code ? `(${h.code})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="relative w-36">
                    <span className="absolute top-2 left-2.5 text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = [...newStructure.items];
                        updated[idx].amount = e.target.value;
                        setNewStructure({ ...newStructure, items: updated });
                      }}
                      className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-6 text-xs font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  {newStructure.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newStructure.items.filter((_, i) => i !== idx);
                        setNewStructure({ ...newStructure, items: updated });
                      }}
                      className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowStructureModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? "Saving..." : "Create Fee Structure"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 3: GENERATE INVOICES                                           */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Issue Student Invoices"
      >
        <form onSubmit={handleGenerateInvoices} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Fee Structure *</label>
            <select
              required
              value={generateForm.feeStructureId}
              onChange={(e) => {
                const selected = feeStructures.find((s) => s.id === e.target.value);
                setGenerateForm({
                  ...generateForm,
                  feeStructureId: e.target.value,
                  classId: selected?.class?.id || "",
                });
              }}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-amber-500"
            >
              <option value="">Select fee structure...</option>
              {feeStructures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({fmt(s.totalAmount)}) - {s.class?.name || "All Classes"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Billing Period</label>
              <input
                type="text"
                placeholder="e.g. Term 1 2026"
                value={generateForm.billingPeriod}
                onChange={(e) =>
                  setGenerateForm({ ...generateForm, billingPeriod: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Due Date</label>
              <input
                type="date"
                value={generateForm.dueDate}
                onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
            <p className="mb-1 font-bold">Immutable Snapshot Guarantee</p>
            <p className="text-[11px] text-amber-800">
              Invoices are issued as immutable snapshots. Subsequent changes to fee heads or
              structures will never rewrite historical liabilities. Duplicate prevention prevents
              generating multiple invoices for the same student and term.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {actionLoading ? "Generating..." : "Generate Invoices"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
