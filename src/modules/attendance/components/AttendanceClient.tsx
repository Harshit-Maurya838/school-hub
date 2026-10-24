"use client";

import React, { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  UserCheck,
  Shield,
  Layers,
  Check,
  X,
  HelpCircle,
  Lock,
  Save,
  Send,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  History,
  BarChart3,
  BookOpen,
  Edit3,
} from "lucide-react";
import { Modal } from "@/components/common/Modal";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface AttendanceSectionOption {
  sectionId: string;
  sectionName: string;
  classId: string;
  className: string;
  displayName: string;
  studentCount: number;
  isClassTeacher: boolean;
}

export interface AttendanceRosterStudent {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  name: string;
  gender: string;
  rollNumber?: string | null;
  status: AttendanceStatus | null;
  remarks: string | null;
  recordId?: string | null;
}

export interface RegisterMetadata {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  date: string;
  submittedAt: string | null;
  submittedBy?: { id: string; name: string; role: string } | null;
  createdBy?: { id: string; name: string } | null;
  updatedBy?: { id: string; name: string } | null;
  notes?: string | null;
  correctionsCount: number;
  corrections?: Array<{
    id: string;
    reason: string;
    previousStatus: AttendanceStatus | null;
    newStatus: AttendanceStatus | null;
    createdAt: string;
    correctedBy: { id: string; name: string };
  }>;
}

export interface HistoricalRegisterSummary {
  id: string;
  date: string;
  status: "DRAFT" | "SUBMITTED";
  sectionId: string;
  sectionName: string;
  className: string;
  displayName: string;
  submittedAt: string | null;
  submittedBy?: { id: string; name: string; role: string } | null;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface AttendanceReportsData {
  academicYear: { id: string; name: string };
  formulaDefinition: {
    formula: string;
    denominator: string;
    statutoryDisclaimer: string;
  };
  sections: Array<{
    sectionId: string;
    sectionName: string;
    className: string;
    displayName: string;
    submittedRegistersCount: number;
    totalStudentEntries: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendancePercentage: number;
    strictPresentPercentage: number;
  }>;
  students: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string;
    sectionId: string;
    recordedDaysCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendancePercentage: number;
    strictPresentPercentage: number;
    history: Array<{
      date: string;
      status: AttendanceStatus;
      remarks: string | null;
    }>;
  }>;
  totalRegistersCount: number;
}

interface AttendanceClientProps {
  schoolSlug: string;
  schoolName: string;
  userRole: string;
  currentSession: string;
  academicYearId?: string;
  sections: AttendanceSectionOption[];
  defaultSectionId?: string | null;
  initialDate?: string;
}

