"use client";

import React, { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import type {
  ExamStatus,
  WorkflowStatus,
  ExamSummary,
  TeacherAssignment,
  RosterData,
  ReportsData,
  ExamClientProps,
} from "./ExamTypes";

export function useExamController({
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

  return {
    schoolSlug,
    schoolName,
    userRole,
    activeAcademicYear,
    classes,
    isAdmin,
    isTeacher,
    activeTab,
    setActiveTab,
    exams,
    setExams,
    loadingExams,
    setLoadingExams,
    examStatusFilter,
    setExamStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedExamId,
    setSelectedExamId,
    assignedSubjects,
    setAssignedSubjects,
    selectedSubjectOption,
    setSelectedSubjectOption,
    roster,
    setRoster,
    loadingRoster,
    setLoadingRoster,
    marksMap,
    setMarksMap,
    savingDraft,
    setSavingDraft,
    submittingMarks,
    setSubmittingMarks,
    rosterMessage,
    setRosterMessage,
    showCreateModal,
    setShowCreateModal,
    showConfigureModal,
    setShowConfigureModal,
    configuringExam,
    setConfiguringExam,
    showReturnModal,
    setShowReturnModal,
    returnItem,
    setReturnItem,
    returnReason,
    setReturnReason,
    processingReview,
    setProcessingReview,
    showPublishModal,
    setShowPublishModal,
    publishingExamId,
    setPublishingExamId,
    publishing,
    setPublishing,
    showCorrectionModal,
    setShowCorrectionModal,
    correctionTarget,
    setCorrectionTarget,
    newCorrectedMarks,
    setNewCorrectedMarks,
    newCorrectedAbsent,
    setNewCorrectedAbsent,
    correctionReason,
    setCorrectionReason,
    savingCorrection,
    setSavingCorrection,
    reportsData,
    setReportsData,
    loadingReports,
    setLoadingReports,
    reportStudentQuery,
    setReportStudentQuery,
    fetchExams,
    fetchAssignedSubjects,
    fetchMarksRoster,
    fetchReports,
    startTabTransition,
    handleTabSwitch,
    handleTabHover,
    handleMarkChange,
    handleAbsentToggle,
    handleExemptToggle,
    handleRemarksChange,
    handleSaveDraft,
    handleSubmitForReview,
    handleApproveSubmission,
    handleReturnSubmission,
    handlePublishResults,
    handleApplyCorrection,
    filteredExams,
    currentExam,
    renderStatusBadge,
  };
}

export type ExamController = ReturnType<typeof useExamController>;
