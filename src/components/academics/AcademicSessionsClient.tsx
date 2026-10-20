"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AcademicYearData {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isCurrent: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    enrollments: number;
  };
}

import Link from "next/link";

interface Props {
  schoolSlug: string;
  initialYears: AcademicYearData[];
  canCreate?: boolean;
  blockedReason?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function AcademicSessionsClient({
  schoolSlug,
  initialYears,
  canCreate = true,
  blockedReason,
  actionUrl = `/school/${schoolSlug}/settings`,
  actionLabel = "Complete School Profile",
}: Props) {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYearData[]>(initialYears);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearData | null>(null);
  const [deletingYear, setDeletingYear] = useState<AcademicYearData | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentYear = years.find((y) => y.isCurrent);

  const openCreateModal = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(years.length === 0); // Default to current if first year
    setError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (year: AcademicYearData) => {
    setEditingYear(year);
    setName(year.name);
    setStartDate(
      typeof year.startDate === "string"
        ? year.startDate.substring(0, 10)
        : new Date(year.startDate).toISOString().substring(0, 10)
    );
    setEndDate(
      typeof year.endDate === "string"
        ? year.endDate.substring(0, 10)
        : new Date(year.endDate).toISOString().substring(0, 10)
    );
    setIsCurrent(year.isCurrent);
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide an academic year name.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please provide both start date and end date.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be later than start date.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/years`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isCurrent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create academic year");
      }

      setSuccess(`Academic year '${data.data.academicYear.name}' created successfully.`);
      setIsCreateOpen(false);
      router.refresh();
      // Optimistic update
      const created = data.data.academicYear;
      setYears((prev) => {
        const updated = isCurrent ? prev.map((y) => ({ ...y, isCurrent: false })) : [...prev];
        return [created, ...updated];
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    setError(null);

    if (!name.trim()) {
      setError("Please provide an academic year name.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be later than start date.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/years/${editingYear.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isCurrent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update academic year");
      }

      setSuccess(`Academic year '${data.data.academicYear.name}' updated successfully.`);
      setEditingYear(null);
      router.refresh();
      const updated = data.data.academicYear;
      setYears((prev) =>
        prev.map((y) => {
          if (y.id === updated.id) return { ...y, ...updated };
          if (isCurrent) return { ...y, isCurrent: false };
          return y;
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (year: AcademicYearData) => {
    if (year.isCurrent) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/years/${year.id}/set-current`,
        {
          method: "POST",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to switch active session");
      }

      setSuccess(`Active session switched to '${year.name}'.`);
      router.refresh();
      setYears((prev) =>
        prev.map((y) => ({
          ...y,
          isCurrent: y.id === year.id,
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingYear) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/years/${deletingYear.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete academic year");
      }

      setSuccess(`Academic year '${deletingYear.name}' deleted.`);
      setDeletingYear(null);
      router.refresh();
      setYears((prev) => prev.filter((y) => y.id !== deletingYear.id));
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
                Setup Prerequisite Required: Complete School Profile
              </h3>
              <p className="text-xs text-zinc-300">
                {blockedReason ||
                  "Complete your school profile before configuring the academic year."}
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

      {/* Prominent Current Academic Year Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-6 shadow-xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              Current Academic Session
            </span>
            {currentYear ? (
              <div className="mt-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  {currentYear.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Active timeline:{" "}
                  <span className="font-medium text-zinc-200">
                    {new Date(currentYear.startDate).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>{" "}
                  &rarr;{" "}
                  <span className="font-medium text-zinc-200">
                    {new Date(currentYear.endDate).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <h2 className="text-2xl font-bold text-amber-400">
                  No Active Academic Year Configured
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Please create an academic year or mark an existing one as current to enable
                  session-wide enrollments.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={openCreateModal}
            disabled={!canCreate}
            title={!canCreate ? blockedReason : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Create Academic Year</span>
          </button>
        </div>
      </div>

      {/* Academic Years List */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
        <div className="border-b border-zinc-800/80 px-6 py-4">
          <h3 className="text-base font-semibold text-white">
            Configured Academic Sessions ({years.length})
          </h3>
          <p className="text-xs text-zinc-400">
            Historical and current institutional calendar sessions.
          </p>
        </div>

        {years.length === 0 ? (
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-3 text-sm font-semibold text-zinc-200">No academic years found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Get started by establishing your institution&apos;s first academic year.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Add Academic Year
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Session Name</th>
                  <th className="px-6 py-3.5">Start Date</th>
                  <th className="px-6 py-3.5">End Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Enrollments</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {years.map((year) => (
                  <tr
                    key={year.id}
                    className={`transition ${
                      year.isCurrent
                        ? "bg-emerald-950/10 hover:bg-emerald-950/20"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{year.name}</div>
                      {year.isCurrent && (
                        <div className="text-[11px] font-medium text-emerald-400">
                          Active School Session
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                      {new Date(year.startDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                      {new Date(year.endDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {year.isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Current
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-xs text-zinc-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400">
                      {year._count?.enrollments ?? 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!year.isCurrent && (
                          <button
                            disabled={loading}
                            onClick={() => handleSetCurrent(year)}
                            className="rounded-lg border border-indigo-700/60 bg-indigo-950/50 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-900/80 disabled:opacity-50"
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(year)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          disabled={year.isCurrent}
                          onClick={() => setDeletingYear(year)}
                          title={
                            year.isCurrent
                              ? "Cannot delete the active academic year"
                              : "Delete academic year"
                          }
                          className="rounded-lg border border-red-900/40 bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-30"
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

      {/* Create Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Create Academic Year</h3>
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
                  Academic Year Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027 or Session 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    End Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isCurrent" className="text-xs font-medium text-zinc-300">
                  Set as active school session immediately
                </label>
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
                  {loading ? "Creating..." : "Create Academic Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Edit Academic Year</h3>
              <button
                onClick={() => setEditingYear(null)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Academic Year Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="editIsCurrent"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIsCurrent" className="text-xs font-medium text-zinc-300">
                  Active school session
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingYear(null)}
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

      {/* Delete Confirmation Dialog */}
      {deletingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Academic Year</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Are you sure you want to delete{" "}
              <strong className="text-white">&apos;{deletingYear.name}&apos;</strong>?
            </p>
            {deletingYear._count?.enrollments ? (
              <p className="mt-2 text-xs text-amber-400">
                ⚠️ This academic year has {deletingYear._count.enrollments} student enrollment(s).
                The deletion will be blocked by safety checks.
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingYear(null)}
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
