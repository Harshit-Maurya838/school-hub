"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  BookOpen,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
  ArrowLeft,
  Pencil,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import { EmploymentStatus } from "@/generated/prisma/enums";
import { TeacherDetail, UpdateTeacherProfileInput } from "@/lib/teachers";
import { Modal } from "@/components/common/Modal";

interface Props {
  schoolSlug: string;
  initialTeacher: TeacherDetail;
  userRole?: string;
  canEdit?: boolean;
}

export function TeacherProfileClient({
  schoolSlug,
  initialTeacher,
  canEdit = true,
}: Props) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherDetail>(initialTeacher);
  const [activeTab, setActiveTab] = useState<"assignments" | "history" | "details">("assignments");

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(teacher.employeeId || "");
  const [qualification, setQualification] = useState(teacher.qualification || "");
  const [specialization, setSpecialization] = useState(teacher.specialization || "");
  const [designation, setDesignation] = useState(teacher.designation || "");
  const [department, setDepartment] = useState(teacher.department || "");
  const [phone, setPhone] = useState(teacher.phone || "");
  const [status, setStatus] = useState(teacher.status);
  const [joiningDate, setJoiningDate] = useState(
    teacher.joiningDate ? teacher.joiningDate.split("T")[0] : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentYear = teacher.currentAssignments.academicYear;
  const classAssignment = teacher.currentAssignments.classTeacherAssignment;
  const subjectAssignments = teacher.currentAssignments.subjectAssignments;

  const uniqueSections = new Set([
    ...(classAssignment ? [classAssignment.sectionId] : []),
    ...subjectAssignments.map((a) => a.sectionId),
  ]);
  const sectionsCount = uniqueSections.size;
  const isHighWorkload = sectionsCount > 6;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: UpdateTeacherProfileInput = {
        employeeId: employeeId.trim() || null,
        qualification: qualification.trim() || null,
        specialization: specialization.trim() || null,
        designation: designation.trim() || null,
        department: department.trim() || null,
        phone: phone.trim() || null,
        status: status,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
      };

      const res = await fetch(`/api/v1/school/${schoolSlug}/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update teacher profile");
      }

      setTeacher((prev) => ({
        ...prev,
        employeeId: payload.employeeId || null,
        qualification: payload.qualification || null,
        specialization: payload.specialization || null,
        designation: payload.designation || null,
        department: payload.department || null,
        phone: payload.phone || null,
        status: payload.status || prev.status,
        joiningDate: payload.joiningDate ? (payload.joiningDate as Date).toISOString() : null,
      }));

      setSuccess("Teacher profile updated successfully!");
      setIsEditOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/school/${schoolSlug}/staff`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Staff Directory</span>
        </Link>

        {canEdit && (
          <button
            onClick={() => {
              setError(null);
              setIsEditOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-300 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
            <span>Edit Profile Details</span>
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Hero Faculty Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-black text-white shadow-md shadow-blue-500/20">
              {teacher.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {teacher.name}
                </h1>
                {teacher.employeeId && (
                  <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                    {teacher.employeeId}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    teacher.status === "ACTIVE"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      teacher.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span>{teacher.status}</span>
                </span>
              </div>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                {teacher.designation || "Faculty Member"} •{" "}
                <span className="text-slate-700">{teacher.department || "General Academics"}</span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {teacher.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{teacher.email}</span>
                  </div>
                )}
                {teacher.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{teacher.phone}</span>
                  </div>
                )}
                {teacher.joiningDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Joined {new Date(teacher.joiningDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Workload Gauge */}
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Teaching Workload</span>
              <span
                className={`font-black ${
                  isHighWorkload ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {sectionsCount} {sectionsCount === 1 ? "Section" : "Sections"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${
                  isHighWorkload ? "bg-amber-500" : "bg-emerald-600"
                }`}
                style={{ width: `${Math.min(100, (sectionsCount / 8) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{teacher.currentAssignments.subjectAssignments.length} Subjects Taught</span>
              <span>{classAssignment ? "Class Teacher" : "Subject Faculty"}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab("assignments")}
            className={`border-b-2 px-5 py-3 text-xs font-extrabold transition-colors ${
              activeTab === "assignments"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Current Assignments ({currentYear?.name || "Active Session"})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-5 py-3 text-xs font-extrabold transition-colors ${
              activeTab === "history"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Assignment History ({teacher.assignmentHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`border-b-2 px-5 py-3 text-xs font-extrabold transition-colors ${
              activeTab === "details"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Employment & Qualifications
          </button>
        </div>
      </div>

      {/* Tab 1: Current Assignments */}
      {activeTab === "assignments" && (
        <div className="space-y-6">
          {/* Class Teacher Responsibility Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Class Teacher Responsibility
                  </h3>
                  <p className="text-xs text-slate-400">
                    Primary section cohort stewardship for {currentYear?.name || "current session"}
                  </p>
                </div>
              </div>
              {classAssignment && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  Active Class Teacher
                </span>
              )}
            </div>

            <div className="p-6">
              {classAssignment ? (
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-emerald-800">Assigned Cohort:</p>
                    <p className="text-lg font-black text-slate-900">
                      {classAssignment.className} — Section {classAssignment.sectionName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Effective since {new Date(classAssignment.startDate).toLocaleDateString()}
                    </p>
                  </div>

                  <Link
                    href={`/school/${schoolSlug}/students`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                  >
                    <span>View Section Class Roster</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <UserCheck className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    No Class Teacher Responsibility Assigned
                  </p>
                  <p className="text-xs text-slate-400">
                    This faculty member is currently serving exclusively as a Subject Teacher.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subjects Taught Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Curriculum Subjects Taught ({subjectAssignments.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Courses and section classroom allocations for this session
                  </p>
                </div>
              </div>
            </div>

            {subjectAssignments.length === 0 ? (
              <div className="p-10 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  No Subject Teaching Assignments
                </p>
                <p className="text-xs text-slate-400">
                  Assign subjects to this teacher via Class & Section setup.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3.5">Subject</th>
                      <th className="px-6 py-3.5">Grade Class</th>
                      <th className="px-6 py-3.5">Section</th>
                      <th className="px-6 py-3.5 text-center">Periods / Week</th>
                      <th className="px-6 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {subjectAssignments.map((sa) => (
                      <tr key={sa.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="font-bold text-slate-900">{sa.subjectName}</p>
                            {sa.subjectCode && (
                              <p className="font-mono text-[11px] text-slate-400">
                                {sa.subjectCode}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">{sa.className}</td>
                        <td className="px-6 py-3.5">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                            Section {sa.sectionName}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono text-slate-600">
                          {sa.periodsPerWeek ? `${sa.periodsPerWeek} hrs` : "—"}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Assignment History */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {teacher.assignmentHistory.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-xs">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                No Historical Records on File
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Prior academic years or superseded teaching assignments will be preserved here.
              </p>
            </div>
          ) : (
            teacher.assignmentHistory.map((group) => (
              <div
                key={group.academicYear.id}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Academic Year: {group.academicYear.name}
                    </h3>
                    <p className="text-xs text-slate-400">Archived academic allocations</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {group.classTeacherAssignments.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        Class Teacher Records:
                      </p>
                      <div className="mt-2 space-y-2">
                        {group.classTeacherAssignments.map((ca) => (
                          <div
                            key={ca.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">
                                {ca.className} — Section {ca.sectionName}
                              </span>
                              <span className="ml-2 font-mono text-[11px] text-slate-500">
                                ({new Date(ca.startDate).toLocaleDateString()} –{" "}
                                {ca.endDate
                                  ? new Date(ca.endDate).toLocaleDateString()
                                  : "Completed"}
                                )
                              </span>
                            </div>
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {ca.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {group.subjectAssignments.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        Subject Teaching Records:
                      </p>
                      <div className="mt-2 space-y-2">
                        {group.subjectAssignments.map((sa) => (
                          <div
                            key={sa.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{sa.subjectName}</span>
                              <span className="ml-2 text-slate-600">
                                ({sa.className} - {sa.sectionName})
                              </span>
                              <span className="ml-2 font-mono text-[11px] text-slate-400">
                                ({new Date(sa.startDate).toLocaleDateString()} –{" "}
                                {sa.endDate
                                  ? new Date(sa.endDate).toLocaleDateString()
                                  : "Completed"}
                                )
                              </span>
                            </div>
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {sa.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Employment Details */}
      {activeTab === "details" && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xs sm:p-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">Qualifications</p>
              <p className="text-sm font-bold text-slate-900">
                {teacher.qualification || "Not specified"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">Specialization</p>
              <p className="text-sm font-bold text-slate-900">
                {teacher.specialization || "General Curriculum"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">Department</p>
              <p className="text-sm font-bold text-slate-900">
                {teacher.department || "General Academics"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">Designation</p>
              <p className="text-sm font-bold text-slate-900">
                {teacher.designation || "Instructor"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">Employment Status</p>
              <p className="text-sm font-bold text-slate-900">{teacher.status}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">Joining Date</p>
              <p className="text-sm font-bold text-slate-900">
                {teacher.joiningDate
                  ? new Date(teacher.joiningDate).toLocaleDateString()
                  : "Not on file"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Faculty Profile Details"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">Staff / Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. TCH-001"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Phone Contact</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Secondary Teacher"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Mathematics & Science"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Qualifications</label>
            <input
              type="text"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. M.Sc. Mathematics, B.Ed."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Specialization</label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Pure Mathematics & Calculus"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">Employment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EmploymentStatus)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="TERMINATED">TERMINATED</option>
                <option value="RESIGNED">RESIGNED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
