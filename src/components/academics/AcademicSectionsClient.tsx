"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Grid,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Filter,
  UserCheck,
  BookOpen,
  GraduationCap,
  History,
  Loader2,
} from "lucide-react";

export interface SectionAssignmentData {
  section: {
    id: string;
    name: string;
    classId: string;
    className: string;
  };
  classTeacher: {
    id: string;
    teacherProfileId: string;
    name: string;
    email: string | null;
    phone: string | null;
    employeeId: string | null;
    designation: string | null;
    startDate: string;
    status: string;
    notes?: string | null;
  } | null;
  classTeacherHistory: Array<{
    id: string;
    name: string;
    employeeId: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
  }>;
  subjectTeachers: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string | null;
    teacherProfileId: string;
    teacherName: string;
    employeeId: string | null;
    periodsPerWeek: number | null;
    startDate: string;
    status: string;
    notes?: string | null;
  }>;
  availableSubjects: Array<{
    id: string;
    name: string;
    code: string | null;
    isClassSpecific: boolean;
  }>;
  availableTeachers: Array<{
    id: string;
    name: string;
    email: string | null;
    employeeId: string | null;
    department: string | null;
    designation: string | null;
  }>;
}

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
    subjectAssignments?: number;
  };
  classTeacher?: {
    id: string;
    name: string;
    employeeId?: string | null;
  } | null;
}

export interface ClassOption {
  id: string;
  name: string;
}

