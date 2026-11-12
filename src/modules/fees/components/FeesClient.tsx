"use client";

import React from "react";
import {
  CreditCard,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Receipt,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  SlidersHorizontal,
} from "lucide-react";
import type { FeesClientProps } from "./FeesTypes";
import { useFeesController } from "./useFeesController";
import { FeesOverviewTab } from "./FeesOverviewTab";
import { FeesInvoicesTab } from "./FeesInvoicesTab";
import { FeeStructuresTab } from "./FeeStructuresTab";
import { FeeHeadsTab } from "./FeeHeadsTab";
import { StudentAccountTab } from "./StudentAccountTab";
import { FeesReportsTab } from "./FeesReportsTab";
import { FeeSetupModals } from "./FeeSetupModals";
import { FeePaymentModals } from "./FeePaymentModals";
import { FeeAdjustmentModals } from "./FeeAdjustmentModals";
import { InvoiceDetailModal } from "./InvoiceDetailModal";

export * from "./FeesTypes";

export function FeesClient(props: FeesClientProps) {
  const vm = useFeesController(props);
  const {
    userRole,
    allAcademicYears,
    classes,
    activeTab,
    setActiveTab,
    handleTabSwitch,
    selectedYearId,
    setSelectedYearId,
    selectedClassId,
    setSelectedClassId,
    invoices,
    loading,
    errorMessage,
    setErrorMessage,
    successToast,
    setShowGenerateModal,
    refreshAll,
    openCollectPaymentModal,
  } = vm;
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/20">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Fees & Finance Management
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Fee heads, billing schedules, automated student invoices, partial payment
                reconciliation & receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50"
            title="Refresh financial data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (invoices.length > 0) openCollectPaymentModal(invoices[0]);
              else setActiveTab("invoices");
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-colors hover:bg-amber-700"
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Collect Payment</span>
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md shadow-slate-900/20 transition-colors hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Invoices</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="font-bold text-rose-600 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Session Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            <span>Session:</span>
          </div>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
          >
            {allAcademicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Layers className="h-3.5 w-3.5 text-amber-600" />
            <span>Class:</span>
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">Role:</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
            {userRole}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex space-x-1 overflow-x-auto border-b border-slate-200 pb-px">
        {[
          { id: "overview" as const, label: "Dashboard", icon: CreditCard },
          { id: "invoices" as const, label: "Invoices & Ledger", icon: FileText },
          { id: "structures" as const, label: "Fee Structures", icon: Layers },
          { id: "heads" as const, label: "Fee Heads", icon: SlidersHorizontal },
          { id: "student-account" as const, label: "Student Ledger", icon: User },
          { id: "reports" as const, label: "Collection Reports", icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? "rounded-t-xl border-amber-600 bg-amber-50/50 text-amber-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-amber-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OVERVIEW & DASHBOARD                                          */}
      {/* ==================================================================== */}
      {activeTab === "overview" && <FeesOverviewTab vm={vm} />}

      {/* ==================================================================== */}
      {/* TAB 2: INVOICES & LIABILITIES                                        */}
      {/* ==================================================================== */}
      {activeTab === "invoices" && <FeesInvoicesTab vm={vm} />}

      {/* ==================================================================== */}
      {/* TAB 3: FEE STRUCTURES                                                */}
      {/* ==================================================================== */}
      {activeTab === "structures" && <FeeStructuresTab vm={vm} />}

      {/* ==================================================================== */}
      {/* TAB 4: FEE HEADS                                                     */}
      {/* ==================================================================== */}
      {activeTab === "heads" && <FeeHeadsTab vm={vm} />}

      {/* ==================================================================== */}
      {/* TAB 5: STUDENT FEE ACCOUNT / LEDGER                                  */}
      {/* ==================================================================== */}
      {activeTab === "student-account" && <StudentAccountTab vm={vm} />}

      {/* ==================================================================== */}
      {/* TAB 6: REPORTS & SUMMARIES                                           */}
      {/* ==================================================================== */}
      {activeTab === "reports" && <FeesReportsTab vm={vm} />}
      <FeeSetupModals vm={vm} />
      <FeePaymentModals vm={vm} />
      <FeeAdjustmentModals vm={vm} />
      <InvoiceDetailModal vm={vm} />
    </div>
  );
}

export default FeesClient;
