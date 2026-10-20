"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
          admissionNumber: editAdmissionNumber.trim(),
          dob: editDob,
          gender: editGender,
          apaarId: editApaarId.trim() || null,
          isActive: editIsActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update profile");
      }

      setStudent(json.data.student);
      setSuccess("Student profile updated successfully");
      setIsEditOpen(false);
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

      setStudent(json.data.student);
      setIsArchiveModalOpen(false);
      setSuccess("Student archived safely. Historical records preserved.");
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

      setSuccess("Guardian linked to student successfully");
      setIsAddGuardianOpen(false);
      setGuardianName("");
      setGuardianPhone("");
      setGuardianEmail("");
      setGuardianOccupation("");
      setGuardianAddress("");
      setGuardianIsPrimary(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error adding guardian";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback Alerts */}
      {error && (
        <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-xs text-red-300">
          <p className="font-semibold">Operation Notice</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-4 text-xs text-emerald-300">
          <p className="font-semibold">Success</p>
          <p className="mt-1">{success}</p>
        </div>
      )}

      {/* Header Profile Summary */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-xl font-bold text-indigo-400">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{student.name}</h1>
                {isArchived ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    Archived
                  </span>
                ) : student.isActive ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                    Inactive
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span className="font-mono text-zinc-300">
                  Admission #: {student.admissionNumber}
                </span>
                {student.apaarId && <span>&bull; APAAR: {student.apaarId}</span>}
                <span>&bull; Admitted: {new Date(student.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEditOpen(true)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              Edit Details
            </button>

            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              + Enroll in Session
            </button>

            {isArchived ? (
              <button
                onClick={handleRestore}
                disabled={loading}
                className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-900/60"
              >
                Restore Student
              </button>
            ) : (
              <button
                onClick={() => setIsArchiveModalOpen(true)}
                className="rounded-xl border border-zinc-800 px-3.5 py-2 text-xs text-zinc-400 transition hover:border-red-800/80 hover:bg-red-950/40 hover:text-red-300"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Personal Information & Guardians */}
        <div className="space-y-6 lg:col-span-1">
          {/* Personal Details */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <h2 className="border-b border-zinc-800 pb-2 text-sm font-bold text-white">
              Personal Information
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Date of Birth</dt>
                <dd className="font-medium text-white">
                  {new Date(student.dob).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Gender</dt>
                <dd className="font-medium text-white">{student.gender}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Admission Number</dt>
                <dd className="font-mono font-medium text-white">{student.admissionNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">APAAR ID</dt>
                <dd className="font-medium text-white">{student.apaarId || "Not registered"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Record Status</dt>
                <dd className="font-medium text-white">
                  {isArchived ? "Archived" : student.isActive ? "Active" : "Inactive"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Guardians Section */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h2 className="text-sm font-bold text-white">
                Guardians ({student.guardians.length})
              </h2>
              <button
                onClick={() => setIsAddGuardianOpen(true)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                + Add Guardian
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {student.guardians.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500 italic">
                  No guardians linked.
                </p>
              ) : (
                student.guardians.map((link) => (
                  <div
                    key={link.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">
                        {link.guardian.name}
                        <span className="ml-1 text-[11px] font-normal text-zinc-400">
                          ({link.relationship})
                        </span>
                      </div>
                      {link.isPrimary && (
                        <span className="rounded-md border border-indigo-500/30 bg-indigo-950/60 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-zinc-400">
                      <div>Phone: {link.guardian.phone}</div>
                      {link.guardian.email && <div>Email: {link.guardian.email}</div>}
                      {link.guardian.occupation && (
                        <div>Occupation: {link.guardian.occupation}</div>
                      )}
                      {link.guardian.address && <div>Address: {link.guardian.address}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Academic Enrollment Timeline & History */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Enrollment History</h2>
                <p className="text-xs text-zinc-400">
                  Year-specific class allocations and historical enrollment records.
                </p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
              >
                + Allocate New Session
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {student.enrollments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                  <p className="text-xs text-zinc-400">
                    No academic enrollments recorded for this student.
                  </p>
                  <button
                    onClick={() => setIsEnrollModalOpen(true)}
                    className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Enroll in Current Academic Year
                  </button>
                </div>
              ) : (
                student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {enrollment.section.class.name} &mdash; Section {enrollment.section.name}
                        </span>
                        {enrollment.academicYear.isCurrent && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Current Session
                          </span>
                        )}
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          {enrollment.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span>Session: {enrollment.academicYear.name}</span>
                        {enrollment.rollNumber && (
                          <span>&bull; Roll #: {enrollment.rollNumber}</span>
                        )}
                        <span>
                          &bull; Enrolled: {new Date(enrollment.createdAt).toLocaleDateString()}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleUpdateProfile}
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Edit Student Details</h3>
            <p className="text-xs text-zinc-400">
              Update administrative record fields for {student.name}.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Admission Number
                </label>
                <input
                  type="text"
                  required
                  value={editAdmissionNumber}
                  onChange={(e) => setEditAdmissionNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 font-mono text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  APAAR ID (Optional)
                </label>
                <input
                  type="text"
                  value={editApaarId}
                  onChange={(e) => setEditApaarId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="activeToggle" className="text-xs font-medium text-zinc-300">
                  Student is active and currently attending
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enroll in Session Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleEnroll}
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Enroll in Academic Session</h3>
            <p className="text-xs text-zinc-400">Allocate {student.name} to a class and section.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Academic Session
                </label>
                <select
                  required
                  value={enrollYearId}
                  onChange={(e) => setEnrollYearId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
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
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Grade Level / Class
                </label>
                <select
                  required
                  value={enrollClassId}
                  onChange={(e) => {
                    setEnrollClassId(e.target.value);
                    setEnrollSectionId("");
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
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
                <label className="mb-1 block text-xs font-semibold text-zinc-300">Section</label>
                <select
                  required
                  disabled={!enrollClassId}
                  value={enrollSectionId}
                  onChange={(e) => setEnrollSectionId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white disabled:opacity-50"
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
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Roll Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 05"
                  value={enrollRollNumber}
                  onChange={(e) => setEnrollRollNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 font-mono text-xs text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "Allocating..." : "Confirm Enrollment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Guardian Modal */}
      {isAddGuardianOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddGuardian}
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Link New Guardian</h3>
            <p className="text-xs text-zinc-400">
              Add parent or guardian details for {student.name}.
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Guardian Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunita Sharma"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Relationship *
                </label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">
                  Occupation (Optional)
                </label>
                <input
                  type="text"
                  value={guardianOccupation}
                  onChange={(e) => setGuardianOccupation(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryGuardianToggle"
                  checked={guardianIsPrimary}
                  onChange={(e) => setGuardianIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="primaryGuardianToggle"
                  className="text-xs font-medium text-zinc-300"
                >
                  Set as primary contact for student
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddGuardianOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "Linking..." : "Link Guardian"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Archive Student Record</h3>
            <p className="mt-2 text-xs text-zinc-400">
              Are you sure you want to archive{" "}
              <strong className="text-white">{student.name}</strong> (Admission #{" "}
              {student.admissionNumber})?
            </p>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">Safety Guarantee:</span> All historical
              enrollment records, section allocations, and guardian associations remain safe in the
              database and will NOT be deleted.
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Reason for Archival (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Student transferred to another school..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleArchive}
                className="inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
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
