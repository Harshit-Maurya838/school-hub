"use client";

import React from "react";
import { GraduationCap, Search, Filter } from "lucide-react";
import type { ExamController } from "./useExamController";

export function ExamsTab({ vm }: { vm: ExamController }) {
  const {
    schoolSlug,
    isAdmin,
    setActiveTab,
    loadingExams,
    examStatusFilter,
    setExamStatusFilter,
    searchQuery,
    setSearchQuery,
    setSelectedExamId,
    setShowConfigureModal,
    setConfiguringExam,
    setShowPublishModal,
    setPublishingExamId,
    fetchExams,
    filteredExams,
    renderStatusBadge,
  } = vm;
  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search examination by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={examStatusFilter}
            onChange={(e) => setExamStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="MARKS_ENTRY">Marks Entry Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Examinations Grid */}
      {loadingExams ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">Loading examinations...</p>
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-2 text-sm font-bold text-slate-900">No examinations found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery || examStatusFilter !== "ALL"
              ? "Try resetting your search filters."
              : "Create an examination to start scheduling assessments."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {exam.type.replace("_", " ")}
                    </span>
                    <h3 className="line-clamp-1 text-base font-extrabold text-slate-900">
                      {exam.name}
                    </h3>
                  </div>
                  {renderStatusBadge(exam.status)}
                </div>

                <p className="line-clamp-2 text-xs text-slate-600">
                  {exam.description || "No description provided."}
                </p>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Schedule:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(exam.startDate).toLocaleDateString()} -{" "}
                      {new Date(exam.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Classes:</span>
                    <span className="font-medium text-slate-700">
                      {exam.classes.length > 0
                        ? exam.classes.map((c) => c.class.name).join(", ")
                        : "None configured"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Subject Rules:</span>
                    <span className="font-medium text-slate-700">
                      {exam.subjectConfigs.length} configured
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExamId(exam.id);
                    setActiveTab("marks");
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Enter Marks
                </button>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    {exam.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfiguringExam(exam);
                          setShowConfigureModal(true);
                        }}
                        className="cursor-pointer rounded-xl bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Configure
                      </button>
                    )}

                    {exam.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "SCHEDULED" }),
                          });
                          fetchExams();
                        }}
                        className="cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Schedule
                      </button>
                    )}

                    {exam.status === "SCHEDULED" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "MARKS_ENTRY" }),
                          });
                          fetchExams();
                        }}
                        className="cursor-pointer rounded-xl bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        Open Marks
                      </button>
                    )}

                    {exam.status === "MARKS_ENTRY" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "UNDER_REVIEW" }),
                          });
                          fetchExams();
                        }}
                        className="cursor-pointer rounded-xl bg-purple-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700"
                      >
                        Send to Review
                      </button>
                    )}

                    {exam.status === "UNDER_REVIEW" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPublishingExamId(exam.id);
                          setShowPublishModal(true);
                        }}
                        className="cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
