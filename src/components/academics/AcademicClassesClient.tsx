"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
} from "lucide-react";

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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Setup Prerequisite Required: Academic Year
                </h3>
                <p className="text-xs text-amber-700">
                  {blockedReason || "Set up and activate an academic year before creating classes."}
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

      {/* Action Header & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes (e.g. Nursery, Grade 10)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pl-9 text-xs text-slate-800 placeholder-slate-400 shadow-xs transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>

        <button
          onClick={openCreateModal}
          disabled={!canCreate}
          title={!canCreate ? blockedReason : undefined}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Class</span>
        </button>
      </div>

      {/* Classes Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Classes Directory ({filteredClasses.length})
            </h3>
            <p className="text-xs text-slate-400">Institutional grades, standards, and levels</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {classes.length} Total
          </span>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-800">No classes found</h3>
            <p className="mt-1 text-xs text-slate-500">
              {search
                ? "No classes match your search query."
                : "Create your first class to begin structuring academic levels."}
            </p>
            {!search && canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Class</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Class Name</th>
                  <th className="px-5 py-3.5">Sections Count</th>
                  <th className="px-5 py-3.5">Active Sections</th>
                  <th className="px-5 py-3.5">Subjects</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredClasses.map((cls) => {
                  const sectionCount = cls._count?.sections ?? cls.sections?.length ?? 0;
                  const subjectCount = cls._count?.subjects ?? cls.subjects?.length ?? 0;

                  return (
                    <tr key={cls.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-500">
                        {cls.numericOrder !== null ? cls.numericOrder : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-extrabold text-emerald-800">
                            {cls.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{cls.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/school/${schoolSlug}/academics/sections?classId=${cls.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <span>
                            {sectionCount} section{sectionCount === 1 ? "" : "s"}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {cls.sections && cls.sections.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cls.sections.map((s) => (
                              <span
                                key={s.id}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None yet</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        <span className="font-semibold text-slate-700">{subjectCount}</span>{" "}
                        class-specific
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/school/${schoolSlug}/academics/sections?classId=${cls.id}`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:text-emerald-700"
                          >
                            Sections
                          </Link>
                          <button
                            onClick={() => openEditModal(cls)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingClass(cls)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Create New Class</h3>
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
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nursery, LKG, Class 1, Grade 10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Supports custom naming conventions like Kindergarten, LKG, Grade 1 to 12.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Display / Numeric Order{" "}
                  <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1, 2, 10"
                  value={numericOrder}
                  onChange={(e) => setNumericOrder(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Optional integer used to sort classes logically across dashboards and reports.
                </p>
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
                  {loading ? "Creating..." : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Edit Class</h3>
              <button
                onClick={() => setEditingClass(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Class Name <span className="text-rose-500">*</span>
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
                  Display / Numeric Order{" "}
                  <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={numericOrder}
                  onChange={(e) => setNumericOrder(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
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

      {/* Delete Confirmation Dialog */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Delete Class</h3>
            <p className="mt-2 text-xs text-slate-600">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">&apos;{deletingClass.name}&apos;</strong>?
            </p>

            {((deletingClass._count?.sections ?? 0) > 0 ||
              (deletingClass._count?.subjects ?? 0) > 0) && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-bold">⚠️ Active relationships detected:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-amber-800">
                  {deletingClass._count?.sections ? (
                    <li>{deletingClass._count.sections} section(s) attached</li>
                  ) : null}
                  {deletingClass._count?.subjects ? (
                    <li>{deletingClass._count.subjects} subject(s) attached</li>
                  ) : null}
                </ul>
                <p className="mt-1 text-[11px] text-amber-700">
                  Deletion will be prevented by safety integrity checks if children exist.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
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
