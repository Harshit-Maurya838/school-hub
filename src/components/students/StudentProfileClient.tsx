"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Layers,
  Edit2,
  Plus,
  UserPlus,
  RotateCcw,
  Archive,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";

export interface StudentDetail {
  id: string;
  name: string;
  admissionNumber: string;
  dob: string | Date;
  gender: string;
  apaarId?: string | null;
  isActive: boolean;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  guardians: Array<{
    id: string;
    relationship: string;
    isPrimary: boolean;
    guardian: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
      occupation?: string | null;
      address?: string | null;
    };
  }>;
  enrollments: Array<{
    id: string;
    rollNumber?: string | null;
    status: string;
    createdAt: string | Date;
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
      startDate: string | Date;
      endDate: string | Date;
    };
  }>;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
  capacity: number | null;
}

interface AcademicYearOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface Props {
  schoolSlug: string;
  initialStudent: StudentDetail;
  availableClasses: ClassOption[];
  availableSections: SectionOption[];
  availableYears: AcademicYearOption[];
}

export function StudentProfileClient({
  schoolSlug,
  initialStudent,
  availableClasses,
  availableSections,
  availableYears,
}: Props) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail>(initialStudent);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAddGuardianOpen, setIsAddGuardianOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(student.name);
  const [editAdmissionNumber, setEditAdmissionNumber] = useState(student.admissionNumber);
  const [editDob, setEditDob] = useState(
    typeof student.dob === "string"
      ? student.dob.substring(0, 10)
      : new Date(student.dob).toISOString().substring(0, 10)
  );
  const [editGender, setEditGender] = useState<string>(student.gender);
  const [editApaarId, setEditApaarId] = useState(student.apaarId || "");
  const [editIsActive, setEditIsActive] = useState(student.isActive);

  // New Enrollment form state
  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollSectionId, setEnrollSectionId] = useState("");
  const [enrollYearId, setEnrollYearId] = useState(
    availableYears.find((y) => y.isCurrent)?.id || ""
  );
  const [enrollRollNumber, setEnrollRollNumber] = useState("");

  // Add Guardian form state
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState<string>("FATHER");
  const [guardianOccupation, setGuardianOccupation] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [guardianIsPrimary, setGuardianIsPrimary] = useState(false);

  // Feedback & Loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const isArchived = Boolean(student.deletedAt);

  // Dependent sections for enrollment modal
  const dependentEnrollSections = enrollClassId
    ? availableSections.filter((s) => s.classId === enrollClassId)
    : [];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          admissionNumber: editAdmissionNumber.trim().toUpperCase(),
          dob: new Date(editDob).toISOString(),
          gender: editGender,
          apaarId: editApaarId.trim() || undefined,
          isActive: editIsActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update student profile");
      }

      setStudent(json.data.student);
      setSuccess("Profile details updated successfully");
      setIsEditOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error updating student";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: archiveReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to archive student");
      }

      setIsArchiveModalOpen(false);
      setStudent(json.data.student);
      setSuccess("Student archived successfully");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error archiving student";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}/restore`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to restore student");
      }

      setStudent(json.data.student);
      setSuccess("Student restored successfully");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error restoring student";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollClassId || !enrollSectionId || !enrollYearId) {
      setError("Please select academic session, class, and section");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: enrollClassId,
          sectionId: enrollSectionId,
          academicYearId: enrollYearId,
          rollNumber: enrollRollNumber.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to enroll student");
      }

      // Re-fetch student to get updated enrollment list
      const updatedRes = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}`);
      const updatedJson = await updatedRes.json();
      if (updatedJson.data?.student) {
        setStudent(updatedJson.data.student);
      }

      setSuccess("Student enrolled successfully into new session");
      setIsEnrollModalOpen(false);
      setEnrollClassId("");
      setEnrollSectionId("");
      setEnrollRollNumber("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error enrolling student";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) {
      setError("Guardian name and phone are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guardianName.trim(),
          phone: guardianPhone.trim(),
          email: guardianEmail.trim() || undefined,
          relationship: guardianRelationship,
          occupation: guardianOccupation.trim() || undefined,
          address: guardianAddress.trim() || undefined,
          isPrimary: guardianIsPrimary,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to link guardian");
      }

      // Re-fetch student
      const updatedRes = await fetch(`/api/v1/school/${schoolSlug}/students/${student.id}`);
      const updatedJson = await updatedRes.json();
      if (updatedJson.data?.student) {
        setStudent(updatedJson.data.student);
      }

      setSuccess("Guardian linked successfully");
      setIsAddGuardianOpen(false);
      setGuardianName("");
      setGuardianPhone("");
      setGuardianEmail("");
      setGuardianOccupation("");
      setGuardianAddress("");
      setGuardianIsPrimary(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error linking guardian";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const initials = student.name
    ? student.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

  return (
    <div className="space-y-6">
      {/* Back Link & Notifications */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/school/${schoolSlug}/students`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Student Directory</span>
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold">Success</p>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Hero Profile Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 font-sans text-xl font-extrabold text-white shadow-md shadow-emerald-700/20">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {student.name}
                </h1>
                <Badge variant={student.gender === "MALE" ? "boy" : "girl"} size="sm">
                  {student.gender === "MALE" ? "Boy" : "Girl"}
                </Badge>
                {isArchived ? (
                  <Badge variant="alert" size="sm">
                    Archived
                  </Badge>
                ) : student.isActive ? (
                  <Badge variant="emerald" size="sm">
                    Active Roster
                  </Badge>
                ) : (
                  <Badge variant="default" size="sm">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-800">
                  SR #{student.admissionNumber}
                </span>
                {student.apaarId && (
                  <span className="font-mono text-slate-600">APAAR: {student.apaarId}</span>
                )}
                <span>
                  Admitted:{" "}
                  {new Date(student.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Enroll in Session</span>
            </button>

            {isArchived ? (
              <button
                onClick={handleRestore}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-700" />
                <span>Restore Student</span>
              </button>
            ) : (
              <button
                onClick={() => setIsArchiveModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Personal Information & Guardians */}
        <div className="space-y-6 lg:col-span-1">
          {/* Personal Details */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              Personal Profile
            </h3>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Date of Birth</dt>
                <dd className="font-bold text-slate-800">
                  {new Date(student.dob).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Gender</dt>
                <dd className="font-bold text-slate-800">{student.gender}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Admission Number</dt>
                <dd className="rounded bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-800">
                  {student.admissionNumber}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">APAAR ID</dt>
                <dd className="font-mono font-medium text-slate-800">
                  {student.apaarId || "Not registered"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Status</dt>
                <dd className="font-bold text-slate-800">
                  {isArchived ? "Archived" : student.isActive ? "Active" : "Inactive"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Guardians Section */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Guardians ({student.guardians.length})
              </h3>
              <button
                onClick={() => setIsAddGuardianOpen(true)}
                className="cursor-pointer text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                + Add Guardian
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {student.guardians.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400 italic">
                  No guardians linked.
                </p>
              ) : (
                student.guardians.map((link) => (
                  <div
                    key={link.id}
                    className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">
                        {link.guardian.name}
                        <span className="ml-1 text-[11px] font-semibold text-slate-500">
                          ({link.relationship})
                        </span>
                      </div>
                      {link.isPrimary && (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{link.guardian.phone}</span>
                      </div>
                      {link.guardian.email && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{link.guardian.email}</span>
                        </div>
                      )}
                      {link.guardian.occupation && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          <span>{link.guardian.occupation}</span>
                        </div>
                      )}
                      {link.guardian.address && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{link.guardian.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Academic Enrollment History */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enrollment & Session History</h3>
                <p className="text-xs text-slate-400">
                  Year-specific class allocations and historical enrollment allocations.
                </p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Allocate Session</span>
              </button>
            </div>

            <div className="mt-5 space-y-3.5">
              {student.enrollments.length === 0 ? (
                <div className="space-y-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <Layers className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">
                    No academic enrollments recorded for this student.
                  </p>
                  <button
                    onClick={() => setIsEnrollModalOpen(true)}
                    className="mt-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                  >
                    Enroll in Current Session
                  </button>
                </div>
              ) : (
                student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:border-emerald-300"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {enrollment.section.class.name} &mdash; Section {enrollment.section.name}
                        </span>
                        {enrollment.academicYear.isCurrent && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Active Session
                          </span>
                        )}
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {enrollment.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Session: {enrollment.academicYear.name}</span>
                        {enrollment.rollNumber && (
                          <span className="font-mono">&bull; Roll #: {enrollment.rollNumber}</span>
                        )}
                        <span>
                          &bull; Enrolled:{" "}
                          {new Date(enrollment.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Edit Student Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleUpdateProfile}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Student Details</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Admission Number
                </label>
                <input
                  type="text"
                  required
                  value={editAdmissionNumber}
                  onChange={(e) => setEditAdmissionNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-800 uppercase focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  APAAR ID (Optional)
                </label>
                <input
                  type="text"
                  value={editApaarId}
                  onChange={(e) => setEditApaarId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="activeToggle" className="text-xs font-bold text-slate-700">
                  Student is active and currently attending
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enroll in Session Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleEnroll}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Enroll in Academic Session</h3>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Academic Session
                </label>
                <select
                  required
                  value={enrollYearId}
                  onChange={(e) => setEnrollYearId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  <option value="">Select Session...</option>
                  {availableYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Grade Level / Class
                </label>
                <select
                  required
                  value={enrollClassId}
                  onChange={(e) => {
                    setEnrollClassId(e.target.value);
                    setEnrollSectionId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  <option value="">Select Class...</option>
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Section</label>
                <select
                  required
                  disabled={!enrollClassId}
                  value={enrollSectionId}
                  onChange={(e) => setEnrollSectionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50"
                >
                  <option value="">Select Section...</option>
                  {dependentEnrollSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.capacity !== null ? `(Capacity: ${s.capacity})` : "(Open)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Roll Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 05"
                  value={enrollRollNumber}
                  onChange={(e) => setEnrollRollNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? "Allocating..." : "Confirm Enrollment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Guardian Modal */}
      {isAddGuardianOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddGuardian}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Link New Guardian</h3>
              <button
                type="button"
                onClick={() => setIsAddGuardianOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Guardian Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunita Sharma"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Relationship *
                </label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Occupation (Optional)
                </label>
                <input
                  type="text"
                  value={guardianOccupation}
                  onChange={(e) => setGuardianOccupation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryGuardianToggle"
                  checked={guardianIsPrimary}
                  onChange={(e) => setGuardianIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="primaryGuardianToggle" className="text-xs font-bold text-slate-700">
                  Set as primary contact for student
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddGuardianOpen(false)}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? "Linking..." : "Link Guardian"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Archive Student Record</h3>
            <p className="text-xs leading-relaxed text-slate-600">
              Are you sure you want to archive{" "}
              <strong className="text-slate-900">{student.name}</strong> (Admission #{" "}
              {student.admissionNumber})?
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Safety Guarantee:</span> Historical
              enrollment records and guardian associations remain safe in the database and will NOT
              be deleted.
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Reason for Archival (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Student transferred to another school..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleArchive}
                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Archiving..." : "Confirm Archival"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfileClient;
