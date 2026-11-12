"use client";

import React from "react";
import { Layers, Plus } from "lucide-react";
import type { FeesController } from "./useFeesController";

export function FeeStructuresTab({ vm }: { vm: FeesController }) {
  const {
    feeStructures,
    setShowStructureModal,
    setShowGenerateModal,
    generateForm,
    setGenerateForm,
    isSchoolAdmin,
    fmt,
  } = vm;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Configured Fee Schedules</h2>
          <p className="text-xs text-slate-500">
            Templates mapped to classes and academic sessions for automated invoice issuance.
          </p>
        </div>
        {isSchoolAdmin && (
          <button
            onClick={() => setShowStructureModal(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Fee Structure</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {feeStructures.length > 0 ? (
          feeStructures.map((structure) => (
            <div
              key={structure.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {structure.frequency}
                    </span>
                    <h3 className="mt-1.5 text-base font-bold text-slate-900">{structure.name}</h3>
                  </div>
                  <span className="text-sm font-black text-amber-700">
                    {fmt(structure.totalAmount)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Class:{" "}
                  <span className="font-semibold text-slate-700">
                    {structure.class?.name || "All Classes"}
                  </span>{" "}
                  • Session:{" "}
                  <span className="font-semibold text-slate-700">
                    {structure.academicYear.name}
                  </span>
                </p>

                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Included Heads
                  </p>
                  {structure.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-xs text-slate-600">
                      <span>{it.feeHead.name}</span>
                      <span className="font-medium text-slate-800">{fmt(it.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] font-medium text-slate-400">
                  {structure._count?.invoices || 0} invoices generated
                </span>
                <button
                  onClick={() => {
                    setGenerateForm({
                      ...generateForm,
                      feeStructureId: structure.id,
                      academicYearId: structure.academicYear.id,
                      classId: structure.class?.id || "",
                    });
                    setShowGenerateModal(true);
                  }}
                  className="cursor-pointer text-xs font-bold text-amber-700 hover:text-amber-800"
                >
                  Issue Invoices →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Layers className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-xs font-semibold">No fee structures configured yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