interface Props {
  schoolSlug: string;
  initialSections: SectionData[];
  classes: ClassOption[];
  currentAcademicYearId?: string | null;
  currentAcademicYearName?: string | null;
  preselectedClassId?: string;
  canCreate?: boolean;
  canAssignTeachers?: boolean;
  blockedReason?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function AcademicSectionsClient({
  schoolSlug,
  initialSections,
  classes,
  currentAcademicYearId,
  currentAcademicYearName,
  preselectedClassId,
  canCreate = true,
  canAssignTeachers = true,
  blockedReason,
  actionUrl = `/school/${schoolSlug}/academics/classes`,
  actionLabel = "Create Class First",
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(
    preselectedClassId || "ALL"
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionData | null>(null);
  const [deletingSection, setDeletingSection] = useState<SectionData | null>(null);

  // Teaching Assignment Modal State
  const [assigningSection, setAssigningSection] = useState<SectionData | null>(null);
  const [assignmentData, setAssignmentData] = useState<SectionAssignmentData | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [selectedClassTeacherId, setSelectedClassTeacherId] = useState<string>("");
  const [workloadWarning, setWorkloadWarning] = useState<string | null>(null);
  const [subjectTeacherSelections, setSubjectTeacherSelections] = useState<Record<string, string>>(
    {}
  );

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

  const openAssignmentModal = async (sec: SectionData) => {
    setAssigningSection(sec);
    setAssignmentError(null);
    setAssignmentSuccess(null);
    setWorkloadWarning(null);
    setAssignmentLoading(true);

    try {
      if (!currentAcademicYearId) {
        throw new Error("Active academic session is required to assign faculty members.");
      }

      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/assignments?academicYearId=${currentAcademicYearId}&sectionId=${sec.id}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load teaching assignments");
      }

      setAssignmentData(json.data.assignments);
      setSelectedClassTeacherId(json.data.assignments.classTeacher?.teacherProfileId || "");
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleSaveClassTeacher = async () => {
    if (!assigningSection || !currentAcademicYearId || !selectedClassTeacherId) return;

    setAssignmentLoading(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/academics/assignments/class-teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: currentAcademicYearId,
          classId: assigningSection.classId,
          sectionId: assigningSection.id,
          teacherProfileId: selectedClassTeacherId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to assign class teacher");
      }

      const assigned = json.data.classTeacher;
      const teacherName = assigned.teacher.user.name;
      const employeeId = assigned.teacher.employeeId;

      setSections((prev) =>
        prev.map((s) =>
          s.id === assigningSection.id
            ? {
                ...s,
                classTeacher: { id: assigned.teacherProfileId, name: teacherName, employeeId },
              }
            : s
        )
      );

      setAssignmentData((prev: SectionAssignmentData | null) =>
        prev
          ? {
              ...prev,
              classTeacher: {
                id: assigned.id,
                teacherProfileId: assigned.teacherProfileId,
                name: teacherName,
                email: null,
                phone: null,
                employeeId,
                designation: null,
                startDate: new Date().toISOString(),
                status: "ACTIVE",
              },
            }
          : prev
      );

      setAssignmentSuccess(
        `Class teacher successfully assigned to Section ${assigningSection.name}!`
      );
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleSaveSubjectTeacher = async (subjectId: string, teacherProfileId: string) => {
    if (!assigningSection || !currentAcademicYearId || !teacherProfileId) return;

    setAssignmentLoading(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);
    setWorkloadWarning(null);

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/assignments/subject-teacher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYearId: currentAcademicYearId,
            classId: assigningSection.classId,
            sectionId: assigningSection.id,
            subjectId,
            teacherProfileId,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to assign subject teacher");
      }

      if (json.data.workload?.warning) {
        setWorkloadWarning(json.data.workload.warning);
      }

      // Re-fetch assignments for this section
      const refreshRes = await fetch(
        `/api/v1/school/${schoolSlug}/academics/assignments?academicYearId=${currentAcademicYearId}&sectionId=${assigningSection.id}`
      );
      const refreshJson = await refreshRes.json();
      if (refreshRes.ok) {
        setAssignmentData(refreshJson.data.assignments);
        setSections((prev) =>
          prev.map((s) =>
            s.id === assigningSection.id
              ? {
                  ...s,
                  _count: {
                    ...s._count,
                    enrollments: s._count?.enrollments ?? 0,
                    subjectAssignments: refreshJson.data.assignments.subjectTeachers.length,
                  },
                }
              : s
          )
        );
      }

      setAssignmentSuccess("Subject teacher assigned successfully!");
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleRemoveSubjectTeacher = async (assignmentId: string) => {
    if (!assigningSection || !currentAcademicYearId) return;

    setAssignmentLoading(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/academics/assignments/subject-teacher/${assignmentId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to remove assignment");
      }

      // Refresh
      const refreshRes = await fetch(
        `/api/v1/school/${schoolSlug}/academics/assignments?academicYearId=${currentAcademicYearId}&sectionId=${assigningSection.id}`
      );
      const refreshJson = await refreshRes.json();
      if (refreshRes.ok) {
        setAssignmentData(refreshJson.data.assignments);
        setSections((prev) =>
          prev.map((s) =>
            s.id === assigningSection.id
              ? {
                  ...s,
                  _count: {
                    ...s._count,
                    enrollments: s._count?.enrollments ?? 0,
                    subjectAssignments: refreshJson.data.assignments.subjectTeachers.length,
                  },
                }
              : s
          )
        );
      }

      setAssignmentSuccess("Subject teaching assignment removed.");
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!classId) {
      setError("Please select a parent class.");
      return;
    }

    if (!name.trim()) {
      setError("Please specify a section name.");
      return;
    }

    const parsedCapacity = capacity.trim() !== "" ? parseInt(capacity, 10) : null;
    if (parsedCapacity !== null && (isNaN(parsedCapacity) || parsedCapacity <= 0)) {
      setError("Section capacity must be a positive number.");
      return;
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
      setError("Please specify a section name.");
      return;
    }

    const parsedCapacity = capacity.trim() !== "" ? parseInt(capacity, 10) : null;
    if (parsedCapacity !== null && (isNaN(parsedCapacity) || parsedCapacity <= 0)) {
      setError("Section capacity must be a positive number.");
      return;
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
      {/* Prerequisite Required Banner */}
      {!canCreate && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Setup Prerequisite Required: Section Creation Blocked
                </h3>
                <p className="text-xs text-amber-700">
                  {blockedReason ||
                    "Create at least one class and ensure an academic year is active before creating sections."}
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
        <div className="flex items-center gap-2.5">
          <Filter className="h-4 w-4 text-slate-400" />
          <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Filter Class:
          </label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition focus:border-emerald-500 focus:outline-none"
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
          disabled={!canCreate || classes.length === 0}
          title={
            !canCreate ? blockedReason : classes.length === 0 ? "Create a class first" : undefined
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Create Section</span>
        </button>
      </div>

      {classes.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          ⚠️ No classes exist in this school yet. Please create a class first before creating
          sections.
        </div>
      )}

      {/* Sections Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Sections Directory ({filteredSections.length})
            </h3>
            <p className="text-xs text-slate-400">
              Class groups, division cohorts, and student capacity limits
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {sections.length} Total
          </span>
        </div>

        {filteredSections.length === 0 ? (
          <div className="p-12 text-center">
            <Grid className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-800">No sections found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Create sections (such as A, B, Blue, Red) under your classes.
            </p>
            {classes.length > 0 && canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Section</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Parent Class</th>
                  <th className="px-5 py-3.5">Section Name</th>
                  <th className="px-5 py-3.5">Capacity Limit</th>
                  <th className="px-5 py-3.5">Class Teacher</th>
                  <th className="px-5 py-3.5 text-center">Subject Faculty</th>
                  <th className="px-5 py-3.5 text-center">Enrollments</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSections.map((sec) => (
                  <tr key={sec.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-extrabold text-slate-900">
                        {sec.class.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900">Section {sec.name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {sec.capacity ? (
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          {sec.capacity} students max
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {sec.classTeacher ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-[10px] font-black text-emerald-800">
                            {sec.classTeacher.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{sec.classTeacher.name}</p>
                            {sec.classTeacher.employeeId && (
                              <p className="font-mono text-[10px] text-slate-400">
                                {sec.classTeacher.employeeId}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                        {sec._count?.subjectAssignments ?? 0} Assigned
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center text-slate-600">
                      <span className="font-bold text-slate-900">
                        {sec._count?.enrollments ?? 0}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canAssignTeachers && currentAcademicYearId && (
                          <button
                            onClick={() => openAssignmentModal(sec)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-slate-50 hover:text-emerald-800"
                            title="Assign Class & Subject Teachers"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Assign Faculty</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(sec)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingSection(sec)}
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
              <h3 className="text-base font-extrabold text-slate-900">Create Section</h3>
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
                  Parent Class <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Section Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, C, Rose, Lotus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Capacity Limit <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 35"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Must be a positive integer representing max student enrollment.
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
                  {loading ? "Creating..." : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Edit Section</h3>
              <button
                onClick={() => setEditingSection(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Parent Class <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Section Name <span className="text-rose-500">*</span>
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
                  Capacity Limit <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
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
      {deletingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Delete Section</h3>
            <p className="mt-2 text-xs text-slate-600">
              Are you sure you want to delete Section{" "}
              <strong className="text-slate-900">&apos;{deletingSection.name}&apos;</strong> of{" "}
              <span className="font-bold text-emerald-800">{deletingSection.class.name}</span>?
            </p>

            {(deletingSection._count?.enrollments ?? 0) > 0 && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                ⚠️ This section contains {deletingSection._count?.enrollments} active student
                enrollment(s). Deletion will be rejected by data integrity rules.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingSection(null)}
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

      {/* Faculty & Teaching Assignment Modal */}
      {assigningSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Faculty Allocation & Teaching Assignments
                  </h3>
                  <p className="text-xs text-slate-500">
                    {assigningSection.class.name} — Section {assigningSection.name}
                    {currentAcademicYearName && (
                      <span className="ml-2 font-semibold text-emerald-700">
                        • Session: {currentAcademicYearName}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAssigningSection(null);
                  setAssignmentData(null);
                  setAssignmentError(null);
                  setAssignmentSuccess(null);
                  setWorkloadWarning(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Alerts */}
            <div className="mt-4 shrink-0 space-y-2">
              {assignmentError && (
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{assignmentError}</span>
                  </div>
                  <button
                    onClick={() => setAssignmentError(null)}
                    className="text-xs font-bold text-rose-700 hover:text-rose-950"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {assignmentSuccess && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{assignmentSuccess}</span>
                  </div>
                  <button
                    onClick={() => setAssignmentSuccess(null)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-950"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {workloadWarning && (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>{workloadWarning}</span>
                  </div>
                  <button
                    onClick={() => setWorkloadWarning(null)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-950"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-1">
              {assignmentLoading && !assignmentData ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-emerald-600" />
                  <p className="text-xs font-bold">Loading teaching assignments...</p>
                </div>
              ) : assignmentData ? (
                <>
                  {/* 1. Class Teacher Assignment Section */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-emerald-700" />
                        <h4 className="text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                          Class Teacher
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        1 active teacher per section per academic year
                      </span>
                    </div>

                    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                      {/* Current Status Card */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                        <span className="mb-1 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Current Assigned Class Teacher
                        </span>
                        {assignmentData.classTeacher ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-800">
                              {assignmentData.classTeacher.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {assignmentData.classTeacher.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                {assignmentData.classTeacher.employeeId && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                                    {assignmentData.classTeacher.employeeId}
                                  </span>
                                )}
                                <span>{assignmentData.classTeacher.designation || "Faculty"}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="py-1 text-xs text-slate-400 italic">
                            No class teacher currently assigned.
                          </p>
                        )}
                      </div>

                      {/* Assignment Selector */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700">
                          {assignmentData.classTeacher
                            ? "Reassign Class Teacher"
                            : "Designate Class Teacher"}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedClassTeacherId}
                            onChange={(e) => setSelectedClassTeacherId(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="">Select a faculty member...</option>
                            {assignmentData.availableTeachers?.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.employeeId || "No ID"}){" "}
                                {t.department ? `— ${t.department}` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              assignmentLoading ||
                              !selectedClassTeacherId ||
                              selectedClassTeacherId ===
                                assignmentData.classTeacher?.teacherProfileId
                            }
                            onClick={handleSaveClassTeacher}
                            className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {assignmentLoading ? "Saving..." : "Save"}
                          </button>
                        </div>
                        {assignmentData.classTeacher && (
                          <p className="text-[10px] text-slate-400">
                            Reassigning will automatically archive the previous class teacher into
                            historical records.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Historical Class Teachers */}
                    {assignmentData.classTeacherHistory?.length > 0 && (
                      <div className="mt-4 border-t border-slate-200/60 pt-3">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <History className="h-3.5 w-3.5" />
                          <span>Previous Class Teachers This Session</span>
                        </div>
                        <div className="space-y-1.5">
                          {assignmentData.classTeacherHistory.map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-white/80 px-3 py-1.5 text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{h.name}</span>
                                {h.employeeId && (
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {h.employeeId}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-slate-400">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-slate-600 uppercase">
                                  {h.status}
                                </span>
                                <span>
                                  {new Date(h.startDate).toLocaleDateString()} -{" "}
                                  {h.endDate ? new Date(h.endDate).toLocaleDateString() : "Now"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Subject Teaching Allocations Section */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-emerald-700" />
                        <h4 className="text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                          Subject Teaching Allocations
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {assignmentData.subjectTeachers?.length || 0} of{" "}
                        {assignmentData.availableSubjects?.length || 0} subjects assigned
                      </span>
                    </div>

                    {assignmentData.availableSubjects?.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        No subjects configured for this class. Create subjects in Academic Setup
                        first.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Subject</th>
                              <th className="px-4 py-2.5">Assigned Faculty</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {assignmentData.availableSubjects.map((subject) => {
                              const activeAssignment = assignmentData.subjectTeachers?.find(
                                (st) => st.subjectId === subject.id
                              );
                              const selectedTeacher = subjectTeacherSelections[subject.id] || "";

                              return (
                                <tr
                                  key={subject.id}
                                  className="transition-colors hover:bg-slate-50/60"
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900">
                                        {subject.name}
                                      </span>
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                                        {subject.code}
                                      </span>
                                      {subject.isClassSpecific && (
                                        <span className="py-0.2 rounded-full bg-emerald-50 px-1.5 text-[9px] font-medium text-emerald-700">
                                          Class-specific
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {activeAssignment ? (
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-bold text-emerald-800">
                                          {activeAssignment.teacherName.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-slate-900">
                                            {activeAssignment.teacherName}
                                          </p>
                                          {activeAssignment.employeeId && (
                                            <p className="font-mono text-[10px] text-slate-400">
                                              {activeAssignment.employeeId}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <select
                                        value={selectedTeacher}
                                        onChange={(e) =>
                                          setSubjectTeacherSelections((prev) => ({
                                            ...prev,
                                            [subject.id]: e.target.value,
                                          }))
                                        }
                                        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                                      >
                                        <option value="">Select teacher to allocate...</option>
                                        {assignmentData.availableTeachers?.map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.name} ({t.employeeId || "No ID"})
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {activeAssignment ? (
                                      <button
                                        type="button"
                                        disabled={assignmentLoading}
                                        onClick={() =>
                                          handleRemoveSubjectTeacher(activeAssignment.id)
                                        }
                                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                      >
                                        Remove
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={assignmentLoading || !selectedTeacher}
                                        onClick={() =>
                                          handleSaveSubjectTeacher(subject.id, selectedTeacher)
                                        }
                                        className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                                      >
                                        Assign
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex shrink-0 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setAssigningSection(null);
                  setAssignmentData(null);
                  setAssignmentError(null);
                  setAssignmentSuccess(null);
                  setWorkloadWarning(null);
                }}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
