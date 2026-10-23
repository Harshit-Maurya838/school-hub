"use client";

import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  Upload,
  Download,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";

interface AddStaffModalProps {
  schoolSlug: string;
  onSuccess?: () => void;
}

interface BulkRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "TEACHER" | "ACCOUNTANT" | "SCHOOL_ADMIN";
  employeeId: string;
  designation: string;
  department: string;
  qualification: string;
  specialization: string;
  joiningDate: string;
}

export function AddStaffModal({ schoolSlug, onSuccess }: AddStaffModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"TEACHER" | "ACCOUNTANT" | "SCHOOL_ADMIN">("TEACHER");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [sendInviteSingle, setSendInviteSingle] = useState(false);

  // Bulk Form State
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    {
      id: "row-1",
      name: "",
      email: "",
      phone: "",
      role: "TEACHER",
      employeeId: "",
      designation: "",
      department: "",
      qualification: "",
      specialization: "",
      joiningDate: "",
    },
  ]);
  const [sendInvitesBulk, setSendInvitesBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    title: string;
    message: string;
    links?: Array<{ name: string; email: string; link: string }>;
  } | null>(null);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("TEACHER");
    setEmployeeId("");
    setDesignation("");
    setDepartment("");
    setQualification("");
    setSpecialization("");
    setJoiningDate("");
    setSendInviteSingle(false);
    setBulkRows([
      {
        id: `row-${Date.now()}`,
        name: "",
        email: "",
        phone: "",
        role: "TEACHER",
        employeeId: "",
        designation: "",
        department: "",
        qualification: "",
        specialization: "",
        joiningDate: "",
      },
    ]);
    setSendInvitesBulk(false);
    setErrorMessage(null);
    setSuccessInfo(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (successInfo) {
      router.refresh();
      if (onSuccess) onSuccess();
    }
  };

  // Copy activation link helper
  const handleCopyLink = (link: string, index: number) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkIndex(index);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  // Submit Single Staff Member
  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          role,
          employeeId: role === "TEACHER" && employeeId.trim() ? employeeId.trim() : null,
          designation: role === "TEACHER" && designation.trim() ? designation.trim() : null,
          department: role === "TEACHER" && department.trim() ? department.trim() : null,
          qualification: role === "TEACHER" && qualification.trim() ? qualification.trim() : null,
          specialization:
            role === "TEACHER" && specialization.trim() ? specialization.trim() : null,
          joiningDate: role === "TEACHER" && joiningDate ? joiningDate : null,
          sendInvite: sendInviteSingle,
        };

        const res = await fetch(`/api/v1/school/${schoolSlug}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data?.error?.message || "Failed to create staff member.");
          return;
        }

        const actionUrl = data.data.actionUrl;
        setSuccessInfo({
          title: "Staff Member Profile Created!",
          message: `${payload.name} (${payload.role}) has been successfully added to your staff directory.${
            sendInviteSingle
              ? " An activation invitation has been generated and emailed."
              : " You can invite them to activate their account whenever you are ready using the 'Invite' button."
          }`,
          links: actionUrl
            ? [{ name: payload.name, email: payload.email, link: actionUrl }]
            : undefined,
        });
      } catch {
        setErrorMessage("Network error while creating staff member.");
      }
    });
  };

  // Bulk row helpers
  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: "",
        email: "",
        phone: "",
        role: "TEACHER",
        employeeId: "",
        designation: "",
        department: "",
        qualification: "",
        specialization: "",
        joiningDate: "",
      },
    ]);
  };

  const handleRemoveBulkRow = (id: string) => {
    setBulkRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      return filtered.length === 0
        ? [
            {
              id: `row-${Date.now()}`,
              name: "",
              email: "",
              phone: "",
              role: "TEACHER",
              employeeId: "",
              designation: "",
              department: "",
              qualification: "",
              specialization: "",
              joiningDate: "",
            },
          ]
        : filtered;
    });
  };

  const handleUpdateBulkRow = (id: string, field: keyof BulkRow, value: string) => {
    setBulkRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // CSV template generator
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      "name,email,phone,role,employeeId,designation,department,qualification,specialization,joiningDate\n" +
      "Dr. Sarah Jenkins,sarah.jenkins@school.edu,+1234567890,TEACHER,EMP-101,Senior Physics Teacher,Science,Ph.D. Physics,Astrophysics,2024-08-15\n" +
      "Mark Taylor,mark.taylor@school.edu,,TEACHER,EMP-102,Instructor,Mathematics,M.Sc. Mathematics,Calculus,2024-09-01\n" +
      "Elena Gomez,elena.gomez@school.edu,+1987654321,ACCOUNTANT,,,,,,2024-07-01\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `staff_import_template_${schoolSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse uploaded CSV
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length <= 1) {
        setErrorMessage("The uploaded CSV file is empty or contains only headers.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows: BulkRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < 2) continue;

        const rowData: Record<string, string> = {};
        headers.forEach((header, idx) => {
          rowData[header] = values[idx] || "";
        });

        const rawRole = (rowData.role || "").toUpperCase();
        const role =
          rawRole === "ACCOUNTANT"
            ? "ACCOUNTANT"
            : rawRole === "SCHOOL_ADMIN"
              ? "SCHOOL_ADMIN"
              : "TEACHER";

        rows.push({
          id: `csv-${i}-${Date.now()}`,
          name: rowData.name || "",
          email: rowData.email || "",
          phone: rowData.phone || "",
          role,
          employeeId: rowData.employeeid || "",
          designation: rowData.designation || "",
          department: rowData.department || "",
          qualification: rowData.qualification || "",
          specialization: rowData.specialization || "",
          joiningDate: rowData.joiningdate || "",
        });
      }

      if (rows.length > 0) {
        setBulkRows(rows);
        setErrorMessage(null);
      } else {
        setErrorMessage("No valid data rows found in the uploaded CSV.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit Bulk Addition
  const handleSubmitBulk = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validRows = bulkRows.filter((r) => r.name.trim() && r.email.trim());
    if (validRows.length === 0) {
      setErrorMessage("Please fill in at least one staff member with a valid name and email.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          members: validRows.map((r) => ({
            name: r.name.trim(),
            email: r.email.trim().toLowerCase(),
            phone: r.phone.trim() || null,
            role: r.role,
            employeeId: r.role === "TEACHER" && r.employeeId.trim() ? r.employeeId.trim() : null,
            designation: r.role === "TEACHER" && r.designation.trim() ? r.designation.trim() : null,
            department: r.role === "TEACHER" && r.department.trim() ? r.department.trim() : null,
            qualification:
              r.role === "TEACHER" && r.qualification.trim() ? r.qualification.trim() : null,
            specialization:
              r.role === "TEACHER" && r.specialization.trim() ? r.specialization.trim() : null,
            joiningDate: r.role === "TEACHER" && r.joiningDate ? r.joiningDate : null,
          })),
          sendInvitesImmediately: sendInvitesBulk,
        };

        const res = await fetch(`/api/v1/school/${schoolSlug}/staff/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data?.error?.message || "Failed to process bulk staff creation.");
          return;
        }

        const result = data.data;
        const links: Array<{ name: string; email: string; link: string }> = [];

        if (Array.isArray(result.created)) {
          for (const item of result.created) {
            if (item.actionUrl) {
              links.push({
                name: item.user.name,
                email: item.user.email,
                link: item.actionUrl,
              });
            }
          }
        }

        let message = `Successfully imported ${result.totalCreated} of ${result.totalSubmitted} staff members.`;
        if (result.errors && result.errors.length > 0) {
          message += ` (${result.errors.length} rows had errors and were skipped).`;
        }
        if (!sendInvitesBulk) {
          message +=
            " You can now invite any individual staff member when needed from the roster table.";
        }

        setSuccessInfo({
          title: "Bulk Staff Import Completed!",
          message,
          links: links.length > 0 ? links : undefined,
        });
      } catch {
        setErrorMessage("Network error while processing bulk staff creation.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        <span>Add Staff</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-100 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Add Faculty & Staff Members
                </h3>
                <p className="text-xs text-slate-400">
                  Register new instructors, accountants, or administrators to your school directory
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success View */}
            {successInfo ? (
              <div className="space-y-4 overflow-y-auto p-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span>{successInfo.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-800">{successInfo.message}</p>
                </div>

                {successInfo.links && successInfo.links.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700">
                      Generated Activation Links ({successInfo.links.length}):
                    </h4>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                      {successInfo.links.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col justify-between gap-1 rounded-xl border border-slate-200/70 bg-white p-2.5 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">
                              {item.name}{" "}
                              <span className="font-mono font-normal text-slate-400">
                                ({item.email})
                              </span>
                            </p>
                            <p className="truncate font-mono text-[11px] text-slate-500">
                              {item.link}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.link, idx)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
                          >
                            {copiedLinkIndex === idx ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessInfo(null);
                      setErrorMessage(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Add More Staff
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    Done & View Roster
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Segmented Mode Selector */}
                <div className="flex shrink-0 border-b border-slate-100 bg-slate-50/80 px-6 pt-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("single")}
                      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                        mode === "single"
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Single Staff Member</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("bulk")}
                      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                        mode === "bulk"
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Bulk Addition / CSV Import</span>
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Single Form Mode */}
                {mode === "single" && (
                  <form
                    onSubmit={handleSubmitSingle}
                    className="flex flex-1 flex-col overflow-hidden"
                  >
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="staffName"
                            className="block text-xs font-bold text-slate-700"
                          >
                            Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="staffName"
                            type="text"
                            required
                            disabled={isPending}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Dr. Eleanor Vance"
                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="staffEmail"
                            className="block text-xs font-bold text-slate-700"
                          >
                            Email Address <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="staffEmail"
                            type="email"
                            required
                            disabled={isPending}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. eleanor.vance@school.edu"
                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="staffPhone"
                            className="block text-xs font-bold text-slate-700"
                          >
                            Phone Number
                          </label>
                          <input
                            id="staffPhone"
                            type="tel"
                            disabled={isPending}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. +1 (555) 019-2834"
                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="staffRole"
                            className="block text-xs font-bold text-slate-700"
                          >
                            Designated Role <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="staffRole"
                            disabled={isPending}
                            value={role}
                            onChange={(e) =>
                              setRole(e.target.value as "TEACHER" | "ACCOUNTANT" | "SCHOOL_ADMIN")
                            }
                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none"
                          >
                            <option value="TEACHER">
                              Teacher (Faculty, Course & Roster Management)
                            </option>
                            <option value="ACCOUNTANT">
                              Accountant (Fee Collection & Financial Ledgers)
                            </option>
                            <option value="SCHOOL_ADMIN">
                              School Administrator (Full Operations Access)
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* Teacher Profile Specific Fields */}
                      {role === "TEACHER" && (
                        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <h4 className="text-xs font-bold text-slate-800">
                            Teacher Profile & Employment Details
                          </h4>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Academic attributes used for teaching schedules and workload management
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="empId"
                                className="block text-[11px] font-bold text-slate-600"
                              >
                                Employee ID / Faculty Code
                              </label>
                              <input
                                id="empId"
                                type="text"
                                disabled={isPending}
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder="e.g. TCH-2024-042"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="designation"
                                className="block text-[11px] font-bold text-slate-600"
                              >
                                Professional Designation
                              </label>
                              <input
                                id="designation"
                                type="text"
                                disabled={isPending}
                                value={designation}
                                onChange={(e) => setDesignation(e.target.value)}
                                placeholder="e.g. Senior Physics Lecturer"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="department"
                                className="block text-[11px] font-bold text-slate-600"
                              >
                                Academic Department
                              </label>
                              <input
                                id="department"
                                type="text"
                                disabled={isPending}
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="e.g. Science & Technology"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="joiningDate"
                                className="block text-[11px] font-bold text-slate-600"
                              >
                                Joining Date
                              </label>
                              <input
                                id="joiningDate"
                                type="date"
                                disabled={isPending}
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="qualification"
                                className="block text-[11px] font-bold text-slate-600"
                              >
                                Highest Qualification
                              </label>
                              <input
                                id="qualification"
                                type="text"
                                disabled={isPending}
                                value={qualification}
                                onChange={(e) => setQualification(e.target.value)}
                                placeholder="e.g. M.Sc. Physics, B.Ed."
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="specialization"
                                className="block text-[11px] font-bold text-slate-600"
                              >
                                Subject Specialization
                              </label>
                              <input
                                id="specialization"
                                type="text"
                                disabled={isPending}
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                placeholder="e.g. Thermodynamics & Mechanics"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Invite Immediately Checkbox */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={sendInviteSingle}
                            onChange={(e) => setSendInviteSingle(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="block text-xs font-bold text-slate-800">
                              Send activation invitation email immediately
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              Leave unchecked to add the profile first. You can send the invitation
                              any time using the dedicated &quot;Invite&quot; button in the roster.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isPending ? "Creating Profile..." : "Create Staff Profile"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Bulk Addition Mode */}
                {mode === "bulk" && (
                  <form
                    onSubmit={handleSubmitBulk}
                    className="flex flex-1 flex-col overflow-hidden"
                  >
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                      {/* Bulk Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadCsvTemplate}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-500" />
                            <span>Download Template CSV</span>
                          </button>

                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50">
                            <Upload className="h-3.5 w-3.5 text-slate-500" />
                            <span>Upload CSV</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              onChange={handleCsvUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddBulkRow}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Row</span>
                        </button>
                      </div>

                      {/* Interactive Data Grid */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full min-w-[700px] text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            <tr>
                              <th className="px-3 py-2.5">Full Name *</th>
                              <th className="px-3 py-2.5">Email Address *</th>
                              <th className="px-3 py-2.5">Role</th>
                              <th className="px-3 py-2.5">Emp ID</th>
                              <th className="px-3 py-2.5">Designation</th>
                              <th className="px-3 py-2.5">Department</th>
                              <th className="px-2 py-2.5 text-center">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {bulkRows.map((row) => (
                              <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. John Doe"
                                    value={row.name}
                                    onChange={(e) =>
                                      handleUpdateBulkRow(row.id, "name", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-slate-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="email"
                                    required
                                    placeholder="john@school.edu"
                                    value={row.email}
                                    onChange={(e) =>
                                      handleUpdateBulkRow(row.id, "email", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-slate-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={row.role}
                                    onChange={(e) =>
                                      handleUpdateBulkRow(
                                        row.id,
                                        "role",
                                        e.target.value as "TEACHER" | "ACCOUNTANT" | "SCHOOL_ADMIN"
                                      )
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold focus:border-slate-900 focus:outline-none"
                                  >
                                    <option value="TEACHER">Teacher</option>
                                    <option value="ACCOUNTANT">Accountant</option>
                                    <option value="SCHOOL_ADMIN">Admin</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="EMP-..."
                                    value={row.employeeId}
                                    onChange={(e) =>
                                      handleUpdateBulkRow(row.id, "employeeId", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-slate-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Designation"
                                    value={row.designation}
                                    onChange={(e) =>
                                      handleUpdateBulkRow(row.id, "designation", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-slate-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Department"
                                    value={row.department}
                                    onChange={(e) =>
                                      handleUpdateBulkRow(row.id, "department", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-slate-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBulkRow(row.id)}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Bulk Send Invites Option */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={sendInvitesBulk}
                            onChange={(e) => setSendInvitesBulk(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="block text-xs font-bold text-slate-800">
                              Send activation invitations to all imported staff immediately
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              If disabled, profiles will be created in your roster and you can
                              invite each staff member on-demand with the &quot;Invite&quot; button.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                      <span className="text-xs font-semibold text-slate-500">
                        {bulkRows.filter((r) => r.name.trim() && r.email.trim()).length} staff
                        member(s) ready to import
                      </span>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          {isPending
                            ? "Importing Staff..."
                            : `Import ${
                                bulkRows.filter((r) => r.name.trim() && r.email.trim()).length
                              } Staff Members`}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
