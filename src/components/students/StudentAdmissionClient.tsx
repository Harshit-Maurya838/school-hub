"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    // If we removed the primary, make the first one primary
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
      // Unset all other primaries
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

    // Frontend validation
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
      setError("Please select a class for academic enrollment");
      return;
    }
    if (!sectionId) {
      setError("Please select a section for class allocation");
      return;
    }

    // Validate guardians
    const validGuardians = guardians.filter((g) => g.name.trim() || g.phone.trim());
    for (const g of validGuardians) {
      if (!g.name.trim()) {
        setError("Guardian name is required");
        return;
      }
      if (!g.phone.trim() || g.phone.trim().length < 7) {
        setError(`Valid phone number (min 7 digits) required for guardian: ${g.name}`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        admissionNumber: admissionNumber.trim(),
        dob,
        gender,
        apaarId: apaarId.trim() || undefined,
        guardians: validGuardians.map((g) => ({
          name: g.name.trim(),
          phone: g.phone.trim(),
          email: g.email.trim() || undefined,
          relationship: g.relationship,
          occupation: g.occupation.trim() || undefined,
          address: g.address.trim() || undefined,
          isPrimary: g.isPrimary,
        })),
        enrollment: {
          classId,
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

      setSuccess(`Student '${name}' admitted and enrolled successfully!`);
      const studentId = json.data?.student?.id;

      setTimeout(() => {
        if (studentId) {
          router.push(`/school/${schoolSlug}/students/${studentId}`);
        } else {
          router.push(`/school/${schoolSlug}/students`);
        }
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error admitting student";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Prerequisite Alert if No Current Academic Year */}
      {!currentYear && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                Setup Prerequisite Required: Academic Session
              </h3>
              <p className="mt-1 text-xs text-zinc-300">
                An active academic year is required before students can be admitted and enrolled.
              </p>
            </div>
            <Link
              href={`/school/${schoolSlug}/academics/sessions`}
              className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Configure Sessions &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Error & Success Messages */}
      {error && (
        <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-xs text-red-300">
          <p className="font-semibold">Admission Failed</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-4 text-xs text-emerald-300">
          <p className="font-semibold">Admission Successful</p>
          <p className="mt-1">{success}</p>
        </div>
      )}

      {/* 1. Student Identity Information */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-white">1. Student Information</h2>
          <p className="text-xs text-zinc-400">
            Official profile identifiers and permanent administrative records.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Full Legal Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Admission Number */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Admission Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ADM-2026-001"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Unique student identifier within this school tenant.
            </p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Date of Birth <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Gender <span className="text-red-400">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* APAAR ID */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              APAAR ID / National Student Registry ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 12-digit Automated Permanent Academic Account Registry ID"
              value={apaarId}
              onChange={(e) => setApaarId(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 2. Guardian Information */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">2. Guardian Information</h2>
            <p className="text-xs text-zinc-400">
              Parents and guardians responsible for the student. Multiple guardians are supported.
            </p>
          </div>
          <button
            type="button"
            onClick={addGuardian}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
          >
            + Add Another Guardian
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {guardians.map((guardian, index) => (
            <div
              key={index}
              className="relative rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-indigo-950/80 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                    Guardian {index + 1}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                    <input
                      type="radio"
                      name="primaryGuardian"
                      checked={guardian.isPrimary}
                      onChange={() => updateGuardian(index, "isPrimary", true)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Primary Contact
                  </label>
                </div>

                {guardians.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGuardian(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Guardian Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={guardian.name}
                    onChange={(e) => updateGuardian(index, "name", e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={guardian.phone}
                    onChange={(e) => updateGuardian(index, "phone", e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Relationship <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={guardian.relationship}
                    onChange={(e) => updateGuardian(index, "relationship", e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Guardian</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. parent@example.com"
                    value={guardian.email}
                    onChange={(e) => updateGuardian(index, "email", e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Occupation */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Occupation (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={guardian.occupation}
                    onChange={(e) => updateGuardian(index, "occupation", e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Residential Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Civil Lines, New Delhi"
                    value={guardian.address}
                    onChange={(e) => updateGuardian(index, "address", e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Academic Allocation & Enrollment */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-white">3. Academic Enrollment Allocation</h2>
          <p className="text-xs text-zinc-400">
            Allocate the admitted student to a grade level and section for the current academic
            session.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Academic Session */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Academic Session
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{currentYear ? currentYear.name : "None configured"}</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Automatic enrollment into active session.
            </p>
          </div>

          {/* Class Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Grade Level / Class <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Section / Division <span className="text-red-400">*</span>
            </label>
            <select
              required
              disabled={!classId}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">{classId ? "Select a Section..." : "Select a Class First"}</option>
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
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Roll Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 101 or 01"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Submission Actions */}
      <div className="flex items-center justify-end gap-4 border-t border-zinc-800 pt-6">
        <Link
          href={`/school/${schoolSlug}/students`}
          className="rounded-xl border border-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !currentYear}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Saving Admission...</span>
            </div>
          ) : (
            "Complete Student Admission &rarr;"
          )}
        </button>
      </div>
    </form>
  );
}
