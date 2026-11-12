"use client";

import React, { useState } from "react";
import { Modal } from "@/components/common/Modal";
import type { ExamType, ExamSummary } from "./ExamTypes";

// ============================================================================
// Subcomponent: Create Examination Modal
// ============================================================================

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolSlug: string;
  activeAcademicYearId?: string;
  onSuccess: () => void;
}

export function CreateExamModal({
  isOpen,
  onClose,
  schoolSlug,
  activeAcademicYearId,
  onSuccess,
}: CreateExamModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ExamType>("MID_TERM");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Examination name is required.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          startDate,
          endDate,
          academicYearId: activeAcademicYearId,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setName("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        onSuccess();
      } else {
        setError(json.error?.message || "Failed to create examination.");
      }
    } catch {
      setError("Network error creating examination.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Examination" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700">Examination Title</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mid-Term Examination 2026-27"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Examination Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExamType)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="UNIT_TEST">Unit Test / Formative Assessment</option>
            <option value="MID_TERM">Mid-Term Examination</option>
            <option value="FINAL">Final / Annual Assessment</option>
            <option value="QUARTERLY">Quarterly Assessment</option>
            <option value="PRACTICAL">Practical / Lab Exam</option>
            <option value="OTHER">Other Custom Examination</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">End Date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Description (Optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Guidelines, syllabus scope, or notes..."
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Examination"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// Subcomponent: Configure Classes & Subjects Modal
// ============================================================================

interface ConfigureExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolSlug: string;
  exam: ExamSummary;
  classes: Array<{
    id: string;
    name: string;
    sections: Array<{ id: string; name: string }>;
    subjects: Array<{ id: string; name: string; code: string | null; classId: string | null }>;
  }>;
  onSuccess: () => void;
}

export function ConfigureExamModal({
  isOpen,
  onClose,
  schoolSlug,
  exam,
  classes,
  onSuccess,
}: ConfigureExamModalProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    exam.classes.map((c) => c.class.id)
  );

  // Subject configs: classId -> subjectId -> {maxMarks, passMarks}
  const [subjectConfigs, setSubjectConfigs] = useState<
    Record<string, { maxMarks: number; passMarks: number }>
  >(() => {
    const map: Record<string, { maxMarks: number; passMarks: number }> = {};
    for (const sc of exam.subjectConfigs) {
      map[`${sc.class.id}:${sc.subject.id}`] = {
        maxMarks: sc.maxMarks,
        passMarks: sc.passMarks,
      };
    }
    return map;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleConfigChange = (
    classId: string,
    subjectId: string,
    field: "maxMarks" | "passMarks",
    value: number
  ) => {
    const key = `${classId}:${subjectId}`;
    setSubjectConfigs((prev) => ({
      ...prev,
      [key]: {
        maxMarks: field === "maxMarks" ? value : (prev[key]?.maxMarks ?? 100),
        passMarks: field === "passMarks" ? value : (prev[key]?.passMarks ?? 40),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedClassIds.length === 0) {
      setError("Please select at least one participating class.");
      return;
    }

    const configsArray: Array<{
      classId: string;
      subjectId: string;
      maxMarks: number;
      passMarks: number;
    }> = [];

    for (const classId of selectedClassIds) {
      const cls = classes.find((c) => c.id === classId);
      if (!cls) continue;

      for (const sub of cls.subjects) {
        const key = `${classId}:${sub.id}`;
        const item = subjectConfigs[key] || { maxMarks: 100, passMarks: 40 };

        if (item.passMarks > item.maxMarks) {
          setError(
            `Passing marks (${item.passMarks}) cannot exceed maximum marks (${item.maxMarks}) for '${sub.name}'.`
          );
          return;
        }

        configsArray.push({
          classId,
          subjectId: sub.id,
          maxMarks: item.maxMarks,
          passMarks: item.passMarks,
        });
      }
    }

    if (configsArray.length === 0) {
      setError("Selected classes must have at least one subject configured.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classIds: selectedClassIds,
          subjectConfigs: configsArray,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(json.error?.message || "Failed to save configuration.");
      }
    } catch {
      setError("Network error saving configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configure ${exam.name}`} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        {/* Participating Classes Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700">
            1. Select Participating Classes
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {classes.map((cls) => {
              const isSelected = selectedClassIds.includes(cls.id);
              return (
                <button
                  type="button"
                  key={cls.id}
                  onClick={() => handleClassToggle(cls.id)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cls.name} ({cls.sections.length} Sections)
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject Rules Configuration */}
        <div>
          <label className="block text-xs font-bold text-slate-700">
            2. Configure Subject Maximum & Passing Marks Rules
          </label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Define max marks and pass marks for subjects in each selected class.
          </p>

          <div className="mt-3 max-h-72 space-y-4 overflow-y-auto">
            {selectedClassIds.map((classId) => {
              const cls = classes.find((c) => c.id === classId);
              if (!cls) return null;

              return (
                <div
                  key={cls.id}
                  className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                >
                  <h4 className="text-xs font-extrabold text-slate-800">{cls.name} Subjects</h4>

                  {cls.subjects.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      No subjects configured for this class.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cls.subjects.map((sub) => {
                        const key = `${cls.id}:${sub.id}`;
                        const currentConfig = subjectConfigs[key] || {
                          maxMarks: 100,
                          passMarks: 40,
                        };

                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-2.5"
                          >
                            <span className="text-xs font-bold text-slate-800">{sub.name}</span>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] font-medium text-slate-500">
                                  Max Marks:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentConfig.maxMarks}
                                  onChange={(e) =>
                                    handleConfigChange(
                                      cls.id,
                                      sub.id,
                                      "maxMarks",
                                      parseFloat(e.target.value) || 100
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 p-1 text-center text-xs font-bold"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] font-medium text-slate-500">
                                  Pass Marks:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentConfig.passMarks}
                                  onChange={(e) =>
                                    handleConfigChange(
                                      cls.id,
                                      sub.id,
                                      "passMarks",
                                      parseFloat(e.target.value) || 40
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 p-1 text-center text-xs font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
