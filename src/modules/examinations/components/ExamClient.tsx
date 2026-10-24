"use client";

import React, { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  Save,
  Send,
  Lock,
  Layers,
  BarChart3,
  BookOpen,
  Eye,
  Edit2,
  ShieldAlert,
} from "lucide-react";
import { Modal } from "@/components/common/Modal";

// ============================================================================
// Types
// ============================================================================

export type ExamStatus =
  "DRAFT" | "SCHEDULED" | "MARKS_ENTRY" | "UNDER_REVIEW" | "PUBLISHED" | "CANCELLED";

export type ExamType = "UNIT_TEST" | "MID_TERM" | "FINAL" | "QUARTERLY" | "PRACTICAL" | "OTHER";

export type WorkflowStatus =
  "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "PUBLISHED";

export interface ExamSummary {
  id: string;
  name: string;
  type: ExamType;
  description: string | null;
  startDate: string;
  endDate: string;
  status: ExamStatus;
  academicYear: { id: string; name: string };
  classes: Array<{
    class: { id: string; name: string };
  }>;
  subjectConfigs: Array<{
    class: { id: string; name: string };
    subject: { id: string; name: string; code: string | null };
    maxMarks: number;
    passMarks: number;
  }>;
  sectionSubjects: Array<{
    id: string;
    sectionId: string;
    subjectId: string;
    status: WorkflowStatus;
  }>;
}

export interface TeacherAssignment {
  examId: string;
  examName: string;
  examStatus: ExamStatus;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  status: WorkflowStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  isEditable: boolean;
}

export interface RosterStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  enrollmentId: string;
  markId: string | null;
  marksObtained: number | null;
  isAbsent: boolean;
  isExempt: boolean;
  remarks: string | null;
  status: "ENTERED" | "ABSENT" | "EXEMPT" | "UNMARKED";
}

export interface RosterData {
  exam: { id: string; name: string; type: ExamType; status: ExamStatus };
  section: { id: string; name: string; classId: string; className: string };
  subject: { id: string; name: string; code: string | null };
  config: { maxMarks: number; passMarks: number };
  workflow: {
    status: WorkflowStatus;
    submittedAt: string | null;
    submittedBy: { id: string; name: string } | null;
    reviewedAt: string | null;
    reviewedBy: { id: string; name: string } | null;
    reviewNotes: string | null;
    isEditable: boolean;
  };
  students: RosterStudent[];
}

export interface ReportsData {
  exam: {
    id: string;
    name: string;
    type: ExamType;
    status: ExamStatus;
    startDate: string;
    endDate: string;
    publishedAt: string | null;
  };
  completion: {
    totalExpected: number;
    completed: number;
    percentage: number;
    statusCounts: Record<WorkflowStatus, number>;
  };
  subjectSummaries: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    subjectId: string;
    subjectName: string;
    maxMarks: number;
    passMarks: number;
    totalEnrolled: number;
    appeared: number;
    absent: number;
    exempt: number;
    passed: number;
    failed: number;
    passPercentage: number;
    averageMarks: number;
    highestMarks: number;
    lowestMarks: number;
    status: WorkflowStatus;
  }>;
  studentSummaries: Array<{
    studentId: string;
    name: string;
    admissionNumber: string;
    rollNumber: string | null;
    sectionName: string;
    className: string;
    totalMaxMarks: number;
    totalMarksObtained: number;
    percentage: number;
    overallStatus: "PASS" | "FAIL" | "INCOMPLETE";
    results: Array<{
      subjectId: string;
      subjectName: string;
      maxMarks: number;
      passMarks: number;
      marksObtained: number | null;
      isAbsent: boolean;
      isExempt: boolean;
      status: "PASS" | "FAIL" | "ABSENT" | "EXEMPT" | "UNMARKED";
    }>;
  }>;
}

interface ExamClientProps {
  schoolSlug: string;
  schoolName: string;
  userRole: string;
  userId: string;
  activeAcademicYear: { id: string; name: string } | null;
  allAcademicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  classes: Array<{
    id: string;
    name: string;
    sections: Array<{ id: string; name: string }>;
    subjects: Array<{ id: string; name: string; code: string | null; classId: string | null }>;
  }>;
  teacherAssignedSectionIds: string[];
}

