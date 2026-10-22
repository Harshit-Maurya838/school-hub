"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Filter,
  Globe,
} from "lucide-react";

export interface SubjectData {
  id: string;
  name: string;
  code: string | null;
  classId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  class?: {
    id: string;
    name: string;
  } | null;
}

export interface ClassOption {
  id: string;
  name: string;
}

interface Props {
  schoolSlug: string;
  initialSubjects: SubjectData[];
  classes: ClassOption[];
  canCreate?: boolean;
  blockedReason?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function AcademicSubjectsClient({
  schoolSlug,
  initialSubjects,
  classes,
  canCreate = true,
  blockedReason,
  actionUrl = `/school/${schoolSlug}/academics/sessions`,
  actionLabel = "Configure Academic Year First",
}: Props) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectData[]>(initialSubjects);
  const [scopeFilter, setScopeFilter] = useState<string>("ALL"); // "ALL" | "SCHOOL_WIDE" | classId

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectData | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<SubjectData | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isClassSpecific, setIsClassSpecific] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? "");

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredSubjects = subjects.filter((s) => {
    if (scopeFilter === "ALL") return true;
    if (scopeFilter === "SCHOOL_WIDE") return s.classId === null;
    return s.classId === scopeFilter;
  });

  const schoolWideCount = subjects.filter((s) => s.classId === null).length;
  const classSpecificCount = subjects.filter((s) => s.classId !== null).length;

  const openCreateModal = () => {
    setName("");
    setCode("");
    setIsClassSpecific(false);
    setSelectedClassId(classes[0]?.id ?? "");
    setError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (sub: SubjectData) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code || "");
    setIsClassSpecific(sub.classId !== null);
    setSelectedClassId(sub.classId || (classes[0]?.id ?? ""));
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide a subject name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() !== "" ? code.trim() : null,
          classId: isClassSpecific ? selectedClassId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create subject");
      }

      setSuccess(`Subject '${data.data.subject.name}' created successfully.`);
      setIsCreateOpen(false);
      router.refresh();
      setSubjects((prev) => [...prev, data.data.subject]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setError(null);

    if (!name.trim()) {
      setError("Please provide a subject name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/subjects/${editingSubject.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            code: code.trim() !== "" ? code.trim() : null,
            classId: isClassSpecific ? selectedClassId : null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update subject");
      }

      setSuccess(`Subject '${data.data.subject.name}' updated successfully.`);
      setEditingSubject(null);
      router.refresh();
      setSubjects((prev) =>
        prev.map((s) => (s.id === data.data.subject.id ? { ...s, ...data.data.subject } : s))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSubject) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/subjects/${deletingSubject.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete subject");
      }

      setSuccess(`Subject '${deletingSubject.name}' deleted.`);
      setDeletingSubject(null);
      router.refresh();
      setSubjects((prev) => prev.filter((s) => s.id !== deletingSubject.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prerequisite Required Banner */}
      {!canCreate && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Setup Prerequisite Required: Subject Creation Blocked
                </h3>
                <p className="text-xs text-amber-700">
                  {blockedReason ||
                    "Set up and activate an academic year before creating subjects."}
                </p>
              </div>
            </div>
            <Link
              href={actionUrl}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setScopeFilter("ALL")}
              className={`rounded-lg px-3 py-1 font-bold transition ${
                scopeFilter === "ALL"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({subjects.length})
            </button>
            <button
              onClick={() => setScopeFilter("SCHOOL_WIDE")}
              className={`rounded-lg px-3 py-1 font-bold transition ${
                scopeFilter === "SCHOOL_WIDE"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              School-Wide ({schoolWideCount})
            </button>
            {classes.length > 0 && (
              <select
                value={scopeFilter !== "ALL" && scopeFilter !== "SCHOOL_WIDE" ? scopeFilter : ""}
                onChange={(e) => {
                  if (e.target.value) setScopeFilter(e.target.value);
                }}
                className={`rounded-lg border-0 px-2.5 py-1 text-xs font-bold transition focus:outline-none ${
                  scopeFilter !== "ALL" && scopeFilter !== "SCHOOL_WIDE"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <option value="" disabled className="bg-white text-slate-700">
                  By Class ({classSpecificCount})...
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          onClick={openCreateModal}
          disabled={!canCreate}
          title={!canCreate ? blockedReason : undefined}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Create Subject</span>
        </button>
      </div>

      {/* Subjects Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Curriculum Subjects ({filteredSubjects.length})
            </h3>
            <p className="text-xs text-slate-400">
              Administrative catalog of school-wide foundational and class-specific courses
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {subjects.length} Total
          </span>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-800">No subjects found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Create subjects such as Mathematics, English, General Science, etc.
            </p>
            {canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Subject Name</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Scope / Level</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-mono text-xs font-extrabold text-emerald-800">
                          {sub.code || sub.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-extrabold text-slate-900">{sub.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-600">
                      {sub.code || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {sub.class ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                          <span>Class: {sub.class.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                          <Globe className="h-3.5 w-3.5 text-blue-600" />
                          <span>School-Wide (Universal)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingSubject(sub)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Create New Subject</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, English, Physics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Subject Code <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MATH101, ENG"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 uppercase placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isClassSpecific"
                    checked={isClassSpecific}
                    onChange={(e) => setIsClassSpecific(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <label htmlFor="isClassSpecific" className="text-xs font-bold text-slate-700">
                    Specific to a single class / standard only
                  </label>
                </div>

                {isClassSpecific && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">
                      Select Class <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!isClassSpecific && (
                  <p className="text-[11px] text-slate-500">
                    🌐 This subject will be school-wide and applicable across all classes.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Edit Subject</h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Subject Code <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 uppercase focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsClassSpecific"
                    checked={isClassSpecific}
                    onChange={(e) => setIsClassSpecific(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <label htmlFor="editIsClassSpecific" className="text-xs font-bold text-slate-700">
                    Specific to a single class / grade only
                  </label>
                </div>

                {isClassSpecific && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">
                      Select Class <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Delete Subject</h3>
            <p className="mt-2 text-xs text-slate-600">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">&apos;{deletingSubject.name}&apos;</strong>?
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
