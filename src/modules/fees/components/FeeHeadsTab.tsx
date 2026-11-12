"use client";

import React from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { FeesController } from "./useFeesController";

export function FeeHeadsTab({ vm }: { vm: FeesController }) {
  const { feeHeads, setShowHeadModal, isSchoolAdmin } = vm;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Catalog of Fee Heads</h2>
          <p className="text-xs text-slate-500">
            Define standard billing heads such as Tuition, Laboratory, Transport, Examination,
            Library.
          </p>
        </div>
        {isSchoolAdmin && (
          <button
            onClick={() => setShowHeadModal(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Fee Head</span>
          </button>
        )}
      </div>

      {!isSchoolAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Only School Administrators can add or edit fee heads. Accountants have read-only access.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black tracking-wider text-slate-400 uppercase">
              <th className="px-4 py-3">Head Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Active Structures</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {feeHeads.length > 0 ? (
              feeHeads.map((head) => (
                <tr key={head.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-900">{head.name}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-500">
                    {head.code || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{head.description || "—"}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {head._count?.structureItems || 0} structures
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        head.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {head.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <SlidersHorizontal className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-xs font-semibold">No fee heads defined yet</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
