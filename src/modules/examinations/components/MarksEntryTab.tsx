"use client";

import React from "react";
import { AlertTriangle, Save, Send, Lock, BookOpen } from "lucide-react";
import type { ExamController } from "./useExamController";

export function MarksEntryTab({ vm }: { vm: ExamController }) {
  const {
    isTeacher,
    exams,
    selectedExamId,
    setSelectedExamId,
    assignedSubjects,
    selectedSubjectOption,
    setSelectedSubjectOption,
    roster,
    loadingRoster,
    marksMap,
    savingDraft,
    submittingMarks,
    rosterMessage,
    handleMarkChange,
    handleAbsentToggle,
    handleExemptToggle,
    handleRemarksChange,
    handleSaveDraft,
    handleSubmitForReview,
    renderStatusBadge,
  } = vm;
  return (
    <div className="space-y-4">
      {/* Subject & Section Selection Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Exam Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700">Select Examination</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.status})
                </option>
              ))}
            </select>
          </div>

          {/* Subject-Section Selector */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700">
              {isTeacher ? "Assigned Subject & Section" : "Select Class, Section & Subject"}
            </label>
            <select
              value={
                selectedSubjectOption
                  ? `${selectedSubjectOption.sectionId}:${selectedSubjectOption.subjectId}`
                  : ""
              }
              onChange={(e) => {
                const [secId, subId] = e.target.value.split(":");
                const found = assignedSubjects.find(
                  (a) => a.sectionId === secId && a.subjectId === subId
                );
                setSelectedSubjectOption(found || null);
              }}
              disabled={assignedSubjects.length === 0}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
            >
              {assignedSubjects.length === 0 ? (
                <option value="">No subject allocations found for this examination</option>
              ) : (
                assignedSubjects.map((sub) => (
                  <option
                    key={`${sub.sectionId}:${sub.subjectId}`}
                    value={`${sub.sectionId}:${sub.subjectId}`}
                  >
                    {sub.className} - {sub.sectionName} | {sub.subjectName} ({sub.status})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Workflow Banner & Configuration Details */}
        {selectedSubjectOption && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <BookOpen className="h-4 w-4 text-blue-600" />
                {selectedSubjectOption.subjectName} ({selectedSubjectOption.className} -{" "}
                {selectedSubjectOption.sectionName})
              </div>
              <span className="text-slate-300">|</span>
              <div className="text-slate-600">
                Max Marks:{" "}
                <strong className="text-slate-900">{selectedSubjectOption.maxMarks}</strong>
              </div>
              <span className="text-slate-300">|</span>
              <div className="text-slate-600">
                Pass Marks:{" "}
                <strong className="text-slate-900">{selectedSubjectOption.passMarks}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Submission State:</span>
              {renderStatusBadge(selectedSubjectOption.status)}
            </div>
          </div>
        )}
      </div>

      {/* Returned for Correction Alert Banner */}
      {roster?.workflow.status === "RETURNED" && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 shadow-xs">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <strong className="font-bold text-rose-900">Returned for Correction:</strong>
            <p className="mt-0.5 text-rose-700">
              {roster.workflow.reviewNotes ||
                "Please review and rectify student marks before re-submitting."}
            </p>
          </div>
        </div>
      )}

      {/* User Messages */}
      {rosterMessage && (
        <div
          className={`rounded-2xl p-4 text-xs font-medium shadow-xs ${
            rosterMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {rosterMessage.text}
        </div>
      )}

      {/* Student Marks Table */}
      {loadingRoster ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">Loading student marks roster...</p>
          </div>
        </div>
      ) : !roster ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
          Please select an examination and subject to view the marks entry register.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Student Marks Register ({roster.students.length} Enrolled)
              </h3>
              <p className="text-[11px] text-slate-500">
                Enter score between 0 and {roster.config.maxMarks}. Toggle absent or exempt status
                if student did not attempt.
              </p>
            </div>

            {/* Status Indicator */}
            {!roster.workflow.isEditable && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                Locked for Editing ({roster.workflow.status})
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Admission No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3 text-center">Marks (Max {roster.config.maxMarks})</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Remarks / Feedback</th>
                  <th className="px-4 py-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.students.map((student) => {
                  const item = marksMap[student.studentId] || {
                    marks: "",
                    isAbsent: false,
                    isExempt: false,
                    remarks: "",
                  };
                  const parsedMarks = parseFloat(item.marks);
                  const isOutOfRange =
                    !item.isAbsent &&
                    !item.isExempt &&
                    item.marks !== "" &&
                    (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > roster.config.maxMarks);

                  let resultBadge = null;
                  if (item.isAbsent) {
                    resultBadge = (
                      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        ABSENT
                      </span>
                    );
                  } else if (item.isExempt) {
                    resultBadge = (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        EXEMPT
                      </span>
                    );
                  } else if (item.marks !== "" && !isNaN(parsedMarks)) {
                    if (parsedMarks >= roster.config.passMarks) {
                      resultBadge = (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          PASS
                        </span>
                      );
                    } else {
                      resultBadge = (
                        <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          FAIL
                        </span>
                      );
                    }
                  } else {
                    resultBadge = (
                      <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        UNMARKED
                      </span>
                    );
                  }

                  return (
                    <tr key={student.studentId} className="transition hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-medium text-slate-500">
                        {student.rollNumber || "-"}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-600">
                        {student.admissionNumber}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={roster.config.maxMarks}
                          step="0.5"
                          disabled={!roster.workflow.isEditable || item.isAbsent || item.isExempt}
                          value={item.marks}
                          onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                          placeholder={item.isAbsent ? "ABSENT" : item.isExempt ? "EXEMPT" : "-"}
                          className={`w-24 rounded-lg border px-2.5 py-1 text-center text-xs font-bold focus:outline-hidden disabled:bg-slate-100 ${
                            isOutOfRange
                              ? "border-rose-500 bg-rose-50 text-rose-900 focus:border-rose-600"
                              : "border-slate-300 bg-white text-slate-900 focus:border-blue-500"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={!roster.workflow.isEditable}
                            onClick={() => handleAbsentToggle(student.studentId)}
                            className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                              item.isAbsent
                                ? "bg-rose-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            disabled={!roster.workflow.isEditable}
                            onClick={() => handleExemptToggle(student.studentId)}
                            className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                              item.isExempt
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            Exempt
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          disabled={!roster.workflow.isEditable}
                          value={item.remarks}
                          onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                          placeholder="Optional remarks..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 placeholder-slate-300 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">{resultBadge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Footer */}
          {roster.workflow.isEditable && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row">
              <div className="text-xs text-slate-500">
                Make sure to save drafts periodically. Submitting will send the register for
                administrator approval.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingDraft || submittingMarks}
                  onClick={handleSaveDraft}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingDraft ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  disabled={savingDraft || submittingMarks}
                  onClick={handleSubmitForReview}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submittingMarks ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