export function AttendanceClient({
  schoolSlug,
  schoolName,
  userRole,
  currentSession,
  academicYearId,
  sections,
  defaultSectionId,
  initialDate,
}: AttendanceClientProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"register" | "history" | "reports">("register");

  // Selection states
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    defaultSectionId || (sections[0]?.sectionId ?? "")
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );

  // Loaded register and roster state
  const [registerMeta, setRegisterMeta] = useState<RegisterMetadata | null>(null);
  const [roster, setRoster] = useState<AttendanceRosterStudent[]>([]);
  const [initialMarksMap, setInitialMarksMap] = useState<Record<string, AttendanceStatus | null>>(
    {}
  );
  const [marksMap, setMarksMap] = useState<Record<string, AttendanceStatus | null>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Permissions state from server
  const [canMark, setCanMark] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Modals
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState<boolean>(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);

  // History and Reports data
  const [historicalRegisters, setHistoricalRegisters] = useState<HistoricalRegisterSummary[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [reportsData, setReportsData] = useState<AttendanceReportsData | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(false);

  // Check unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (isLocked) return false;
    for (const student of roster) {
      const initial = initialMarksMap[student.studentId] || null;
      const current = marksMap[student.studentId] || null;
      if (initial !== current) return true;
    }
    return false;
  }, [roster, initialMarksMap, marksMap, isLocked]);

  // Load daily register from API
  const fetchDailyRegister = useCallback(
    async (sectionId: string, date: string) => {
      if (!sectionId || !date) return;
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const queryParams = new URLSearchParams({
          sectionId,
          date,
        });
        if (academicYearId) {
          queryParams.set("academicYearId", academicYearId);
        }

        const res = await fetch(
          `/api/v1/school/${schoolSlug}/attendance/register?${queryParams.toString()}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || "Failed to load attendance register");
        }

        const resData = data.data;
        setRegisterMeta(resData.register);
        setRoster(resData.roster || []);

        const initialStatus: Record<string, AttendanceStatus | null> = {};
        const initialRemarks: Record<string, string> = {};

        (resData.roster || []).forEach((st: AttendanceRosterStudent) => {
          initialStatus[st.studentId] = st.status;
          if (st.remarks) {
            initialRemarks[st.studentId] = st.remarks;
          }
        });

        setInitialMarksMap(initialStatus);
        setMarksMap(initialStatus);
        setRemarksMap(initialRemarks);
        setCanMark(resData.permissions?.canMark ?? true);
        setIsLocked(resData.permissions?.isLocked ?? false);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to load daily register");
      } finally {
        setIsLoading(false);
      }
    },
    [schoolSlug, academicYearId]
  );

  useEffect(() => {
    if (selectedSectionId && selectedDate) {
      const timer = setTimeout(() => {
        fetchDailyRegister(selectedSectionId, selectedDate);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedSectionId, selectedDate, fetchDailyRegister]);

  // Load history
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const queryParams = new URLSearchParams({
        limit: "50",
      });
      if (selectedSectionId) {
        queryParams.set("sectionId", selectedSectionId);
      }
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/attendance/history?${queryParams.toString()}`
      );
      const data = await res.json();
      if (res.ok) {
        setHistoricalRegisters(data.data.registers || []);
      }
    } catch {
      // ignore non-critical
    } finally {
      setIsHistoryLoading(false);
    }
  }, [schoolSlug, selectedSectionId]);

  // Load reports
  const fetchReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedSectionId) {
        queryParams.set("sectionId", selectedSectionId);
      }
      if (academicYearId) {
        queryParams.set("academicYearId", academicYearId);
      }
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/attendance/reports?${queryParams.toString()}`
      );
      const data = await res.json();
      if (res.ok) {
        setReportsData(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsReportsLoading(false);
    }
  }, [schoolSlug, selectedSectionId, academicYearId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "history") {
        fetchHistory();
      } else if (activeTab === "reports") {
        fetchReports();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, fetchHistory, fetchReports]);

  const [, startTabTransition] = useTransition();

  const handleTabSwitch = useCallback((tab: "register" | "history" | "reports") => {
    startTabTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const handleTabHover = useCallback(
    (tab: "register" | "history" | "reports") => {
      if (tab === "history" && historicalRegisters.length === 0 && !isHistoryLoading) {
        fetchHistory();
      } else if (tab === "reports" && !reportsData && !isReportsLoading) {
        fetchReports();
      }
    },
    [
      historicalRegisters.length,
      isHistoryLoading,
      fetchHistory,
      reportsData,
      isReportsLoading,
      fetchReports,
    ]
  );

  // Real-time counting stats
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    for (const student of roster) {
      const status = marksMap[student.studentId];
      if (status === "PRESENT") present++;
      else if (status === "ABSENT") absent++;
      else if (status === "LATE") late++;
      else if (status === "EXCUSED") excused++;
      else unmarked++;
    }

    return {
      total: roster.length,
      present,
      absent,
      late,
      excused,
      unmarked,
      isFullyMarked: unmarked === 0 && roster.length > 0,
    };
  }, [roster, marksMap]);

  // Single mark change
  const handleMarkChange = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) return;
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  // Bulk marks
  const handleBulkMark = (status: AttendanceStatus | null) => {
    if (isLocked) return;
    const next: Record<string, AttendanceStatus | null> = {};
    for (const st of roster) {
      next[st.studentId] = status;
    }
    setMarksMap(next);
  };

  // Date steppers
  const handlePrevDay = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Switch date anyway?")) return;
    }
    const curr = new Date(selectedDate);
    curr.setUTCDate(curr.getUTCDate() - 1);
    setSelectedDate(curr.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Switch date anyway?")) return;
    }
    const curr = new Date(selectedDate);
    curr.setUTCDate(curr.getUTCDate() + 1);
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextStr = curr.toISOString().slice(0, 10);
    if (nextStr > todayStr) {
      alert("Cannot navigate to a future date.");
      return;
    }
    setSelectedDate(nextStr);
  };

  const handleSetToday = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Switch date anyway?")) return;
    }
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const records = Object.entries(marksMap)
      .filter(([, status]) => status !== null)
      .map(([studentId, status]) => ({
        studentId,
        status: status as AttendanceStatus,
        remarks: remarksMap[studentId] || null,
      }));

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/attendance/register/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          date: selectedDate,
          academicYearId,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save draft");
      }

      setSuccessMsg("Attendance draft saved successfully");
      await fetchDailyRegister(selectedSectionId, selectedDate);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit attendance register
  const handleConfirmSubmit = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitConfirmOpen(false);

    const records = Object.entries(marksMap)
      .filter(([, status]) => status !== null)
      .map(([studentId, status]) => ({
        studentId,
        status: status as AttendanceStatus,
        remarks: remarksMap[studentId] || null,
      }));

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/attendance/register/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          date: selectedDate,
          academicYearId,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit attendance register");
      }

      setSuccessMsg("Attendance register successfully submitted and locked!");
      await fetchDailyRegister(selectedSectionId, selectedDate);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit attendance");
    } finally {
      setIsSaving(false);
    }
  };

  // Admin Correction Submit
  const handlePerformCorrection = async () => {
    if (!correctionReason.trim() || correctionReason.trim().length < 5) {
      setErrorMsg(
        "Correction reason is mandatory (minimum 5 characters explaining the modification)."
      );
      return;
    }

    if (!registerMeta?.id) return;

    setIsSubmittingCorrection(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const updates = Object.entries(marksMap)
      .filter(([, status]) => status !== null)
      .map(([studentId, status]) => ({
        studentId,
        status: status as AttendanceStatus,
        remarks: remarksMap[studentId] || null,
      }));

    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/attendance/register/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registerId: registerMeta.id,
          reason: correctionReason.trim(),
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to apply correction");
      }

      setSuccessMsg("Administrative correction applied and audit event recorded!");
      setIsCorrectionModalOpen(false);
      setCorrectionReason("");
      await fetchDailyRegister(selectedSectionId, selectedDate);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to apply correction");
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Filter roster by search
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase();
    return roster.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        st.admissionNumber.toLowerCase().includes(q) ||
        (st.rollNumber && String(st.rollNumber).toLowerCase().includes(q))
    );
  }, [roster, searchQuery]);

  const selectedSectionInfo = sections.find((s) => s.sectionId === selectedSectionId);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {schoolName}
            </Link>
            <span>/</span>
            <span className="text-slate-800">Attendance</span>
            <span>/</span>
            <span className="font-bold text-emerald-800">Daily Register</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Student Daily Attendance
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Official classroom attendance register with assignment-scoped authorization and audit
            trails
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
            <span>Session: {currentSession}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>{userRole}</span>
          </div>

          {selectedSectionInfo?.isClassTeacher && (
            <div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900">
              <UserCheck className="h-3.5 w-3.5 text-amber-700" />
              <span>Assigned Class Teacher</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => handleTabSwitch("register")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "register"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Daily Ledger Register</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("history")}
          onMouseEnter={() => handleTabHover("history")}
          onTouchStart={() => handleTabHover("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "history"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Historical Registers</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("reports")}
          onMouseEnter={() => handleTabHover("reports")}
          onTouchStart={() => handleTabHover("reports")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "reports"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics & Reports</span>
        </button>
      </div>

      {/* Toast Notifications */}
      {successMsg && (
        <div className="animate-in fade-in flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-700" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="animate-in fade-in flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: DAILY REGISTER */}
      {activeTab === "register" && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col flex-wrap items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center">
            {/* Section Selector */}
            <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center">
              <label
                htmlFor="sectionSelect"
                className="text-xs font-bold tracking-wider text-slate-500 uppercase sm:w-20"
              >
                Section:
              </label>
              <select
                id="sectionSelect"
                value={selectedSectionId}
                onChange={(e) => {
                  if (hasUnsavedChanges) {
                    if (!window.confirm("You have unsaved changes. Switch section anyway?")) return;
                  }
                  setSelectedSectionId(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 transition focus:border-emerald-600 focus:bg-white focus:outline-hidden sm:w-64"
              >
                {sections.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    {sec.displayName} ({sec.studentCount} students)
                    {sec.isClassTeacher ? " [Class Teacher]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  if (hasUnsavedChanges) {
                    if (!window.confirm("You have unsaved changes. Switch date anyway?")) return;
                  }
                  setSelectedDate(e.target.value);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSetToday}
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Today
              </button>
            </div>

            {/* Register Status Indicator */}
            <div className="flex items-center gap-2">
              {registerMeta?.status === "SUBMITTED" ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Submitted & Locked</span>
                </div>
              ) : registerMeta?.status === "DRAFT" ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                  <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                  <span>Draft in Progress</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  <span>Unopened Register</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission / Lock Banner */}
          {registerMeta?.status === "SUBMITTED" && (
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <h4 className="text-xs font-extrabold tracking-wide text-emerald-950 uppercase">
                    Attendance Finalized & Locked
                  </h4>
                  <p className="mt-0.5 text-xs text-emerald-800">
                    Submitted on{" "}
                    <strong>
                      {registerMeta.submittedAt
                        ? new Date(registerMeta.submittedAt).toLocaleString()
                        : registerMeta.date}
                    </strong>{" "}
                    by <strong>{registerMeta.submittedBy?.name || "Faculty Member"}</strong>.
                    Ordinary teacher modifications are restricted.
                  </p>
                </div>
              </div>

              {(userRole === "SCHOOL_ADMIN" || userRole === "SUPER_ADMIN") && (
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-xs transition hover:bg-emerald-50"
                >
                  Administrative Correction
                </button>
              )}
            </div>
          )}

          {/* Notebook Register Container */}
          <div className="register-notebook overflow-hidden rounded-3xl border border-amber-900/15 bg-white shadow-md">
            {/* Dark Leather Spine Header with Binder Rings */}
            <div className="register-spine relative flex items-center justify-between border-b border-emerald-950/20 bg-emerald-950 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-800 bg-emerald-900 text-amber-200">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-black tracking-tight text-[#FFFDF7]">
                    {selectedSectionInfo?.displayName || "Class Register"}
                  </h3>
                  <p className="font-sans text-xs font-medium text-emerald-200/80">
                    Roll Date:{" "}
                    <span className="font-mono font-bold text-white">{selectedDate}</span> •{" "}
                    {roster.length} Enrolled Students
                  </p>
                </div>
              </div>

              {/* Counter Summary Badges */}
              <div className="hidden flex-wrap items-center gap-2 sm:flex">
                <div className="rounded-lg border border-emerald-800 bg-emerald-900/80 px-2.5 py-1 text-center">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase">Present</span>
                  <span className="ml-1.5 font-mono text-xs font-black text-white">
                    {stats.present}
                  </span>
                </div>
                <div className="rounded-lg border border-rose-800 bg-rose-950/80 px-2.5 py-1 text-center">
                  <span className="text-[10px] font-bold text-rose-300 uppercase">Absent</span>
                  <span className="ml-1.5 font-mono text-xs font-black text-white">
                    {stats.absent}
                  </span>
                </div>
                <div className="rounded-lg border border-amber-800 bg-amber-950/80 px-2.5 py-1 text-center">
                  <span className="text-[10px] font-bold text-amber-300 uppercase">Late</span>
                  <span className="ml-1.5 font-mono text-xs font-black text-white">
                    {stats.late}
                  </span>
                </div>
                <div className="rounded-lg border border-sky-800 bg-sky-950/80 px-2.5 py-1 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase">Excused</span>
                  <span className="ml-1.5 font-mono text-xs font-black text-white">
                    {stats.excused}
                  </span>
                </div>
                {stats.unmarked > 0 && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Unmarked</span>
                    <span className="ml-1.5 font-mono text-xs font-black text-amber-400">
                      {stats.unmarked}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notebook Lined Cream Page Body */}
            <div className="relative bg-[#FFFDF7] p-4 sm:p-6">
              {/* Toolbar & Search Bar */}
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pr-3 pl-9 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                {/* Bulk Actions */}
                {!isLocked && canMark && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-bold text-slate-500">Bulk:</span>
                    <button
                      type="button"
                      onClick={() => handleBulkMark("PRESENT")}
                      className="rounded-lg bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-200"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMark("ABSENT")}
                      className="rounded-lg bg-rose-100/90 px-3 py-1.5 text-xs font-bold text-rose-900 transition hover:bg-rose-200"
                    >
                      All Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMark(null)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Clear Marks
                    </button>
                  </div>
                )}
              </div>

              {/* Loading Skeleton */}
              {isLoading ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-700" />
                  <p className="text-xs font-medium text-slate-500">
                    Retrieving physical register ledger from database...
                  </p>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Layers className="mx-auto h-10 w-10 text-slate-300" />
                  <h4 className="mt-2 text-sm font-bold text-slate-700">No students enrolled</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    There are no active student enrollments for this class section in session{" "}
                    {currentSession}.
                  </p>
                </div>
              ) : (
                /* Roster Ledger Table */
                <div className="overflow-x-auto rounded-2xl border border-amber-900/10 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-amber-900/10 bg-amber-50/60 font-serif text-[11px] font-bold tracking-wider text-amber-950 uppercase">
                      <tr>
                        <th className="px-4 py-3">Roll / Adm No</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3 text-center">Daily Status</th>
                        <th className="px-4 py-3">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((student, idx) => {
                        const currentStatus = marksMap[student.studentId];
                        return (
                          <tr
                            key={student.studentId}
                            className={`transition-colors ${
                              currentStatus === "ABSENT"
                                ? "bg-rose-50/30"
                                : currentStatus === "LATE"
                                  ? "bg-amber-50/30"
                                  : currentStatus === "EXCUSED"
                                    ? "bg-sky-50/30"
                                    : "hover:bg-amber-50/20"
                            }`}
                          >
                            {/* Admission / Roll */}
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs font-bold text-slate-700">
                                {student.rollNumber ? `#${student.rollNumber}` : idx + 1}
                              </span>
                              <span className="block font-mono text-[10px] text-slate-400">
                                {student.admissionNumber}
                              </span>
                            </td>

                            {/* Name */}
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-slate-900">{student.name}</span>
                            </td>

                            {/* Gender */}
                            <td className="px-4 py-2.5 text-slate-500">{student.gender}</td>

                            {/* Status Selector Buttons */}
                            <td className="px-4 py-2.5 text-center">
                              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
                                {/* Present */}
                                <button
                                  type="button"
                                  disabled={isLocked || !canMark}
                                  onClick={() => handleMarkChange(student.studentId, "PRESENT")}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "PRESENT"
                                      ? "scale-105 bg-emerald-700 text-white shadow-xs"
                                      : "text-slate-600 hover:bg-emerald-100 hover:text-emerald-900 disabled:opacity-40"
                                  }`}
                                  title="Present"
                                >
                                  P
                                </button>

                                {/* Absent */}
                                <button
                                  type="button"
                                  disabled={isLocked || !canMark}
                                  onClick={() => handleMarkChange(student.studentId, "ABSENT")}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "ABSENT"
                                      ? "scale-105 bg-rose-600 text-white shadow-xs"
                                      : "text-slate-600 hover:bg-rose-100 hover:text-rose-900 disabled:opacity-40"
                                  }`}
                                  title="Absent"
                                >
                                  A
                                </button>

                                {/* Late */}
                                <button
                                  type="button"
                                  disabled={isLocked || !canMark}
                                  onClick={() => handleMarkChange(student.studentId, "LATE")}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "LATE"
                                      ? "scale-105 bg-amber-600 text-white shadow-xs"
                                      : "text-slate-600 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-40"
                                  }`}
                                  title="Late"
                                >
                                  L
                                </button>

                                {/* Excused */}
                                <button
                                  type="button"
                                  disabled={isLocked || !canMark}
                                  onClick={() => handleMarkChange(student.studentId, "EXCUSED")}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "EXCUSED"
                                      ? "scale-105 bg-sky-600 text-white shadow-xs"
                                      : "text-slate-600 hover:bg-sky-100 hover:text-sky-900 disabled:opacity-40"
                                  }`}
                                  title="Excused Leave"
                                >
                                  E
                                </button>
                              </div>
                            </td>

                            {/* Remarks */}
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                disabled={isLocked || !canMark}
                                placeholder="Optional note..."
                                value={remarksMap[student.studentId] || ""}
                                onChange={(e) =>
                                  setRemarksMap((prev) => ({
                                    ...prev,
                                    [student.studentId]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-300 focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons Footer */}
              {!isLocked && canMark && roster.length > 0 && (
                <div className="mt-6 flex flex-col justify-between gap-3 border-t border-amber-900/10 pt-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      Roster Marked: {roster.length - stats.unmarked} / {roster.length}
                    </span>
                    {stats.unmarked > 0 && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                        {stats.unmarked} unmarked
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveDraft}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 text-slate-500" />
                      <span>{isSaving ? "Saving..." : "Save Draft"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving || stats.unmarked > 0}
                      onClick={() => setIsSubmitConfirmOpen(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs transition ${
                        stats.unmarked > 0
                          ? "cursor-not-allowed bg-slate-400"
                          : "bg-emerald-700 hover:bg-emerald-800"
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      <span>Submit Register</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORICAL REGISTERS */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Attendance Register History
              </h3>
              <p className="text-xs text-slate-500">
                Audit and inspect previously submitted or drafted classroom sessions
              </p>
            </div>
            <button
              type="button"
              onClick={fetchHistory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Refresh History</span>
            </button>
          </div>

          {isHistoryLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-700" />
            </div>
          ) : historicalRegisters.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <History className="mx-auto h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-800">No attendance history found</h4>
              <p className="mt-1 text-xs text-slate-400">
                Daily registers recorded for your assigned sections will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 font-sans text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Present %</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Counts (P / A / L / E)</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {historicalRegisters.map((reg) => (
                    <tr key={reg.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{reg.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{reg.displayName}</td>
                      <td className="px-4 py-3">
                        {reg.status === "SUBMITTED" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <Lock className="h-3 w-3" />
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {reg.attendancePercentage}%
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{reg.totalEnrolled}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="font-bold text-emerald-700">{reg.presentCount}P</span> /{" "}
                        <span className="font-bold text-rose-600">{reg.absentCount}A</span> /{" "}
                        <span className="font-bold text-amber-600">{reg.lateCount}L</span> /{" "}
                        <span className="font-bold text-sky-600">{reg.excusedCount}E</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSectionId(reg.sectionId);
                            setSelectedDate(reg.date);
                            setActiveTab("register");
                          }}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          Inspect Register
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REPORTS & PERCENTAGES */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Attendance Calculations & Reports
              </h3>
              <p className="text-xs text-slate-500">
                Section-wise and student-level attendance summaries calculated from submitted
                registers
              </p>
            </div>
            <button
              type="button"
              onClick={fetchReports}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Refresh Reports</span>
            </button>
          </div>

          {/* Statutory Disclaimer & Formula Card */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
            <h4 className="text-xs font-bold tracking-wider text-amber-950 uppercase">
              Calculation Formula & Compliance Definition
            </h4>
            <p className="mt-1 font-mono text-xs text-amber-900">
              Formula: <strong>(Present + Late) / Total Recorded Register Days * 100</strong>
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Denominator strictly represents the eligible enrolled school days with submitted
              registers. Unmarked records are never treated as absences, and Excused leaves are not
              counted as present days.
            </p>
            <p className="mt-1.5 text-[11px] text-amber-700 italic">
              Note: Statutory compliance percentage requires school holiday, operational calendar,
              and official leave policy configuration.
            </p>
          </div>

          {isReportsLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-700" />
            </div>
          ) : !reportsData ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              No report data available.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section Summaries */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                  Section Aggregates
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {reportsData.sections.map((sec) => (
                    <div
                      key={sec.sectionId}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                      <h5 className="font-serif text-base font-bold text-slate-900">
                        {sec.displayName}
                      </h5>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {sec.submittedRegistersCount} submitted register session(s)
                      </p>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-black text-emerald-800">
                          {sec.attendancePercentage}%
                        </span>
                        <span className="text-xs text-slate-500">attendance rate</span>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-50 p-2 text-center text-[11px]">
                        <div>
                          <span className="block text-slate-400">Present</span>
                          <span className="font-mono font-bold text-emerald-800">
                            {sec.presentCount}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Absent</span>
                          <span className="font-mono font-bold text-rose-700">
                            {sec.absentCount}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Late</span>
                          <span className="font-mono font-bold text-amber-700">
                            {sec.lateCount}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Excused</span>
                          <span className="font-mono font-bold text-sky-700">
                            {sec.excusedCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Summaries Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                  Student Cumulative Roster ({reportsData.students.length})
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 font-sans text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Adm No</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Recorded Days</th>
                        <th className="px-4 py-3">Overall Attendance %</th>
                        <th className="px-4 py-3">Strict Present %</th>
                        <th className="px-4 py-3">Present / Absent / Late / Excused</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportsData.students.map((st) => (
                        <tr key={st.studentId} className="transition-colors hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-600">
                            {st.admissionNumber}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{st.studentName}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">
                            {st.recordedDaysCount}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">
                            {st.attendancePercentage}%
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-700">
                            {st.strictPresentPercentage}%
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs">
                            <span className="font-bold text-emerald-700">{st.presentCount}P</span> /{" "}
                            <span className="font-bold text-rose-600">{st.absentCount}A</span> /{" "}
                            <span className="font-bold text-amber-600">{st.lateCount}L</span> /{" "}
                            <span className="font-bold text-sky-600">{st.excusedCount}E</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM SUBMISSION MODAL */}
      <Modal
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        title="Confirm Daily Attendance Submission"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
            You are submitting daily attendance for{" "}
            <strong>{selectedSectionInfo?.displayName}</strong> on <strong>{selectedDate}</strong>.
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            <p>
              • Total Roster: <strong>{roster.length} students</strong>
            </p>
            <p>
              • Present: <strong className="text-emerald-700">{stats.present}</strong>
            </p>
            <p>
              • Absent: <strong className="text-rose-700">{stats.absent}</strong>
            </p>
            <p>
              • Late: <strong className="text-amber-700">{stats.late}</strong>
            </p>
            <p>
              • Excused: <strong className="text-sky-700">{stats.excused}</strong>
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Locking Notice:</strong> Once submitted, the register is locked. Further
            modifications require an administrative correction request.
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsSubmitConfirmOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleConfirmSubmit}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSaving ? "Submitting..." : "Yes, Submit Attendance"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ADMIN CORRECTION MODAL */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Administrative Attendance Correction"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <strong>Administrative Action:</strong> You are modifying submitted attendance for{" "}
            <strong>{selectedSectionInfo?.displayName}</strong> on <strong>{selectedDate}</strong>.
            A mandatory reason must be provided for audit compliance.
          </div>

          <div className="space-y-1">
            <label htmlFor="correctionReason" className="text-xs font-bold text-slate-700">
              Mandatory Correction Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="correctionReason"
              rows={3}
              placeholder="e.g., Parent submitted official medical note for excused absence / clerical correction."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400">
              Minimum 5 characters. This reason will be permanently attached to the audit record.
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingCorrection || correctionReason.trim().length < 5}
              onClick={handlePerformCorrection}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSubmittingCorrection ? "Applying..." : "Apply & Audit Correction"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AttendanceClient;
