"use client";

import React from "react";
import { CheckCircle2, Search, BarChart3 } from "lucide-react";
import type { ExamController } from "./useExamController";

export function ExamReportsTab({ vm }: { vm: ExamController }) {
  const {
    isAdmin,
    setShowPublishModal,
    setPublishingExamId,
    setShowCorrectionModal,
    setCorrectionTarget,
    setNewCorrectedMarks,
    setNewCorrectedAbsent,
    reportsData,
    loadingReports,
    reportStudentQuery,
    setReportStudentQuery,
    renderStatusBadge,
  } = vm;
  return (
    <div className="space-y-6">
      {loadingReports ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Loading exam reports and performance metrics...
          </p>
        </div>
      ) : reportsData ? (
        <>
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">{reportsData.exam.name}</h2>
                  {renderStatusBadge(reportsData.exam.status)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Official result aggregation, subject pass rates, and administrative mark audits.
                </p>
              </div>

              {isAdmin && reportsData.exam.status !== "PUBLISHED" && (
                <button
                  type="button"
                  onClick={() => {
                    setPublishingExamId(reportsData.exam.id);
                    setShowPublishModal(true);
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Publish Examination Results
                </button>
              )}
            </div>

            {/* Progress Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">
                  Submissions Progress
                </div>
                <div className="mt-1 text-2xl font-black text-slate-900">
                  {reportsData.completion.percentage}%
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {reportsData.completion.completed} / {reportsData.completion.totalExpected}{" "}
                  completed
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">
                  Students Evaluated
                </div>
                <div className="mt-1 text-2xl font-black text-slate-900">
                  {reportsData.studentSummaries.length}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">Active enrollments</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Pass Rate</div>
                <div className="mt-1 text-2xl font-black text-emerald-600">
                  {reportsData.studentSummaries.length > 0
                    ? Math.round(
                        (reportsData.studentSummaries.filter((s) => s.overallStatus === "PASS")
                          .length /
                          reportsData.studentSummaries.length) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">Overall threshold met</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">
                  Subjects Configured
                </div>
                <div className="mt-1 text-2xl font-black text-blue-600">
                  {reportsData.subjectSummaries.length}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">Across all classes</div>
              </div>
            </div>
          </div>

          {/* Subject Performance Summary Table */}
          {reportsData.subjectSummaries.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Subject-Wise Performance Overview
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Class & Section</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-center">Appeared</th>
                      <th className="px-4 py-3 text-center">Absent</th>
                      <th className="px-4 py-3 text-center">Passed</th>
                      <th className="px-4 py-3 text-center">Failed</th>
                      <th className="px-4 py-3 text-center">Pass Rate</th>
                      <th className="px-4 py-3 text-center">Avg / Highest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportsData.subjectSummaries.map((ss, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {ss.className} - {ss.sectionName}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{ss.subjectName}</td>
                        <td className="px-4 py-3 text-center font-mono">{ss.appeared}</td>
                        <td className="px-4 py-3 text-center font-mono text-rose-600">
                          {ss.absent}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-600">
                          {ss.passed}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-rose-600">
                          {ss.failed}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">
                          {ss.passPercentage}%
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-600">
                          {ss.averageMarks} / {ss.highestMarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student Exam Result Summaries */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Student Examination Result Summaries ({reportsData.studentSummaries.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={reportStudentQuery}
                  onChange={(e) => setReportStudentQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Admission No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Class & Section</th>
                    <th className="px-4 py-3 text-center">Score / Total</th>
                    <th className="px-4 py-3 text-center">Percentage</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Audit Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportsData.studentSummaries
                    .filter(
                      (s) =>
                        reportStudentQuery === "" ||
                        s.name.toLowerCase().includes(reportStudentQuery.toLowerCase()) ||
                        s.admissionNumber.toLowerCase().includes(reportStudentQuery.toLowerCase())
                    )
                    .map((student) => (
                      <tr key={student.studentId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-medium text-slate-600">
                          {student.admissionNumber}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {student.className} - {student.sectionName}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                          {student.totalMarksObtained} / {student.totalMaxMarks}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                          {student.percentage}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {student.overallStatus === "PASS" ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                              PASS
                            </span>
                          ) : student.overallStatus === "FAIL" ? (
                            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                              FAIL
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                              INCOMPLETE
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            {student.results.length > 0 &&
                              reportsData.exam.status === "PUBLISHED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstResult = student.results[0];
                                    setCorrectionTarget({
                                      markId: student.studentId, // Will resolve student mark record
                                      studentName: student.name,
                                      subjectName: firstResult.subjectName,
                                      currentMarks: firstResult.marksObtained,
                                      isAbsent: firstResult.isAbsent,
                                      maxMarks: firstResult.maxMarks,
                                      examId: reportsData.exam.id,
                                    });
                                    setNewCorrectedMarks(
                                      firstResult.marksObtained !== null
                                        ? String(firstResult.marksObtained)
                                        : ""
                                    );
                                    setNewCorrectedAbsent(firstResult.isAbsent);
                                    setShowCorrectionModal(true);
                                  }}
                                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Correct Mark
                                </button>
                              )}
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">
            No examination selected or reports unavailable
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Select an examination from the dropdown above to view aggregated performance and
            completion statistics.
          </p>
        </div>
      )}
    </div>
  );
}
