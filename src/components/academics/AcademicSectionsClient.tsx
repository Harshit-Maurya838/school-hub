"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SectionData {
  id: string;
  name: string;
  capacity: number | null;
  classId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  class: {
    id: string;
    name: string;
    numericOrder?: number | null;
  };
  _count?: {
    enrollments: number;
  };
}

export interface ClassOption {
  id: string;
  name: string;
}

interface Props {
  schoolSlug: string;
  initialSections: SectionData[];
  classes: ClassOption[];
  preselectedClassId?: string;
}

export function AcademicSectionsClient({
  schoolSlug,
  initialSections,
  classes,
  preselectedClassId,
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(
    preselectedClassId || "ALL"
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionData | null>(null);
  const [deletingSection, setDeletingSection] = useState<SectionData | null>(null);

  // Form fields
  const [classId, setClassId] = useState<string>(preselectedClassId || (classes[0]?.id ?? ""));
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<string>("");

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredSections =
    selectedClassFilter === "ALL"
      ? sections
      : sections.filter((s) => s.classId === selectedClassFilter);

  const openCreateModal = () => {
    setClassId(selectedClassFilter !== "ALL" ? selectedClassFilter : (classes[0]?.id ?? ""));
    setName("");
    setCapacity("");
    setError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (sec: SectionData) => {
    setEditingSection(sec);
    setClassId(sec.classId);
    setName(sec.name);
    setCapacity(sec.capacity !== null ? String(sec.capacity) : "");
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!classId) {
      setError("Please select a parent class.");
      return;
    }
    if (!name.trim()) {
      setError("Please provide a section name.");
      return;
    }

    let parsedCapacity: number | null = null;
    if (capacity.trim() !== "") {
      parsedCapacity = parseInt(capacity, 10);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        setError("Capacity must be a positive integer.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          name: name.trim(),
          capacity: parsedCapacity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create section");
      }

      setSuccess(`Section '${data.data.section.name}' created successfully.`);
      setIsCreateOpen(false);
      router.refresh();
      setSections((prev) => [...prev, data.data.section]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setError(null);

    if (!classId) {
      setError("Please select a parent class.");
      return;
    }
    if (!name.trim()) {
      setError("Please provide a section name.");
      return;
    }

    let parsedCapacity: number | null = null;
    if (capacity.trim() !== "") {
      parsedCapacity = parseInt(capacity, 10);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        setError("Capacity must be a positive integer.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/sections/${editingSection.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId,
            name: name.trim(),
            capacity: parsedCapacity,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update section");
      }

      setSuccess(`Section '${data.data.section.name}' updated successfully.`);
      setEditingSection(null);
      router.refresh();
      setSections((prev) =>
        prev.map((s) => (s.id === data.data.section.id ? { ...s, ...data.data.section } : s))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSection) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/sections/${deletingSection.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete section");
      }

      setSuccess(`Section '${deletingSection.name}' deleted.`);
      setDeletingSection(null);
      router.refresh();
      setSections((prev) => prev.filter((s) => s.id !== deletingSection.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Filter by Class:
          </label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Classes ({sections.length})</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          disabled={classes.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Create Section</span>
        </button>
      </div>

      {classes.length === 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-xs text-amber-300">
          ⚠️ No classes exist in this school yet. Please create a class first before creating
          sections.
        </div>
      )}

      {/* Sections Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
        <div className="border-b border-zinc-800/80 px-6 py-4">
          <h3 className="text-base font-semibold text-white">
            Sections ({filteredSections.length})
          </h3>
          <p className="text-xs text-zinc-400">
            Class groups, division cohorts, and student capacity limits.
          </p>
        </div>

        {filteredSections.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-3 text-sm font-semibold text-zinc-200">No sections found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Create sections (such as A, B, Blue, Red) under your classes.
            </p>
            {classes.length > 0 && (
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Add Section
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Parent Class</th>
                  <th className="px-6 py-3.5">Section Name</th>
                  <th className="px-6 py-3.5">Capacity Limit</th>
                  <th className="px-6 py-3.5">Current Enrollments</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSections.map((sec) => (
                  <tr key={sec.id} className="transition hover:bg-zinc-800/30">
                    <td className="px-6 py-4 font-medium text-indigo-400">{sec.class.name}</td>
                    <td className="px-6 py-4 font-semibold text-white">Section {sec.name}</td>
                    <td className="px-6 py-4 text-xs">
                      {sec.capacity ? (
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-200">
                          {sec.capacity} students max
                        </span>
                      ) : (
                        <span className="text-zinc-500">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400">
                      {sec._count?.enrollments ?? 0} enrolled
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(sec)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingSection(sec)}
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
              <h3 className="text-lg font-semibold text-white">Create Section</h3>
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
                  Parent Class <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Section Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, C, Rose, Lotus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Capacity Limit <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 35"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Must be a positive integer representing max student enrollment.
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
                  {loading ? "Creating..." : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Edit Section</h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Parent Class <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Section Name <span className="text-red-400">*</span>
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
                  Capacity Limit <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
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
      {deletingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Section</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Are you sure you want to delete Section{" "}
              <strong className="text-white">&apos;{deletingSection.name}&apos;</strong> of{" "}
              <span className="text-indigo-400">{deletingSection.class.name}</span>?
            </p>

            {(deletingSection._count?.enrollments ?? 0) > 0 && (
              <div className="mt-3 rounded-xl border border-red-800/80 bg-red-950/40 p-3 text-xs text-red-300">
                ⚠️ This section contains {deletingSection._count?.enrollments} active student
                enrollment(s). Deletion will be rejected by data integrity rules.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSection(null)}
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
