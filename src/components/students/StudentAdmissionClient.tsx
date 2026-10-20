"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, AlertCircle, CheckCircle2, ArrowRight, Plus, Trash2 } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
  capacity: number | null;
  _count?: {
    enrollments: number;
  };
}

interface GuardianFormItem {
  name: string;
  phone: string;
  email: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  occupation: string;
  address: string;
  isPrimary: boolean;
}

interface Props {
  schoolSlug: string;
  currentYear: {
    id: string;
    name: string;
  } | null;
  classes: ClassOption[];
  sections: SectionOption[];
  readinessError?: string | null;
}

export function StudentAdmissionClient({
  schoolSlug,
  currentYear,
  classes,
  sections,
  readinessError,
}: Props) {
  const router = useRouter();

  // Student Identity State
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [apaarId, setApaarId] = useState("");

  // Guardians State
  const [guardians, setGuardians] = useState<GuardianFormItem[]>([
    {
      name: "",
      phone: "",
      email: "",
      relationship: "FATHER",
      occupation: "",
      address: "",
      isPrimary: true,
    },
  ]);

  // Academic Allocation State
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(readinessError || null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dependent sections filtered by selected class
  const availableSections = classId ? sections.filter((s) => s.classId === classId) : [];

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    setSectionId("");
  };

  // Guardian List Manipulations
  const addGuardian = () => {
    setGuardians([
      ...guardians,
      {
        name: "",
        phone: "",
        email: "",
        relationship: "MOTHER",
        occupation: "",
        address: "",
        isPrimary: false,
      },
    ]);
  };

  const removeGuardian = (index: number) => {
    if (guardians.length <= 1) return;
    const updated = guardians.filter((_, idx) => idx !== index);
    if (!updated.some((g) => g.isPrimary) && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setGuardians(updated);
  };

  const updateGuardian = (
    index: number,
    field: keyof GuardianFormItem,
    value: string | boolean
  ) => {
    const updated = [...guardians];
    if (field === "isPrimary" && value === true) {
      updated.forEach((g, idx) => {
        g.isPrimary = idx === index;
      });
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setGuardians(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!name.trim()) {
      setError("Student full name is required");
      return;
    }
    if (!admissionNumber.trim()) {
      setError("Admission number is required");
      return;
    }
    if (!dob) {
      setError("Date of birth is required");
      return;
    }
    if (!currentYear) {
      setError(
        "A current academic year is required before admitting students. Please configure an active academic session."
      );
      return;
    }
    if (!classId) {
      setError("Please select a grade/class for admission");
      return;
    }
    if (!sectionId) {
      setError("Please select an allocated section for admission");
      return;
    }

    // Guardian validation
    for (let i = 0; i < guardians.length; i++) {
      const g = guardians[i];
      if (!g.name.trim()) {
        setError(`Guardian ${i + 1}: Name is required`);
        return;
      }
      if (!g.phone.trim()) {
        setError(`Guardian ${i + 1}: Phone number is required`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        student: {
          name: name.trim(),
          admissionNumber: admissionNumber.trim().toUpperCase(),
          dob: new Date(dob).toISOString(),
          gender,
          apaarId: apaarId.trim() || undefined,
        },
        guardians: guardians.map((g) => ({
          name: g.name.trim(),
          phone: g.phone.trim(),
          email: g.email.trim() || undefined,
          relationship: g.relationship,
          occupation: g.occupation.trim() || undefined,
          address: g.address.trim() || undefined,
          isPrimary: g.isPrimary,
        })),
        enrollment: {
          sectionId,
          academicYearId: currentYear.id,
          rollNumber: rollNumber.trim() || undefined,
        },
      };

      const res = await fetch(`/api/v1/school/${schoolSlug}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to admit student");
      }

      setSuccess(`Student ${name} successfully admitted!`);

      // Redirect back to directory after short delay
      setTimeout(() => {
        router.push(`/school/${schoolSlug}/students`);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prerequisite Alert if No Current Academic Year */}
      {!currentYear && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Setup Prerequisite Required: Academic Session
                </h3>
                <p className="mt-0.5 text-xs text-amber-800">
                  An active academic year is required before students can be admitted and enrolled.
                </p>
              </div>
            </div>
            <Link
              href={`/school/${schoolSlug}/academics/sessions`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-700"
            >
              <span>Configure Sessions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Error & Success Messages */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Admission Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold">Admission Successful</p>
            <p className="mt-0.5">{success} Redirecting to student roster...</p>
          </div>
        </div>
      )}

      {/* 1. Student Identity Information */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-800">
            1
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Student Profile Identifiers</h3>
            <p className="text-xs text-slate-400">
              Official legal name, birth record, APAAR registry, and unique school admission number.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          {/* Admission Number */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Admission Number / SR No. <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ADM-2026-001"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 uppercase placeholder-slate-400 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Unique student identifier within this school tenant.
            </p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Date of Birth <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Gender <span className="text-rose-500">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="MALE">Male (Boy)</option>
              <option value="FEMALE">Female (Girl)</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* APAAR ID */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-700">
              APAAR ID / National Student Registry ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 12-digit Automated Permanent Academic Account Registry ID"
              value={apaarId}
              onChange={(e) => setApaarId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 2. Guardian Information */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-800">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Guardian & Parent Directory</h3>
              <p className="text-xs text-slate-400">
                Primary and secondary parent contacts for attendance, communications, and
                emergencies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addGuardian}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Guardian</span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {guardians.map((guardian, index) => (
            <div
              key={index}
              className="relative space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    Guardian {index + 1}
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="primaryGuardian"
                      checked={guardian.isPrimary}
                      onChange={() => updateGuardian(index, "isPrimary", true)}
                      className="cursor-pointer text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Primary Contact</span>
                  </label>
                </div>

                {guardians.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGuardian(index)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg p-1 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Guardian Name */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={guardian.name}
                    onChange={(e) => updateGuardian(index, "name", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={guardian.phone}
                    onChange={(e) => updateGuardian(index, "phone", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={guardian.relationship}
                    onChange={(e) =>
                      updateGuardian(
                        index,
                        "relationship",
                        e.target.value as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER"
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Guardian</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. parent@example.com"
                    value={guardian.email}
                    onChange={(e) => updateGuardian(index, "email", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                {/* Occupation */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Occupation (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Business / Service"
                    value={guardian.occupation}
                    onChange={(e) => updateGuardian(index, "occupation", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Residential Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Civil Lines, Jaipur"
                    value={guardian.address}
                    onChange={(e) => updateGuardian(index, "address", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Academic Allocation & Enrollment */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-800">
            3
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Academic Roster Allocation</h3>
            <p className="text-xs text-slate-400">
              Assign the admitted student to a grade level and section division for the active
              session.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Active Session */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Active Academic Session
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <span>{currentYear ? currentYear.name : "None configured"}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Automatic enrollment into active calendar.
            </p>
          </div>

          {/* Class Selection */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Grade Level / Class <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">Select a Class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Section / Division <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={!classId}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50"
            >
              <option value="">{classId ? "Select a Section..." : "Select Class First"}</option>
              {availableSections.map((s) => {
                const enrolled = s._count?.enrollments || 0;
                const capacityLabel =
                  s.capacity !== null ? `(${enrolled}/${s.capacity} seats)` : "(Open)";
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} {capacityLabel}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Roll Number */}
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Class Roll Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 101 or 01"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Submission Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        <Link
          href={`/school/${schoolSlug}/students`}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !currentYear}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02] hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Saving Admission...</span>
            </div>
          ) : (
            <span>Complete Student Admission &rarr;</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default StudentAdmissionClient;
