"use client";

import React from "react";
import { Eye } from "lucide-react";
import type { ExamController } from "./useExamController";

export function ReviewsTab({ vm }: { vm: ExamController }) {
  const {
    classes,
    setActiveTab,
    assignedSubjects,
    setSelectedSubjectOption,
    setShowReturnModal,
    setReturnItem,
    processingReview,
    handleApproveSubmission,
    currentExam,
    renderStatusBadge,
  } = vm;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900">
          Marks Submissions Pending Review & Approval
        </h3>
        <p className="text-xs text-slate-500">
          Examine subject registers submitted by faculty. Review completeness, approve for
          publication, or return with specific correction notes.
        </p>
      </div>

      {currentExam?.sectionSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          No subject marks submissions recorded yet for this examination.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentExam?.sectionSubjects.map((ss) => {
            const classMatch = classes.find((c) => c.sections.some((s) => s.id === ss.sectionId));
            const sectionMatch = classMatch?.sections.find((s) => s.id === ss.sectionId);
            const subjectMatch = classMatch?.subjects.find((sub) => sub.id === ss.subjectId);

            return (
              <div
                key={ss.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        {classMatch?.name} - {sectionMatch?.name}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900">
                        {subjectMatch?.name}
                      </h4>
                    </div>
                    {renderStatusBadge(ss.status)}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const opt = assignedSubjects.find(
                        (a) => a.sectionId === ss.sectionId && a.subjectId === ss.subjectId
                      );
                      if (opt) {
                        setSelectedSubjectOption(opt);
                        setActiveTab("marks");
                      }
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Inspect Roster
                  </button>

                  {ss.status === "SUBMITTED" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={processingReview}
                        onClick={() => {
                          setReturnItem({
                            examId: currentExam.id,
                            sectionId: ss.sectionId,
                            subjectId: ss.subjectId,
                            subjectName: subjectMatch?.name || "Subject",
                          });
                          setShowReturnModal(true);
                        }}
                        className="cursor-pointer rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Return
                      </button>

                      <button
                        type="button"
                        disabled={processingReview}
                        onClick={() =>
                          handleApproveSubmission(currentExam.id, ss.sectionId, ss.subjectId)
                        }
                        className="cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
