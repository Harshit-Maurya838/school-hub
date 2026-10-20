"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Check,
} from "lucide-react";

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
    setIsCurrent(years.length === 0);
    setError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (year: AcademicYearData) => {
    setEditingYear(year);
    setName(year.name);
    setStartDate(
      typeof year.startDate === "string"
        ? year.startDate.slice(0, 10)
        : year.startDate.toISOString().slice(0, 10)
    );
    setEndDate(
      typeof year.endDate === "string"
        ? year.endDate.slice(0, 10)
        : year.endDate.toISOString().slice(0, 10)
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
      setError("Both start and end dates are required.");
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Setup Prerequisite Required: Complete School Profile
                </h3>
                <p className="text-xs text-amber-700">
                  {blockedReason ||
                    "Complete your school profile before configuring the academic year."}
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

      {/* Active Session Hero */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                Current Operational Session
              </span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
              </span>
            </div>
            {currentYear ? (
              <div className="mt-1.5">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {currentYear.name}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  <span>Timeline:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(currentYear.startDate).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                  <span>&rarr;</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(currentYear.endDate).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </p>
              </div>
            ) : (
              <div className="mt-1.5">
                <h2 className="text-xl font-bold text-amber-700">
                  No Active Academic Year Configured
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Create an academic year and mark it as active to enable session-wide enrollments.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={openCreateModal}
            disabled={!canCreate}
            title={!canCreate ? blockedReason : undefined}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Create Academic Year</span>
          </button>
        </div>
      </div>

      {/* Academic Years List */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Configured Academic Sessions ({years.length})
            </h3>
            <p className="text-xs text-slate-400">
              Institutional calendar history, active operational years, and date spans
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {years.length} Total
          </span>
        </div>

        {years.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-800">No academic years found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Get started by establishing your institution&apos;s first academic year.
            </p>
            {canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Academic Year</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Session Name</th>
                  <th className="px-5 py-3.5">Start Date</th>
                  <th className="px-5 py-3.5">End Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Enrollments</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {years.map((year) => (
                  <tr
                    key={year.id}
                    className={`transition-colors ${
                      year.isCurrent
                        ? "bg-emerald-50/40 hover:bg-emerald-50/60"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900">{year.name}</div>
                      {year.isCurrent && (
                        <div className="mt-0.5 text-[11px] font-bold text-emerald-700">
                          Active School Session
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {new Date(year.startDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {new Date(year.endDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      {year.isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="font-bold text-slate-900">
                        {year._count?.enrollments ?? 0}
                      </span>{" "}
                      enrolled
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!year.isCurrent && (
                          <button
                            disabled={loading}
                            onClick={() => handleSetCurrent(year)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(year)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={year.isCurrent}
                          onClick={() => setDeletingYear(year)}
                          title={year.isCurrent ? "Cannot delete active session" : "Delete session"}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
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

      {/* Create Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Create Academic Year</h3>
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
                  Academic Year Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027 or Session 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                />
                <label htmlFor="isCurrent" className="text-xs font-bold text-slate-700">
                  Set as active school session immediately
                </label>
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
                  {loading ? "Creating..." : "Create Academic Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Edit Academic Year</h3>
              <button
                onClick={() => setEditingYear(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Academic Year Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsCurrent"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                />
                <label htmlFor="editIsCurrent" className="text-xs font-bold text-slate-700">
                  Active school session
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingYear(null)}
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
      {deletingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Delete Academic Year</h3>
            <p className="mt-2 text-xs text-slate-600">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">&apos;{deletingYear.name}&apos;</strong>?
            </p>
            {deletingYear._count?.enrollments ? (
              <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                ⚠️ This academic year has {deletingYear._count.enrollments} student enrollment(s).
                The deletion will be blocked by safety checks.
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingYear(null)}
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
