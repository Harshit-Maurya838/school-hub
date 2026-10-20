"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Users, Phone, Eye, Archive, RotateCcw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { StudentAnalyticsCards } from "./StudentAnalyticsCards";
import { canManageStudents, getRoleDisplayName } from "@/lib/role-ui";

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
  userRole?: string;
}

export function StudentDirectoryClient({
  schoolSlug,
  filterOptions,
  initialStudents = [],
  initialPagination = { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false },
  userRole = "SCHOOL_ADMIN",
}: Props) {
  const isInitialMount = useRef(true);
  const searchParams = useSearchParams();
  const canManage = canManageStudents(userRole);

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

  // Compute demographic metrics from current view
  const boysInView = students.filter((s) => s.gender === "MALE").length;
  const girlsInView = students.filter((s) => s.gender === "FEMALE").length;
  const enrolledInView = students.filter((s) => s.enrollments && s.enrollments.length > 0).length;

  return (
    <div className="space-y-6">
      {/* 4 Gradient KPI Analytics Cards */}
      <StudentAnalyticsCards
        total={pagination.total || students.length}
        boys={boysInView}
        girls={girlsInView}
        activeEnrolled={enrolledInView}
      />

      {/* Action Pills & Status View Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-1">
          <Link
            href={`/school/${schoolSlug}/students/new`}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Student</span>
          </Link>

          <button
            onClick={() => {
              setStatus("ACTIVE");
              setPage(1);
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
              status === "ACTIVE"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Active Students</span>
          </button>

          <button
            onClick={() => {
              setStatus("ARCHIVED");
              setPage(1);
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
              status === "ARCHIVED"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Archived Roster</span>
          </button>

          <button
            onClick={() => {
              setStatus("ALL");
              setPage(1);
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
              status === "ALL"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>All Records</span>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-400">
          Showing <span className="font-bold text-slate-700">{students.length}</span> of{" "}
          <span className="font-bold text-slate-700">{pagination.total}</span> registered
        </div>
      </div>

      {/* Universal Search & Multi-Select Filters Row */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Universal Search */}
          <div className="relative md:col-span-5">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by Name, Admission #, or APAAR ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-8 pl-10 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none md:text-sm"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute top-2.5 right-3 cursor-pointer text-xs text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Academic Session */}
          <div className="md:col-span-3">
            <select
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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
            <select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">All Classes ({filterOptions.classes.length})</option>
              {filterOptions.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="md:col-span-2">
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">All Sections</option>
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!canManage && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200/70 bg-blue-50/70 px-3.5 py-2.5 text-xs text-blue-900">
            <Users className="h-4 w-4 shrink-0 text-blue-600" />
            <span>
              <strong>{getRoleDisplayName(userRole)} View:</strong> You have read-only access to browse students and view contact details. Admissions and archive modifications require a School Administrator.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Student Records Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {loading && (
          <div className="h-1 overflow-hidden bg-emerald-100">
            <div className="h-full w-full animate-pulse bg-emerald-600" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 font-bold tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Admission #</th>
                <th className="px-4 py-3">Student Details</th>
                <th className="px-4 py-3">Class & Section</th>
                <th className="px-4 py-3">Primary Guardian</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p className="font-bold text-slate-700">
                      No student records match the criteria
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Try adjusting filters or admit a new student to this tenant.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const primaryGuardian = st.guardians.find((g) => g.isPrimary) || st.guardians[0];
                  const activeEnrollment =
                    st.enrollments.find((e) => e.academicYear?.isCurrent) || st.enrollments[0];
                  const initials = st.name
                    ? st.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "ST";
                  const isArchived = Boolean(st.deletedAt);

                  return (
                    <tr key={st.id} className="group transition-colors hover:bg-slate-50/80">
                      {/* Admission # & APAAR */}
                      <td className="px-4 py-3.5 font-mono">
                        <span className="inline-block rounded-md border border-emerald-100/70 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          {st.admissionNumber}
                        </span>
                        {st.apaarId && (
                          <span className="mt-1 block font-mono text-[10px] text-slate-400">
                            APAAR: {st.apaarId}
                          </span>
                        )}
                      </td>

                      {/* Student Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/school/${schoolSlug}/students/${st.id}`}
                              className="font-bold text-slate-900 transition-colors group-hover:text-emerald-700"
                            >
                              {st.name}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-2">
                              <Badge variant={st.gender === "MALE" ? "boy" : "girl"} size="sm">
                                {st.gender === "MALE" ? "Boy" : "Girl"}
                              </Badge>
                              <span className="text-[11px] text-slate-400">
                                DOB:{" "}
                                {new Date(st.dob).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="px-4 py-3.5">
                        {activeEnrollment ? (
                          <div>
                            <span className="font-bold text-slate-800">
                              {activeEnrollment.section.class.name}
                            </span>
                            <span className="py-0.2 ml-1 rounded border border-emerald-100/60 bg-emerald-50 px-1.5 text-[11px] font-semibold text-emerald-700">
                              Sec - {activeEnrollment.section.name}
                            </span>
                            {activeEnrollment.rollNumber && (
                              <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                                Roll: #{activeEnrollment.rollNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Primary Guardian */}
                      <td className="px-4 py-3.5">
                        {primaryGuardian ? (
                          <div>
                            <span className="font-bold text-slate-800">
                              {primaryGuardian.guardian.name}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              ({primaryGuardian.relationship})
                            </span>
                            <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-slate-600">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{primaryGuardian.guardian.phone}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No guardian linked
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isArchived ? (
                          <Badge variant="alert" size="sm">
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/school/${schoolSlug}/students/${st.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                            title="View student profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Link>

                          {canManage && (
                            <>
                              {isArchived ? (
                                <button
                                  onClick={() => handleRestore(st.id)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                                  title="Restore student"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>Restore</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setArchivingStudent(st)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                                  title="Archive student"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  <span>Archive</span>
                                </button>
                              )}
                            </>
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

        {/* Pagination Toolbar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 p-4 text-xs sm:flex-row">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 focus:outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="text-slate-400">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => (pagination.hasMore ? p + 1 : p))}
              disabled={!pagination.hasMore}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Archival Confirmation Modal */}
      {archivingStudent && (
        <Modal
          isOpen={Boolean(archivingStudent)}
          onClose={() => setArchivingStudent(null)}
          title={`Archive Student: ${archivingStudent.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-600">
              Archiving removes <strong className="text-slate-800">{archivingStudent.name}</strong>{" "}
              (Admission #{archivingStudent.admissionNumber}) from active class rosters and
              directories. All records, historical enrollments, and audit logs are preserved and can
              be restored.
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Reason for Archival (Optional)
              </label>
              <textarea
                placeholder="e.g. Transferred to another institution, TC issued, or graduated..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setArchivingStudent(null)}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isSubmittingArchive}
                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmittingArchive ? "Archiving..." : "Confirm Archival"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default StudentDirectoryClient;
