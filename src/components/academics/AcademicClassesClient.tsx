"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface ClassData {
  id: string;
  name: string;
  numericOrder: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  sections?: Array<{
    id: string;
    name: string;
    capacity: number | null;
  }>;
  subjects?: Array<{
    id: string;
    name: string;
    code: string | null;
  }>;
  _count?: {
    sections: number;
    subjects: number;
  };
}

interface Props {
  schoolSlug: string;
  initialClasses: ClassData[];
  canCreate?: boolean;
  blockedReason?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function AcademicClassesClient({
  schoolSlug,
  initialClasses,
  canCreate = true,
  blockedReason,
  actionUrl = `/school/${schoolSlug}/academics/sessions`,
  actionLabel = "Configure Academic Year",
}: Props) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassData[]>(initialClasses);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassData | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [numericOrder, setNumericOrder] = useState<string>("");

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const openCreateModal = () => {
    setName("");
    setNumericOrder("");
    setError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (cls: ClassData) => {
    setEditingClass(cls);
    setName(cls.name);
    setNumericOrder(cls.numericOrder !== null ? String(cls.numericOrder) : "");
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please specify a class name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          numericOrder: numericOrder.trim() !== "" ? parseInt(numericOrder, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create class");
      }

      setSuccess(`Class '${data.data.class.name}' created successfully.`);
      setIsCreateOpen(false);
      router.refresh();
      setClasses((prev) => [...prev, data.data.class]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setError(null);

    if (!name.trim()) {
      setError("Please specify a class name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/classes/${editingClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          numericOrder: numericOrder.trim() !== "" ? parseInt(numericOrder, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update class");
      }

      setSuccess(`Class '${data.data.class.name}' updated successfully.`);
      setEditingClass(null);
      router.refresh();
      setClasses((prev) =>
        prev.map((c) => (c.id === data.data.class.id ? { ...c, ...data.data.class } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/classes/${deletingClass.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete class");
      }

      setSuccess(`Class '${deletingClass.name}' deleted.`);
      setDeletingClass(null);
      router.refresh();
      setClasses((prev) => prev.filter((c) => c.id !== deletingClass.id));
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
                Setup Prerequisite Required: Academic Year
              </h3>
              <p className="text-xs text-zinc-300">
                {blockedReason || "Set up and activate an academic year before creating classes."}
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

      {/* Action Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search classes (e.g. Nursery, Grade 10)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 pl-10 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <svg
            className="absolute top-3 left-3 h-4 w-4 text-zinc-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
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
          <span>Add New Class</span>
        </button>
      </div>

      {/* Classes Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
        <div className="border-b border-zinc-800/80 px-6 py-4">
          <h3 className="text-base font-semibold text-white">
            Classes Directory ({filteredClasses.length})
          </h3>
          <p className="text-xs text-zinc-400">Institutional grades, forms, and standards.</p>
        </div>

        {filteredClasses.length === 0 ? (
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-3 text-sm font-semibold text-zinc-200">No classes found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {search
                ? "No classes match your search query."
                : "Create your first class to begin structuring academic levels."}
            </p>
            {!search && (
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Add Class
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Order</th>
                  <th className="px-6 py-3.5">Class Name</th>
                  <th className="px-6 py-3.5">Sections Count</th>
                  <th className="px-6 py-3.5">Active Sections</th>
                  <th className="px-6 py-3.5">Subjects</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredClasses.map((cls) => {
                  const sectionCount = cls._count?.sections ?? cls.sections?.length ?? 0;
                  const subjectCount = cls._count?.subjects ?? cls.subjects?.length ?? 0;

                  return (
                    <tr key={cls.id} className="transition hover:bg-zinc-800/30">
                      <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                        {cls.numericOrder !== null ? cls.numericOrder : "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">{cls.name}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/school/${schoolSlug}/academics/sections?classId=${cls.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300 hover:border-indigo-600 hover:text-indigo-300"
                        >
                          <span>
                            {sectionCount} section{sectionCount === 1 ? "" : "s"}
                          </span>
                          <span className="text-[10px]">&rarr;</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {cls.sections && cls.sections.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cls.sections.map((s) => (
                              <span
                                key={s.id}
                                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">None yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {subjectCount} class-specific
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/school/${schoolSlug}/academics/sections?classId=${cls.id}`}
                            className="rounded-lg border border-indigo-900/60 bg-indigo-950/40 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-900/70"
                          >
                            Manage Sections
                          </Link>
                          <button
                            onClick={() => openEditModal(cls)}
                            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingClass(cls)}
                            className="rounded-lg border border-red-900/40 bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Create New Class</h3>
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
                  Class Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nursery, LKG, Class 1, Grade 10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Allows custom naming conventions like Kindergarten, LKG, Class 1 to 12.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Display / Numeric Order <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1, 2, 10"
                  value={numericOrder}
                  onChange={(e) => setNumericOrder(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Optional integer used to sort classes logically across dashboards and reports.
                </p>
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
                  {loading ? "Creating..." : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Edit Class</h3>
              <button
                onClick={() => setEditingClass(null)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Class Name <span className="text-red-400">*</span>
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
                  Display / Numeric Order <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={numericOrder}
                  onChange={(e) => setNumericOrder(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
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

      {/* Delete Confirmation Dialog with Relationship Safety */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Class</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Are you sure you want to delete{" "}
              <strong className="text-white">&apos;{deletingClass.name}&apos;</strong>?
            </p>

            {((deletingClass._count?.sections ?? 0) > 0 ||
              (deletingClass._count?.subjects ?? 0) > 0) && (
              <div className="mt-3 rounded-xl border border-amber-800/80 bg-amber-950/40 p-3 text-xs text-amber-300">
                ⚠️ This class has active relationships:
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {deletingClass._count?.sections ? (
                    <li>{deletingClass._count.sections} section(s)</li>
                  ) : null}
                  {deletingClass._count?.subjects ? (
                    <li>{deletingClass._count.subjects} subject(s)</li>
                  ) : null}
                </ul>
                Deletion will be prevented by safety integrity checks. Please remove or reassign
                them first.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
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
