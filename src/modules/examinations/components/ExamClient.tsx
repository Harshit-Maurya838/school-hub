"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  CalendarDays,
  Plus,
  FileCheck,
  Layers,
  BarChart3,
  Edit2,
} from "lucide-react";
import type { ExamClientProps } from "./ExamTypes";
import { useExamController } from "./useExamController";
import { ExamsTab } from "./ExamsTab";
import { MarksEntryTab } from "./MarksEntryTab";
import { ReviewsTab } from "./ReviewsTab";
import { ExamReportsTab } from "./ExamReportsTab";
import { ExamModals } from "./ExamModals";

export * from "./ExamTypes";

export function ExamClient(props: ExamClientProps) {
  const vm = useExamController(props);
  const {
    schoolSlug,
    schoolName,
    activeAcademicYear,
    isAdmin,
    activeTab,
    exams,
    setShowCreateModal,
    handleTabSwitch,
    handleTabHover,
  } = vm;
  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href={`/school/${schoolSlug}`} className="hover:text-blue-600">
                {schoolName}
              </Link>
              <span>/</span>
              <span className="text-slate-800">Examinations & Marks Desk</span>
            </div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900">
              <GraduationCap className="h-7 w-7 text-blue-600" />
              Examinations & Assessments
            </h1>
            <p className="text-xs text-slate-500">
              Comprehensive exam lifecycle, subject-wise marks entry rosters, validation boundaries,
              and audited publication workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeAcademicYear && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                Session: {activeAcademicYear.name}
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                New Examination
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleTabSwitch("exams")}
            className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
              activeTab === "exams"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            } mr-6 flex items-center gap-2`}
          >
            <Layers className="h-4 w-4" />
            All Examinations ({exams.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("marks")}
            onMouseEnter={() => handleTabHover("marks")}
            onTouchStart={() => handleTabHover("marks")}
            className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
              activeTab === "marks"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            } mr-6 flex items-center gap-2`}
          >
            <Edit2 className="h-4 w-4" />
            Marks Entry Register
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleTabSwitch("reviews")}
              className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
                activeTab === "reviews"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              } mr-6 flex items-center gap-2`}
            >
              <FileCheck className="h-4 w-4" />
              Review & Approvals
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTabSwitch("reports")}
            onMouseEnter={() => handleTabHover("reports")}
            onTouchStart={() => handleTabHover("reports")}
            className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
              activeTab === "reports"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            } flex items-center gap-2`}
          >
            <BarChart3 className="h-4 w-4" />
            Results & Analytics
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Tab 1: Examinations List & Life Cycle                                */}
      {/* ==================================================================== */}
      {activeTab === "exams" && <ExamsTab vm={vm} />}

      {/* ==================================================================== */}
      {/* Tab 2: Marks Entry Register                                          */}
      {/* ==================================================================== */}
      {activeTab === "marks" && <MarksEntryTab vm={vm} />}

      {/* ==================================================================== */}
      {/* Tab 3: Admin Review & Approvals                                      */}
      {/* ==================================================================== */}
      {activeTab === "reviews" && isAdmin && <ReviewsTab vm={vm} />}

      {/* ==================================================================== */}
      {/* Tab 4: Results & Reports                                              */}
      {/* ==================================================================== */}
      {activeTab === "reports" && <ExamReportsTab vm={vm} />}
      <ExamModals vm={vm} />
    </div>
  );
}
