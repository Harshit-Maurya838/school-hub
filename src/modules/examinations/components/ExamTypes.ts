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

export interface ExamClientProps {
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
