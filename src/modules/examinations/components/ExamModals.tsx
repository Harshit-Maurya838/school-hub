"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import type { ExamController } from "./useExamController";
import { CreateExamModal, ConfigureExamModal } from "./ExamFormModals";

export function ExamModals({ vm }: { vm: ExamController }) {
  const {
    schoolSlug,
    activeAcademicYear,
    classes,
    showCreateModal,
    setShowCreateModal,
    showConfigureModal,
    setShowConfigureModal,
    configuringExam,
    setConfiguringExam,
    showReturnModal,
    setShowReturnModal,
    returnReason,
    setReturnReason,
    processingReview,
    showPublishModal,
    setShowPublishModal,
    publishing,
    showCorrectionModal,
    setShowCorrectionModal,
    correctionTarget,
    newCorrectedMarks,
    setNewCorrectedMarks,
    newCorrectedAbsent,
    setNewCorrectedAbsent,
    correctionReason,
    setCorrectionReason,
    savingCorrection,
    fetchExams,
    handleReturnSubmission,
    handlePublishResults,
    handleApplyCorrection,
  } = vm;
  return (
    <>
      {/* ==================================================================== */}
      {/* Modal: Create Examination                                            */}
      {/* ==================================================================== */}
      <CreateExamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        schoolSlug={schoolSlug}
        activeAcademicYearId={activeAcademicYear?.id}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchExams();
        }}
      />

      {/* ==================================================================== */}
      {/* Modal: Configure Participating Classes & Subject Rules               */}
      {/* ==================================================================== */}
      {configuringExam && (
        <ConfigureExamModal
          isOpen={showConfigureModal}
          onClose={() => {
            setShowConfigureModal(false);
            setConfiguringExam(null);
          }}
          schoolSlug={schoolSlug}
          exam={configuringExam}
          classes={classes}
          onSuccess={() => {
            setShowConfigureModal(false);
            setConfiguringExam(null);
            fetchExams();
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* Modal: Return Submission with Reason                                 */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Return Marks for Correction"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide a mandatory reason or instructions for the teacher to rectify. The subject
            register status will change to <strong>RETURNED</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Correction Reason (min 5 characters)
            </label>
            <textarea
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Please re-check student 1 answer booklet question 4..."
              className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowReturnModal(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={returnReason.trim().length < 5 || processingReview}
              onClick={handleReturnSubmission}
              className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {processingReview ? "Returning..." : "Confirm Return"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* Modal: Publish Results Confirmation                                  */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publish Examination Results"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <strong className="font-bold text-amber-900">Irreversible Publication Action:</strong>
              <p className="mt-0.5">
                Publishing locks all submitted marks and opens report analytics. Future
                modifications will require an audited administrative correction.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublishResults}
              className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish Results Now"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* Modal: Administrative Correction                                     */}
      {/* ==================================================================== */}
      {correctionTarget && (
        <Modal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          title="Audited Administrative Mark Correction"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              <div>
                Student: <strong>{correctionTarget.studentName}</strong>
              </div>
              <div>
                Subject: <strong>{correctionTarget.subjectName}</strong>
              </div>
              <div>
                Current Mark:{" "}
                <strong>
                  {correctionTarget.isAbsent
                    ? "ABSENT"
                    : (correctionTarget.currentMarks ?? "UNMARKED")}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                New Marks (Max {correctionTarget.maxMarks})
              </label>
              <input
                type="number"
                min="0"
                max={correctionTarget.maxMarks}
                step="0.5"
                disabled={newCorrectedAbsent}
                value={newCorrectedMarks}
                onChange={(e) => setNewCorrectedMarks(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="correctAbsentCheck"
                checked={newCorrectedAbsent}
                onChange={(e) => {
                  setNewCorrectedAbsent(e.target.checked);
                  if (e.target.checked) setNewCorrectedMarks("");
                }}
                className="rounded border-slate-300 text-blue-600"
              />
              <label htmlFor="correctAbsentCheck" className="text-xs font-medium text-slate-700">
                Mark Student as Absent
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Mandatory Correction Reason (min 5 characters)
              </label>
              <textarea
                rows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Scrutiny committee re-evaluation..."
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={correctionReason.trim().length < 5 || savingCorrection}
                onClick={handleApplyCorrection}
                className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCorrection ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
