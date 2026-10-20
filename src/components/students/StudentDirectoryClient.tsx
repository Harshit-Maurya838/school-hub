"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export interface StudentListItem {
  id: string;
  name: string;
  admissionNumber: string;
  dob: string | Date;
  gender: string;
  apaarId?: string | null;
  isActive: boolean;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  guardians: Array<{
    isPrimary: boolean;
    relationship: string;
    guardian: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    };
  }>;
  enrollments: Array<{
    id: string;
    rollNumber?: string | null;
    status: string;
    section: {
      id: string;
      name: string;
      class: {
        id: string;
        name: string;
      };
    };
    academicYear: {
      id: string;
      name: string;
      isCurrent: boolean;
    };
  }>;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface FilterOptions {
  classes: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; classId: string }>;
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
}

interface Props {
  schoolSlug: string;
  filterOptions: FilterOptions;
  initialStudents?: StudentListItem[];
  initialPagination?: PaginationData;
}

export function StudentDirectoryClient({
  schoolSlug,
  filterOptions,
  initialStudents = [],
  initialPagination = { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false },
}: Props) {
  const isInitialMount = useRef(true);
  const searchParams = useSearchParams();

  // State
  const [students, setStudents] = useState<StudentListItem[]>(initialStudents);
  const [pagination, setPagination] = useState<PaginationData>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [academicYearId, setAcademicYearId] = useState(searchParams.get("academicYearId") || "");
  const [classId, setClassId] = useState(searchParams.get("classId") || "");
  const [sectionId, setSectionId] = useState(searchParams.get("sectionId") || "");
  const [status, setStatus] = useState<string>(searchParams.get("status") || "ACTIVE");
  const [page, setPage] = useState<number>(parseInt(searchParams.get("page") || "1", 10) || 1);
  const [limit, setLimit] = useState<number>(parseInt(searchParams.get("limit") || "10", 10) || 10);

  // Archival modal state
  const [archivingStudent, setArchivingStudent] = useState<StudentListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [isSubmittingArchive, setIsSubmittingArchive] = useState(false);

  // Dependent sections based on selected class
  const availableSections = classId
    ? filterOptions.sections.filter((s) => s.classId === classId)
    : filterOptions.sections;

  // Fetch students with DB pagination & filtering
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (academicYearId) params.set("academicYearId", academicYearId);
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    if (status) params.set("status", status);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch student directory");
      }

      setStudents(json.data.students || []);
      if (json.data.pagination) {
        setPagination(json.data.pagination);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [schoolSlug, search, academicYearId, classId, sectionId, status, page, limit]);

  // Handle filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchStudents();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // When class changes, reset section if it no longer belongs
  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    if (newClassId && sectionId) {
      const belongs = filterOptions.sections.some(
        (s) => s.id === sectionId && s.classId === newClassId
      );
      if (!belongs) {
        setSectionId("");
      }
    }
    setPage(1);
  };

  const handleArchive = async () => {
    if (!archivingStudent) return;
    setIsSubmittingArchive(true);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${archivingStudent.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: archiveReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to archive student");
      }

      setArchivingStudent(null);
      setArchiveReason("");
      fetchStudents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error archiving student";
      setError(message);
    } finally {
      setIsSubmittingArchive(false);
    }
  };

  const handleRestore = async (studentId: string) => {
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${studentId}/restore`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to restore student");
      }

      fetchStudents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error restoring student";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Search Box */}
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Search Directory
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by student name or admission #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute top-2.5 right-2.5 text-xs text-zinc-400 hover:text-white"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Academic Year Filter */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Session
            </label>
            <select
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Academic Sessions</option>
              {filterOptions.academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Class / Grade
            </label>
            <select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Classes</option>
              {filterOptions.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Sections</option>
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="ACTIVE">Active Students</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ALL">All Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-xs text-red-300">
          <p className="font-semibold">Error Loading Students</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Student Table or Empty State */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400">
                <th className="px-5 py-3.5 font-semibold">Admission #</th>
                <th className="px-5 py-3.5 font-semibold">Student Name</th>
                <th className="px-5 py-3.5 font-semibold">Gender / DOB</th>
                <th className="px-5 py-3.5 font-semibold">Class & Section</th>
                <th className="px-5 py-3.5 font-semibold">Primary Guardian</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading && students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <span>Loading student directory...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full border border-zinc-800 bg-zinc-900 p-3 text-zinc-400">
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-white">No students found</p>
                      <p className="max-w-md text-xs text-zinc-400">
                        {search || academicYearId || classId || sectionId
                          ? "No student records matched your search filters. Try adjusting your query."
                          : "No students admitted yet. Start by admitting your first student into the school."}
                      </p>
                      <Link
                        href={`/school/${schoolSlug}/students/new`}
                        className="mt-3 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                      >
                        Admit Student
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const primaryGuardian =
                    student.guardians.find((g) => g.isPrimary) || student.guardians[0];
                  const currentEnrollment =
                    student.enrollments.find((e) => e.academicYear.isCurrent) ||
                    student.enrollments[0];
                  const isArchived = Boolean(student.deletedAt);

                  return (
                    <tr key={student.id} className="group transition hover:bg-zinc-800/40">
                      {/* Admission Number */}
                      <td className="px-5 py-4 font-mono font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-300">
                            {student.admissionNumber}
                          </span>
                        </div>
                        {student.apaarId && (
                          <span className="mt-1 block text-[10px] text-zinc-500">
                            APAAR: {student.apaarId}
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/school/${schoolSlug}/students/${student.id}`}
                          className="font-semibold text-white transition group-hover:text-indigo-400"
                        >
                          {student.name}
                        </Link>
                      </td>

                      {/* Gender & DOB */}
                      <td className="px-5 py-4 text-zinc-300">
                        <div>{student.gender}</div>
                        <div className="text-[11px] text-zinc-500">
                          {new Date(student.dob).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="px-5 py-4 text-zinc-300">
                        {currentEnrollment ? (
                          <div>
                            <span className="font-medium text-white">
                              {currentEnrollment.section.class.name}
                            </span>
                            <span className="mx-1.5 text-zinc-600">&bull;</span>
                            <span className="text-zinc-400">
                              Section {currentEnrollment.section.name}
                            </span>
                            {currentEnrollment.rollNumber && (
                              <span className="ml-2 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                Roll #{currentEnrollment.rollNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">Not enrolled</span>
                        )}
                      </td>

                      {/* Primary Guardian */}
                      <td className="px-5 py-4 text-zinc-300">
                        {primaryGuardian ? (
                          <div>
                            <div className="font-medium text-zinc-200">
                              {primaryGuardian.guardian.name}
                              <span className="ml-1 text-[10px] text-zinc-500">
                                ({primaryGuardian.relationship})
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {primaryGuardian.guardian.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">None linked</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {isArchived ? (
                          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                            Archived
                          </span>
                        ) : student.isActive ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/school/${schoolSlug}/students/${student.id}`}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                          >
                            Profile
                          </Link>

                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(student.id)}
                              className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-900/60"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setArchivingStudent(student)}
                              className="rounded-lg border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-red-800/80 hover:bg-red-950/40 hover:text-red-300"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Database-level Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 px-5 py-4 text-xs text-zinc-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-white">
              {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-white">{pagination.total}</span> students
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 transition hover:bg-zinc-800 disabled:opacity-40"
              >
                &larr; Prev
              </button>

              <span className="px-2 text-zinc-400">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
              </span>

              <button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 transition hover:bg-zinc-800 disabled:opacity-40"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Archival */}
      {archivingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Archive Student Record</h3>
            <p className="mt-2 text-xs text-zinc-400">
              Are you sure you want to archive{" "}
              <strong className="text-white">{archivingStudent.name}</strong> (Admission #{" "}
              {archivingStudent.admissionNumber})?
            </p>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">Safety Guarantee:</span> Historical
              enrollment records, guardian links, and academic history remain preserved in the
              database and will NOT be deleted.
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Reason for Archival (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Transferred to another institution, graduated, or withdrawn..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmittingArchive}
                onClick={() => setArchivingStudent(null)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingArchive}
                onClick={handleArchive}
                className="inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
              >
                {isSubmittingArchive ? "Archiving..." : "Confirm Archival"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