export function ExamClient({
  schoolSlug,
  schoolName,
  userRole,
  activeAcademicYear,
  classes,
}: ExamClientProps) {
  const isAdmin = userRole === "SCHOOL_ADMIN" || userRole === "SUPER_ADMIN";
  const isTeacher = userRole === "TEACHER";

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"exams" | "marks" | "reviews" | "reports">(
    isTeacher ? "marks" : "exams"
  );

  // Exams list state
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examStatusFilter, setExamStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Exam for Marks Entry / Reports
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  // Teacher Assignments / Subject options
  const [assignedSubjects, setAssignedSubjects] = useState<TeacherAssignment[]>([]);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<TeacherAssignment | null>(
    null
  );

  // Marks Roster state
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [marksMap, setMarksMap] = useState<
    Record<string, { marks: string; isAbsent: boolean; isExempt: boolean; remarks: string }>
  >({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingMarks, setSubmittingMarks] = useState(false);
  const [rosterMessage, setRosterMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [configuringExam, setConfiguringExam] = useState<ExamSummary | null>(null);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItem, setReturnItem] = useState<{
    examId: string;
    sectionId: string;
    subjectId: string;
    subjectName: string;
  } | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [processingReview, setProcessingReview] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingExamId, setPublishingExamId] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<{
    markId: string;
    studentName: string;
    subjectName: string;
    currentMarks: number | null;
    isAbsent: boolean;
    maxMarks: number;
    examId: string;
  } | null>(null);
  const [newCorrectedMarks, setNewCorrectedMarks] = useState("");
  const [newCorrectedAbsent, setNewCorrectedAbsent] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Reports state
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportStudentQuery, setReportStudentQuery] = useState("");

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/exams`);
      const json = await res.json();
      if (res.ok && json.data) {
        setExams(json.data);
        if (!selectedExamId && json.data.length > 0) {
          setSelectedExamId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load examinations", err);
    } finally {
      setLoadingExams(false);
    }
  }, [schoolSlug, selectedExamId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExams();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchExams]);

  // Load teacher assigned subject-sections when selectedExamId changes
  const fetchAssignedSubjects = useCallback(
    async (examId: string) => {
      if (!examId) return;
      try {
        const res = await fetch(`/api/v1/school/${schoolSlug}/exams/${examId}/teacher-assignments`);
        const json = await res.json();
        if (res.ok && json.data) {
          setAssignedSubjects(json.data);
          if (json.data.length > 0) {
            setSelectedSubjectOption(json.data[0]);
          } else {
            setSelectedSubjectOption(null);
            setRoster(null);
          }
        }
      } catch (err) {
        console.error("Failed to load teacher assignments", err);
      }
    },
    [schoolSlug]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedExamId) {
        fetchAssignedSubjects(selectedExamId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedExamId, fetchAssignedSubjects]);

  // Load Marks Roster when selectedSubjectOption changes
  const fetchMarksRoster = useCallback(async () => {
    if (!selectedSubjectOption) return;
    setLoadingRoster(true);
    setRosterMessage(null);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/exams/${selectedSubjectOption.examId}/marks?sectionId=${selectedSubjectOption.sectionId}&subjectId=${selectedSubjectOption.subjectId}`
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setRoster(json.data);
        // Initialize marksMap
        const initialMap: Record<
          string,
          { marks: string; isAbsent: boolean; isExempt: boolean; remarks: string }
        > = {};
        for (const s of json.data.students) {
          initialMap[s.studentId] = {
            marks: s.marksObtained !== null ? String(s.marksObtained) : "",
            isAbsent: s.isAbsent,
            isExempt: s.isExempt,
            remarks: s.remarks || "",
          };
        }
        setMarksMap(initialMap);
      } else {
        setRosterMessage({
          type: "error",
          text: json.error?.message || "Failed to load marks roster.",
        });
      }
    } catch {
      setRosterMessage({ type: "error", text: "Network error loading marks roster." });
    } finally {
      setLoadingRoster(false);
    }
  }, [schoolSlug, selectedSubjectOption]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "marks" && selectedSubjectOption) {
        fetchMarksRoster();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, selectedSubjectOption, fetchMarksRoster]);

  // Load Reports data when selectedExamId changes in reports tab
  const fetchReports = useCallback(
    async (examId: string) => {
      if (!examId) return;
      setLoadingReports(true);
      try {
        const res = await fetch(`/api/v1/school/${schoolSlug}/exams/${examId}/reports`);
        const json = await res.json();
        if (res.ok && json.data) {
          setReportsData(json.data);
        } else {
          setReportsData(null);
        }
      } catch (err) {
        console.error("Failed to load reports", err);
        setReportsData(null);
      } finally {
        setLoadingReports(false);
      }
    },
    [schoolSlug]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "reports" && selectedExamId) {
        fetchReports(selectedExamId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, selectedExamId, fetchReports]);

  const [, startTabTransition] = useTransition();

  const handleTabSwitch = useCallback((tab: "exams" | "marks" | "reviews" | "reports") => {
    startTabTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const handleTabHover = useCallback(
    (tab: "exams" | "marks" | "reviews" | "reports") => {
      if (tab === "reports" && selectedExamId && !reportsData && !loadingReports) {
        fetchReports(selectedExamId);
      } else if (tab === "marks" && selectedSubjectOption && !roster && !loadingRoster) {
        fetchMarksRoster();
      }
    },
    [
      selectedExamId,
      reportsData,
      loadingReports,
      fetchReports,
      selectedSubjectOption,
      roster,
      loadingRoster,
      fetchMarksRoster,
    ]
  );

  // ==========================================================================
  // Handlers for Marks Entry
  // ==========================================================================

  const handleMarkChange = (studentId: string, value: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: value,
        isAbsent: false,
        isExempt: false,
      },
    }));
  };

  const handleAbsentToggle = (studentId: string) => {
    setMarksMap((prev) => {
      const current = prev[studentId];
      const willBeAbsent = !current?.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent: willBeAbsent,
          isExempt: false,
          marks: willBeAbsent ? "" : current.marks,
        },
      };
    });
  };

  const handleExemptToggle = (studentId: string) => {
    setMarksMap((prev) => {
      const current = prev[studentId];
      const willBeExempt = !current?.isExempt;
      return {
        ...prev,
        [studentId]: {
          ...current,
          isExempt: willBeExempt,
          isAbsent: false,
          marks: willBeExempt ? "" : current.marks,
        },
      };
    });
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleSaveDraft = async () => {
    if (!selectedSubjectOption || !roster) return;
    setSavingDraft(true);
    setRosterMessage(null);

    const entries = Object.entries(marksMap).map(([studentId, item]) => ({
      studentId,
      marksObtained: item.marks !== "" ? parseFloat(item.marks) : null,
      isAbsent: item.isAbsent,
      isExempt: item.isExempt,
      remarks: item.remarks || undefined,
    }));

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/exams/${selectedSubjectOption.examId}/marks/draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: selectedSubjectOption.sectionId,
            subjectId: selectedSubjectOption.subjectId,
            entries,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setRoster(json.data);
        setRosterMessage({ type: "success", text: "Draft marks saved successfully." });
        fetchAssignedSubjects(selectedSubjectOption.examId);
      } else {
        setRosterMessage({ type: "error", text: json.error?.message || "Failed to save draft." });
      }
    } catch {
      setRosterMessage({ type: "error", text: "Network error saving draft." });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedSubjectOption || !roster) return;

    // Validate that every student has an entered mark or is absent/exempt
    for (const student of roster.students) {
      const item = marksMap[student.studentId];
      if (!item || (!item.isAbsent && !item.isExempt && item.marks === "")) {
        setRosterMessage({
          type: "error",
          text: `Cannot submit: Student '${student.name}' is unmarked. Please enter marks or mark as absent/exempt.`,
        });
        return;
      }
      if (!item.isAbsent && !item.isExempt) {
        const val = parseFloat(item.marks);
        if (isNaN(val) || val < 0 || val > roster.config.maxMarks) {
          setRosterMessage({
            type: "error",
            text: `Invalid marks for '${student.name}'. Must be between 0 and ${roster.config.maxMarks}.`,
          });
          return;
        }
      }
    }

    setSubmittingMarks(true);
    setRosterMessage(null);

    const entries = Object.entries(marksMap).map(([studentId, item]) => ({
      studentId,
      marksObtained: item.marks !== "" ? parseFloat(item.marks) : null,
      isAbsent: item.isAbsent,
      isExempt: item.isExempt,
      remarks: item.remarks || undefined,
    }));

    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/exams/${selectedSubjectOption.examId}/marks/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: selectedSubjectOption.sectionId,
            subjectId: selectedSubjectOption.subjectId,
            entries,
          }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setRosterMessage({ type: "success", text: "Marks submitted for administrative review." });
        fetchMarksRoster();
        fetchAssignedSubjects(selectedSubjectOption.examId);
      } else {
        setRosterMessage({ type: "error", text: json.error?.message || "Failed to submit marks." });
      }
    } catch {
      setRosterMessage({ type: "error", text: "Network error submitting marks." });
    } finally {
      setSubmittingMarks(false);
    }
  };

  // ==========================================================================
  // Handlers for Admin Reviews
  // ==========================================================================

  const handleApproveSubmission = async (examId: string, sectionId: string, subjectId: string) => {
    setProcessingReview(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/exams/${examId}/marks/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, subjectId }),
      });
      if (res.ok) {
        fetchExams();
        fetchAssignedSubjects(examId);
      }
    } catch (err) {
      console.error("Failed to approve marks", err);
    } finally {
      setProcessingReview(false);
    }
  };

  const handleReturnSubmission = async () => {
    if (!returnItem || returnReason.trim().length < 5) return;
    setProcessingReview(true);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/exams/${returnItem.examId}/marks/return`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: returnItem.sectionId,
            subjectId: returnItem.subjectId,
            reason: returnReason.trim(),
          }),
        }
      );
      if (res.ok) {
        setShowReturnModal(false);
        setReturnItem(null);
        setReturnReason("");
        fetchExams();
        fetchAssignedSubjects(returnItem.examId);
      }
    } catch (err) {
      console.error("Failed to return marks", err);
    } finally {
      setProcessingReview(false);
    }
  };

  const handlePublishResults = async () => {
    if (!publishingExamId) return;
    setPublishing(true);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/exams/${publishingExamId}/marks/publish`,
        { method: "POST" }
      );
      if (res.ok) {
        setShowPublishModal(false);
        setPublishingExamId("");
        fetchExams();
        fetchReports(publishingExamId);
      }
    } catch (err) {
      console.error("Failed to publish exam", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleApplyCorrection = async () => {
    if (!correctionTarget || correctionReason.trim().length < 5) return;
    setSavingCorrection(true);
    try {
      const res = await fetch(
        `/api/v1/school/${schoolSlug}/exams/${correctionTarget.examId}/marks/correct`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentMarkId: correctionTarget.markId,
            newMarks:
              !newCorrectedAbsent && newCorrectedMarks !== ""
                ? parseFloat(newCorrectedMarks)
                : null,
            newAbsent: newCorrectedAbsent,
            reason: correctionReason.trim(),
          }),
        }
      );
      if (res.ok) {
        setShowCorrectionModal(false);
        setCorrectionTarget(null);
        setCorrectionReason("");
        setNewCorrectedMarks("");
        fetchReports(correctionTarget.examId);
      }
    } catch (err) {
      console.error("Failed to apply correction", err);
    } finally {
      setSavingCorrection(false);
    }
  };

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchesStatus = examStatusFilter === "ALL" || e.status === examStatusFilter;
      const matchesSearch =
        searchQuery === "" ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [exams, examStatusFilter, searchQuery]);

  // Selected Exam Object
  const currentExam = useMemo(() => {
    return exams.find((e) => e.id === selectedExamId) || null;
  }, [exams, selectedExamId]);

  // Status Badge Helper
  const renderStatusBadge = (status: ExamStatus | WorkflowStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Draft
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            Scheduled
          </span>
        );
      case "MARKS_ENTRY":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Marks Entry Open
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            Under Review
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            Submitted
          </span>
        );
      case "RETURNED":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            Correction Needed
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
            Approved
          </span>
        );
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Published
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href={`/school/${schoolSlug}`} className="hover:text-blue-600">
                {schoolName}
              </Link>
              <span>/</span>
              <span className="text-slate-800">Examinations & Marks Desk</span>
            </div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900">
              <GraduationCap className="h-7 w-7 text-blue-600" />
              Examinations & Assessments
            </h1>
            <p className="text-xs text-slate-500">
              Comprehensive exam lifecycle, subject-wise marks entry rosters, validation boundaries,
              and audited publication workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeAcademicYear && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                Session: {activeAcademicYear.name}
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                New Examination
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleTabSwitch("exams")}
            className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
              activeTab === "exams"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            } mr-6 flex items-center gap-2`}
          >
            <Layers className="h-4 w-4" />
            All Examinations ({exams.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("marks")}
            onMouseEnter={() => handleTabHover("marks")}
            onTouchStart={() => handleTabHover("marks")}
            className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
              activeTab === "marks"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            } mr-6 flex items-center gap-2`}
          >
            <Edit2 className="h-4 w-4" />
            Marks Entry Register
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleTabSwitch("reviews")}
              className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
                activeTab === "reviews"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              } mr-6 flex items-center gap-2`}
            >
              <FileCheck className="h-4 w-4" />
              Review & Approvals
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTabSwitch("reports")}
            onMouseEnter={() => handleTabHover("reports")}
            onTouchStart={() => handleTabHover("reports")}
            className={`cursor-pointer pb-3 text-xs font-bold transition-colors ${
              activeTab === "reports"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            } flex items-center gap-2`}
          >
            <BarChart3 className="h-4 w-4" />
            Results & Analytics
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Tab 1: Examinations List & Life Cycle                                */}
      {/* ==================================================================== */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search examination by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={examStatusFilter}
                onChange={(e) => setExamStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="MARKS_ENTRY">Marks Entry Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Examinations Grid */}
          {loadingExams ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
              <div className="text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs text-slate-500">Loading examinations...</p>
              </div>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-2 text-sm font-bold text-slate-900">No examinations found</h3>
              <p className="mt-1 text-xs text-slate-500">
                {searchQuery || examStatusFilter !== "ALL"
                  ? "Try resetting your search filters."
                  : "Create an examination to start scheduling assessments."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          {exam.type.replace("_", " ")}
                        </span>
                        <h3 className="line-clamp-1 text-base font-extrabold text-slate-900">
                          {exam.name}
                        </h3>
                      </div>
                      {renderStatusBadge(exam.status)}
                    </div>

                    <p className="line-clamp-2 text-xs text-slate-600">
                      {exam.description || "No description provided."}
                    </p>

                    <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Schedule:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(exam.startDate).toLocaleDateString()} -{" "}
                          {new Date(exam.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Classes:</span>
                        <span className="font-medium text-slate-700">
                          {exam.classes.length > 0
                            ? exam.classes.map((c) => c.class.name).join(", ")
                            : "None configured"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Subject Rules:</span>
                        <span className="font-medium text-slate-700">
                          {exam.subjectConfigs.length} configured
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setActiveTab("marks");
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      Enter Marks
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {exam.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfiguringExam(exam);
                              setShowConfigureModal(true);
                            }}
                            className="cursor-pointer rounded-xl bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            Configure
                          </button>
                        )}

                        {exam.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "SCHEDULED" }),
                              });
                              fetchExams();
                            }}
                            className="cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Schedule
                          </button>
                        )}

                        {exam.status === "SCHEDULED" && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "MARKS_ENTRY" }),
                              });
                              fetchExams();
                            }}
                            className="cursor-pointer rounded-xl bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                          >
                            Open Marks
                          </button>
                        )}

                        {exam.status === "MARKS_ENTRY" && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "UNDER_REVIEW" }),
                              });
                              fetchExams();
                            }}
                            className="cursor-pointer rounded-xl bg-purple-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700"
                          >
                            Send to Review
                          </button>
                        )}

                        {exam.status === "UNDER_REVIEW" && (
                          <button
                            type="button"
                            onClick={() => {
                              setPublishingExamId(exam.id);
                              setShowPublishModal(true);
                            }}
                            className="cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 2: Marks Entry Register                                          */}
      {/* ==================================================================== */}
      {activeTab === "marks" && (
        <div className="space-y-4">
          {/* Subject & Section Selection Selector */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {/* Exam Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Select Examination</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject-Section Selector */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700">
                  {isTeacher ? "Assigned Subject & Section" : "Select Class, Section & Subject"}
                </label>
                <select
                  value={
                    selectedSubjectOption
                      ? `${selectedSubjectOption.sectionId}:${selectedSubjectOption.subjectId}`
                      : ""
                  }
                  onChange={(e) => {
                    const [secId, subId] = e.target.value.split(":");
                    const found = assignedSubjects.find(
                      (a) => a.sectionId === secId && a.subjectId === subId
                    );
                    setSelectedSubjectOption(found || null);
                  }}
                  disabled={assignedSubjects.length === 0}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                >
                  {assignedSubjects.length === 0 ? (
                    <option value="">No subject allocations found for this examination</option>
                  ) : (
                    assignedSubjects.map((sub) => (
                      <option
                        key={`${sub.sectionId}:${sub.subjectId}`}
                        value={`${sub.sectionId}:${sub.subjectId}`}
                      >
                        {sub.className} - {sub.sectionName} | {sub.subjectName} ({sub.status})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Workflow Banner & Configuration Details */}
            {selectedSubjectOption && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    {selectedSubjectOption.subjectName} ({selectedSubjectOption.className} -{" "}
                    {selectedSubjectOption.sectionName})
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="text-slate-600">
                    Max Marks:{" "}
                    <strong className="text-slate-900">{selectedSubjectOption.maxMarks}</strong>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="text-slate-600">
                    Pass Marks:{" "}
                    <strong className="text-slate-900">{selectedSubjectOption.passMarks}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Submission State:</span>
                  {renderStatusBadge(selectedSubjectOption.status)}
                </div>
              </div>
            )}
          </div>

          {/* Returned for Correction Alert Banner */}
          {roster?.workflow.status === "RETURNED" && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 shadow-xs">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <strong className="font-bold text-rose-900">Returned for Correction:</strong>
                <p className="mt-0.5 text-rose-700">
                  {roster.workflow.reviewNotes ||
                    "Please review and rectify student marks before re-submitting."}
                </p>
              </div>
            </div>
          )}

          {/* User Messages */}
          {rosterMessage && (
            <div
              className={`rounded-2xl p-4 text-xs font-medium shadow-xs ${
                rosterMessage.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {rosterMessage.text}
            </div>
          )}

          {/* Student Marks Table */}
          {loadingRoster ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
              <div className="text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs text-slate-500">Loading student marks roster...</p>
              </div>
            </div>
          ) : !roster ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              Please select an examination and subject to view the marks entry register.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Student Marks Register ({roster.students.length} Enrolled)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter score between 0 and {roster.config.maxMarks}. Toggle absent or exempt
                    status if student did not attempt.
                  </p>
                </div>

                {/* Status Indicator */}
                {!roster.workflow.isEditable && (
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    Locked for Editing ({roster.workflow.status})
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Admission No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3 text-center">
                        Marks (Max {roster.config.maxMarks})
                      </th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Remarks / Feedback</th>
                      <th className="px-4 py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.students.map((student) => {
                      const item = marksMap[student.studentId] || {
                        marks: "",
                        isAbsent: false,
                        isExempt: false,
                        remarks: "",
                      };
                      const parsedMarks = parseFloat(item.marks);
                      const isOutOfRange =
                        !item.isAbsent &&
                        !item.isExempt &&
                        item.marks !== "" &&
                        (isNaN(parsedMarks) ||
                          parsedMarks < 0 ||
                          parsedMarks > roster.config.maxMarks);

                      let resultBadge = null;
                      if (item.isAbsent) {
                        resultBadge = (
                          <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            ABSENT
                          </span>
                        );
                      } else if (item.isExempt) {
                        resultBadge = (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            EXEMPT
                          </span>
                        );
                      } else if (item.marks !== "" && !isNaN(parsedMarks)) {
                        if (parsedMarks >= roster.config.passMarks) {
                          resultBadge = (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              PASS
                            </span>
                          );
                        } else {
                          resultBadge = (
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              FAIL
                            </span>
                          );
                        }
                      } else {
                        resultBadge = (
                          <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            UNMARKED
                          </span>
                        );
                      }

                      return (
                        <tr key={student.studentId} className="transition hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-medium text-slate-500">
                            {student.rollNumber || "-"}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-600">
                            {student.admissionNumber}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={roster.config.maxMarks}
                              step="0.5"
                              disabled={
                                !roster.workflow.isEditable || item.isAbsent || item.isExempt
                              }
                              value={item.marks}
                              onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                              placeholder={
                                item.isAbsent ? "ABSENT" : item.isExempt ? "EXEMPT" : "-"
                              }
                              className={`w-24 rounded-lg border px-2.5 py-1 text-center text-xs font-bold focus:outline-hidden disabled:bg-slate-100 ${
                                isOutOfRange
                                  ? "border-rose-500 bg-rose-50 text-rose-900 focus:border-rose-600"
                                  : "border-slate-300 bg-white text-slate-900 focus:border-blue-500"
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={!roster.workflow.isEditable}
                                onClick={() => handleAbsentToggle(student.studentId)}
                                className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                  item.isAbsent
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                disabled={!roster.workflow.isEditable}
                                onClick={() => handleExemptToggle(student.studentId)}
                                className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                  item.isExempt
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                Exempt
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              disabled={!roster.workflow.isEditable}
                              value={item.remarks}
                              onChange={(e) =>
                                handleRemarksChange(student.studentId, e.target.value)
                              }
                              placeholder="Optional remarks..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 placeholder-slate-300 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-50"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">{resultBadge}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action Footer */}
              {roster.workflow.isEditable && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row">
                  <div className="text-xs text-slate-500">
                    Make sure to save drafts periodically. Submitting will send the register for
                    administrator approval.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingDraft || submittingMarks}
                      onClick={handleSaveDraft}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingDraft ? "Saving..." : "Save Draft"}
                    </button>

                    <button
                      type="button"
                      disabled={savingDraft || submittingMarks}
                      onClick={handleSubmitForReview}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {submittingMarks ? "Submitting..." : "Submit for Review"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 3: Admin Review & Approvals                                      */}
      {/* ==================================================================== */}
      {activeTab === "reviews" && isAdmin && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900">
              Marks Submissions Pending Review & Approval
            </h3>
            <p className="text-xs text-slate-500">
              Examine subject registers submitted by faculty. Review completeness, approve for
              publication, or return with specific correction notes.
            </p>
          </div>

          {currentExam?.sectionSubjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              No subject marks submissions recorded yet for this examination.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentExam?.sectionSubjects.map((ss) => {
                const classMatch = classes.find((c) =>
                  c.sections.some((s) => s.id === ss.sectionId)
                );
                const sectionMatch = classMatch?.sections.find((s) => s.id === ss.sectionId);
                const subjectMatch = classMatch?.subjects.find((sub) => sub.id === ss.subjectId);

                return (
                  <div
                    key={ss.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            {classMatch?.name} - {sectionMatch?.name}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900">
                            {subjectMatch?.name}
                          </h4>
                        </div>
                        {renderStatusBadge(ss.status)}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const opt = assignedSubjects.find(
                            (a) => a.sectionId === ss.sectionId && a.subjectId === ss.subjectId
                          );
                          if (opt) {
                            setSelectedSubjectOption(opt);
                            setActiveTab("marks");
                          }
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Roster
                      </button>

                      {ss.status === "SUBMITTED" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={processingReview}
                            onClick={() => {
                              setReturnItem({
                                examId: currentExam.id,
                                sectionId: ss.sectionId,
                                subjectId: ss.subjectId,
                                subjectName: subjectMatch?.name || "Subject",
                              });
                              setShowReturnModal(true);
                            }}
                            className="cursor-pointer rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          >
                            Return
                          </button>

                          <button
                            type="button"
                            disabled={processingReview}
                            onClick={() =>
                              handleApproveSubmission(currentExam.id, ss.sectionId, ss.subjectId)
                            }
                            className="cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 4: Results & Reports                                              */}
      {/* ==================================================================== */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {loadingReports ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Loading exam reports and performance metrics...
              </p>
            </div>
          ) : reportsData ? (
            <>
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {reportsData.exam.name}
                      </h2>
                      {renderStatusBadge(reportsData.exam.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Official result aggregation, subject pass rates, and administrative mark
                      audits.
                    </p>
                  </div>

                  {isAdmin && reportsData.exam.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setPublishingExamId(reportsData.exam.id);
                        setShowPublishModal(true);
                      }}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Publish Examination Results
                    </button>
                  )}
                </div>

                {/* Progress Summary Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">
                      Submissions Progress
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">
                      {reportsData.completion.percentage}%
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {reportsData.completion.completed} / {reportsData.completion.totalExpected}{" "}
                      completed
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">
                      Students Evaluated
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">
                      {reportsData.studentSummaries.length}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Active enrollments</div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Pass Rate</div>
                    <div className="mt-1 text-2xl font-black text-emerald-600">
                      {reportsData.studentSummaries.length > 0
                        ? Math.round(
                            (reportsData.studentSummaries.filter((s) => s.overallStatus === "PASS")
                              .length /
                              reportsData.studentSummaries.length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Overall threshold met</div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">
                      Subjects Configured
                    </div>
                    <div className="mt-1 text-2xl font-black text-blue-600">
                      {reportsData.subjectSummaries.length}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Across all classes</div>
                  </div>
                </div>
              </div>

              {/* Subject Performance Summary Table */}
              {reportsData.subjectSummaries.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Subject-Wise Performance Overview
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-3">Class & Section</th>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3 text-center">Appeared</th>
                          <th className="px-4 py-3 text-center">Absent</th>
                          <th className="px-4 py-3 text-center">Passed</th>
                          <th className="px-4 py-3 text-center">Failed</th>
                          <th className="px-4 py-3 text-center">Pass Rate</th>
                          <th className="px-4 py-3 text-center">Avg / Highest</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportsData.subjectSummaries.map((ss, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {ss.className} - {ss.sectionName}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">{ss.subjectName}</td>
                            <td className="px-4 py-3 text-center font-mono">{ss.appeared}</td>
                            <td className="px-4 py-3 text-center font-mono text-rose-600">
                              {ss.absent}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-emerald-600">
                              {ss.passed}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-rose-600">
                              {ss.failed}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-900">
                              {ss.passPercentage}%
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-slate-600">
                              {ss.averageMarks} / {ss.highestMarks}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Student Exam Result Summaries */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Student Examination Result Summaries ({reportsData.studentSummaries.length})
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={reportStudentQuery}
                      onChange={(e) => setReportStudentQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Admission No</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Class & Section</th>
                        <th className="px-4 py-3 text-center">Score / Total</th>
                        <th className="px-4 py-3 text-center">Percentage</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        {isAdmin && <th className="px-4 py-3 text-right">Audit Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportsData.studentSummaries
                        .filter(
                          (s) =>
                            reportStudentQuery === "" ||
                            s.name.toLowerCase().includes(reportStudentQuery.toLowerCase()) ||
                            s.admissionNumber
                              .toLowerCase()
                              .includes(reportStudentQuery.toLowerCase())
                        )
                        .map((student) => (
                          <tr key={student.studentId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-medium text-slate-600">
                              {student.admissionNumber}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {student.className} - {student.sectionName}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                              {student.totalMarksObtained} / {student.totalMaxMarks}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                              {student.percentage}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {student.overallStatus === "PASS" ? (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                  PASS
                                </span>
                              ) : student.overallStatus === "FAIL" ? (
                                <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                                  FAIL
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                  INCOMPLETE
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right">
                                {student.results.length > 0 &&
                                  reportsData.exam.status === "PUBLISHED" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const firstResult = student.results[0];
                                        setCorrectionTarget({
                                          markId: student.studentId, // Will resolve student mark record
                                          studentName: student.name,
                                          subjectName: firstResult.subjectName,
                                          currentMarks: firstResult.marksObtained,
                                          isAbsent: firstResult.isAbsent,
                                          maxMarks: firstResult.maxMarks,
                                          examId: reportsData.exam.id,
                                        });
                                        setNewCorrectedMarks(
                                          firstResult.marksObtained !== null
                                            ? String(firstResult.marksObtained)
                                            : ""
                                        );
                                        setNewCorrectedAbsent(firstResult.isAbsent);
                                        setShowCorrectionModal(true);
                                      }}
                                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      Correct Mark
                                    </button>
                                  )}
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                No examination selected or reports unavailable
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Select an examination from the dropdown above to view aggregated performance and
                completion statistics.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal: Create Examination                                            */}
      {/* ==================================================================== */}
      <CreateExamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        schoolSlug={schoolSlug}
        activeAcademicYearId={activeAcademicYear?.id}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchExams();
        }}
      />

      {/* ==================================================================== */}
      {/* Modal: Configure Participating Classes & Subject Rules               */}
      {/* ==================================================================== */}
      {configuringExam && (
        <ConfigureExamModal
          isOpen={showConfigureModal}
          onClose={() => {
            setShowConfigureModal(false);
            setConfiguringExam(null);
          }}
          schoolSlug={schoolSlug}
          exam={configuringExam}
          classes={classes}
          onSuccess={() => {
            setShowConfigureModal(false);
            setConfiguringExam(null);
            fetchExams();
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* Modal: Return Submission with Reason                                 */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Return Marks for Correction"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide a mandatory reason or instructions for the teacher to rectify. The subject
            register status will change to <strong>RETURNED</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Correction Reason (min 5 characters)
            </label>
            <textarea
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Please re-check student 1 answer booklet question 4..."
              className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowReturnModal(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={returnReason.trim().length < 5 || processingReview}
              onClick={handleReturnSubmission}
              className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {processingReview ? "Returning..." : "Confirm Return"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* Modal: Publish Results Confirmation                                  */}
      {/* ==================================================================== */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publish Examination Results"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <strong className="font-bold text-amber-900">Irreversible Publication Action:</strong>
              <p className="mt-0.5">
                Publishing locks all submitted marks and opens report analytics. Future
                modifications will require an audited administrative correction.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublishResults}
              className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish Results Now"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* Modal: Administrative Correction                                     */}
      {/* ==================================================================== */}
      {correctionTarget && (
        <Modal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          title="Audited Administrative Mark Correction"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              <div>
                Student: <strong>{correctionTarget.studentName}</strong>
              </div>
              <div>
                Subject: <strong>{correctionTarget.subjectName}</strong>
              </div>
              <div>
                Current Mark:{" "}
                <strong>
                  {correctionTarget.isAbsent
                    ? "ABSENT"
                    : (correctionTarget.currentMarks ?? "UNMARKED")}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                New Marks (Max {correctionTarget.maxMarks})
              </label>
              <input
                type="number"
                min="0"
                max={correctionTarget.maxMarks}
                step="0.5"
                disabled={newCorrectedAbsent}
                value={newCorrectedMarks}
                onChange={(e) => setNewCorrectedMarks(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="correctAbsentCheck"
                checked={newCorrectedAbsent}
                onChange={(e) => {
                  setNewCorrectedAbsent(e.target.checked);
                  if (e.target.checked) setNewCorrectedMarks("");
                }}
                className="rounded border-slate-300 text-blue-600"
              />
              <label htmlFor="correctAbsentCheck" className="text-xs font-medium text-slate-700">
                Mark Student as Absent
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Mandatory Correction Reason (min 5 characters)
              </label>
              <textarea
                rows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Scrutiny committee re-evaluation..."
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={correctionReason.trim().length < 5 || savingCorrection}
                onClick={handleApplyCorrection}
                className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCorrection ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// Subcomponent: Create Examination Modal
// ============================================================================

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolSlug: string;
  activeAcademicYearId?: string;
  onSuccess: () => void;
}

function CreateExamModal({
  isOpen,
  onClose,
  schoolSlug,
  activeAcademicYearId,
  onSuccess,
}: CreateExamModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ExamType>("MID_TERM");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Examination name is required.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          startDate,
          endDate,
          academicYearId: activeAcademicYearId,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setName("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        onSuccess();
      } else {
        setError(json.error?.message || "Failed to create examination.");
      }
    } catch {
      setError("Network error creating examination.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Examination" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700">Examination Title</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mid-Term Examination 2026-27"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Examination Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExamType)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="UNIT_TEST">Unit Test / Formative Assessment</option>
            <option value="MID_TERM">Mid-Term Examination</option>
            <option value="FINAL">Final / Annual Assessment</option>
            <option value="QUARTERLY">Quarterly Assessment</option>
            <option value="PRACTICAL">Practical / Lab Exam</option>
            <option value="OTHER">Other Custom Examination</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">End Date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Description (Optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Guidelines, syllabus scope, or notes..."
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Examination"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// Subcomponent: Configure Classes & Subjects Modal
// ============================================================================

interface ConfigureExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolSlug: string;
  exam: ExamSummary;
  classes: Array<{
    id: string;
    name: string;
    sections: Array<{ id: string; name: string }>;
    subjects: Array<{ id: string; name: string; code: string | null; classId: string | null }>;
  }>;
  onSuccess: () => void;
}

function ConfigureExamModal({
  isOpen,
  onClose,
  schoolSlug,
  exam,
  classes,
  onSuccess,
}: ConfigureExamModalProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    exam.classes.map((c) => c.class.id)
  );

  // Subject configs: classId -> subjectId -> {maxMarks, passMarks}
  const [subjectConfigs, setSubjectConfigs] = useState<
    Record<string, { maxMarks: number; passMarks: number }>
  >(() => {
    const map: Record<string, { maxMarks: number; passMarks: number }> = {};
    for (const sc of exam.subjectConfigs) {
      map[`${sc.class.id}:${sc.subject.id}`] = {
        maxMarks: sc.maxMarks,
        passMarks: sc.passMarks,
      };
    }
    return map;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleConfigChange = (
    classId: string,
    subjectId: string,
    field: "maxMarks" | "passMarks",
    value: number
  ) => {
    const key = `${classId}:${subjectId}`;
    setSubjectConfigs((prev) => ({
      ...prev,
      [key]: {
        maxMarks: field === "maxMarks" ? value : (prev[key]?.maxMarks ?? 100),
        passMarks: field === "passMarks" ? value : (prev[key]?.passMarks ?? 40),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedClassIds.length === 0) {
      setError("Please select at least one participating class.");
      return;
    }

    const configsArray: Array<{
      classId: string;
      subjectId: string;
      maxMarks: number;
      passMarks: number;
    }> = [];

    for (const classId of selectedClassIds) {
      const cls = classes.find((c) => c.id === classId);
      if (!cls) continue;

      for (const sub of cls.subjects) {
        const key = `${classId}:${sub.id}`;
        const item = subjectConfigs[key] || { maxMarks: 100, passMarks: 40 };

        if (item.passMarks > item.maxMarks) {
          setError(
            `Passing marks (${item.passMarks}) cannot exceed maximum marks (${item.maxMarks}) for '${sub.name}'.`
          );
          return;
        }

        configsArray.push({
          classId,
          subjectId: sub.id,
          maxMarks: item.maxMarks,
          passMarks: item.passMarks,
        });
      }
    }

    if (configsArray.length === 0) {
      setError("Selected classes must have at least one subject configured.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/exams/${exam.id}/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classIds: selectedClassIds,
          subjectConfigs: configsArray,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(json.error?.message || "Failed to save configuration.");
      }
    } catch {
      setError("Network error saving configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configure ${exam.name}`} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        {/* Participating Classes Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700">
            1. Select Participating Classes
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {classes.map((cls) => {
              const isSelected = selectedClassIds.includes(cls.id);
              return (
                <button
                  type="button"
                  key={cls.id}
                  onClick={() => handleClassToggle(cls.id)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cls.name} ({cls.sections.length} Sections)
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject Rules Configuration */}
        <div>
          <label className="block text-xs font-bold text-slate-700">
            2. Configure Subject Maximum & Passing Marks Rules
          </label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Define max marks and pass marks for subjects in each selected class.
          </p>

          <div className="mt-3 max-h-72 space-y-4 overflow-y-auto">
            {selectedClassIds.map((classId) => {
              const cls = classes.find((c) => c.id === classId);
              if (!cls) return null;

              return (
                <div
                  key={cls.id}
                  className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                >
                  <h4 className="text-xs font-extrabold text-slate-800">{cls.name} Subjects</h4>

                  {cls.subjects.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      No subjects configured for this class.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cls.subjects.map((sub) => {
                        const key = `${cls.id}:${sub.id}`;
                        const currentConfig = subjectConfigs[key] || {
                          maxMarks: 100,
                          passMarks: 40,
                        };

                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-2.5"
                          >
                            <span className="text-xs font-bold text-slate-800">{sub.name}</span>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] font-medium text-slate-500">
                                  Max Marks:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentConfig.maxMarks}
                                  onChange={(e) =>
                                    handleConfigChange(
                                      cls.id,
                                      sub.id,
                                      "maxMarks",
                                      parseFloat(e.target.value) || 100
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 p-1 text-center text-xs font-bold"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] font-medium text-slate-500">
                                  Pass Marks:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentConfig.passMarks}
                                  onChange={(e) =>
                                    handleConfigChange(
                                      cls.id,
                                      sub.id,
                                      "passMarks",
                                      parseFloat(e.target.value) || 40
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 p-1 text-center text-xs font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
