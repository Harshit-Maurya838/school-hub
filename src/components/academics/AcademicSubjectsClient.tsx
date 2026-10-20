"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

import Link from "next/link";

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
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-300">
                Setup Prerequisite Required: Subject Creation Blocked
              </h3>
              <p className="text-xs text-zinc-300">
                {blockedReason || "Set up and activate an academic year before creating subjects."}
              </p>
            </div>
            <Link
              href={actionUrl}
              className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              {actionLabel} &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-xs text-emerald-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Scope Filter:
          </label>
          <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900 p-1 text-xs">
            <button
              onClick={() => setScopeFilter("ALL")}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                scopeFilter === "ALL"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({subjects.length})
            </button>
            <button
              onClick={() => setScopeFilter("SCHOOL_WIDE")}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                scopeFilter === "SCHOOL_WIDE"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
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
                className={`rounded-lg bg-transparent px-2.5 py-1 text-xs font-medium focus:outline-none ${
                  scopeFilter !== "ALL" && scopeFilter !== "SCHOOL_WIDE"
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <option value="" disabled className="bg-zinc-900 text-zinc-400">
                  By Class ({classSpecificCount})...
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Create Subject</span>
        </button>
      </div>

      {/* Subjects Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
        <div className="border-b border-zinc-800/80 px-6 py-4">
          <h3 className="text-base font-semibold text-white">
            Curriculum Subjects ({filteredSubjects.length})
          </h3>
          <p className="text-xs text-zinc-400">
            Administrative catalog of school-wide and class-specific courses.
          </p>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="mt-3 text-sm font-semibold text-zinc-200">No subjects found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Create subjects such as Mathematics, English, General Science, etc.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Add Subject
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Subject Name</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Scope / Level</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="transition hover:bg-zinc-800/30">
                    <td className="px-6 py-4 font-semibold text-white">{sub.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                      {sub.code || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {sub.class ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Class: {sub.class.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-800 bg-indigo-950/60 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                          🌐 School-Wide (All Classes)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingSubject(sub)}
                          className="rounded-lg border border-red-900/40 bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/60"
                        >
                          Delete
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Create New Subject</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Subject Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, English, Physics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Subject Code <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MATH101, ENG"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white uppercase placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isClassSpecific"
                    checked={isClassSpecific}
                    onChange={(e) => setIsClassSpecific(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isClassSpecific" className="text-xs font-medium text-zinc-200">
                    Specific to a single class / grade only
                  </label>
                </div>

                {isClassSpecific && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Select Class <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
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
                  <p className="text-[11px] text-zinc-500">
                    🌐 This subject will be school-wide and applicable across classes.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Edit Subject</h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Subject Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Subject Code <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white uppercase focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editIsClassSpecific"
                    checked={isClassSpecific}
                    onChange={(e) => setIsClassSpecific(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="editIsClassSpecific"
                    className="text-xs font-medium text-zinc-200"
                  >
                    Specific to a single class / grade only
                  </label>
                </div>

                {isClassSpecific && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Select Class <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
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

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Subject</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Are you sure you want to delete{" "}
              <strong className="text-white">&apos;{deletingSubject.name}&apos;</strong>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
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
