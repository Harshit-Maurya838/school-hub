// Exams: subject-wise marks rosters, drafts and submission.
import { prisma } from "@/lib/prisma";
import {
  AuthenticatedUser,
  assertSchoolAccess,
  assertCanEnterSubjectMarks,
  getTeacherActiveAssignments,
} from "@/modules/auth";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { ExamStatus, ExamType, ExamMarksSubmissionStatus } from "@/generated/prisma/enums";

// ============================================================================
// Subject-Wise Marks Entry (TEACHER & SCHOOL_ADMIN)
// ============================================================================

export interface TeacherAssignedSubjectOption {
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
  status: ExamMarksSubmissionStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  isEditable: boolean;
}

export async function getTeacherAssignedExamSubjects(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string
): Promise<TeacherAssignedSubjectOption[]> {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to view examination marks.");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      classes: {
        include: {
          class: {
            include: {
              sections: true,
            },
          },
        },
      },
      subjectConfigs: {
        include: {
          subject: true,
          class: true,
        },
      },
      sectionSubjects: true,
    },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  // If TEACHER, fetch active assignments
  let teacherAssignments = null;
  if (user.role === "TEACHER") {
    teacherAssignments = await getTeacherActiveAssignments(schoolId, user.id, exam.academicYearId);
    if (!teacherAssignments) {
      return [];
    }
  }

  const results: TeacherAssignedSubjectOption[] = [];

  for (const examClass of exam.classes) {
    const classSections = examClass.class.sections;
    const classConfigs = exam.subjectConfigs.filter((cfg) => cfg.classId === examClass.classId);

    for (const section of classSections) {
      for (const config of classConfigs) {
        // Teacher assignment check:
        // Teacher must have active SubjectTeacherAssignment for this exact section & subject
        if (user.role === "TEACHER") {
          const isAssigned = teacherAssignments?.subjectAssignments.some(
            (sa) => sa.sectionId === section.id && sa.subjectId === config.subjectId
          );
          if (!isAssigned) {
            continue; // Skip combinations teacher is not assigned to
          }
        }

        const sectionSubject = exam.sectionSubjects.find(
          (ss) => ss.sectionId === section.id && ss.subjectId === config.subjectId
        );

        const currentStatus = sectionSubject?.status ?? ExamMarksSubmissionStatus.NOT_STARTED;
        const isExamOpen = exam.status === ExamStatus.MARKS_ENTRY;
        const isTeacherAllowedToEdit =
          isExamOpen &&
          (currentStatus === ExamMarksSubmissionStatus.NOT_STARTED ||
            currentStatus === ExamMarksSubmissionStatus.DRAFT ||
            currentStatus === ExamMarksSubmissionStatus.RETURNED);

        const isEditable =
          user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN"
            ? exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.CANCELLED
            : isTeacherAllowedToEdit;

        results.push({
          examId: exam.id,
          examName: exam.name,
          examStatus: exam.status,
          classId: examClass.class.id,
          className: examClass.class.name,
          sectionId: section.id,
          sectionName: section.name,
          subjectId: config.subject.id,
          subjectName: config.subject.name,
          maxMarks: config.maxMarks,
          passMarks: config.passMarks,
          status: currentStatus,
          submittedAt: sectionSubject?.submittedAt?.toISOString() ?? null,
          reviewedAt: sectionSubject?.reviewedAt?.toISOString() ?? null,
          reviewNotes: sectionSubject?.reviewNotes ?? null,
          isEditable,
        });
      }
    }
  }

  return results;
}

export interface ExamMarksRosterStudent {
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

export interface ExamMarksRosterData {
  exam: {
    id: string;
    name: string;
    type: ExamType;
    status: ExamStatus;
  };
  section: {
    id: string;
    name: string;
    classId: string;
    className: string;
  };
  subject: {
    id: string;
    name: string;
    code: string | null;
  };
  config: {
    maxMarks: number;
    passMarks: number;
  };
  workflow: {
    status: ExamMarksSubmissionStatus;
    submittedAt: string | null;
    submittedBy: { id: string; name: string } | null;
    reviewedAt: string | null;
    reviewedBy: { id: string; name: string } | null;
    reviewNotes: string | null;
    isEditable: boolean;
  };
  students: ExamMarksRosterStudent[];
}

export async function getExamMarksRoster(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  sectionId: string,
  subjectId: string
): Promise<ExamMarksRosterData> {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to access marks rosters.");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
  });
  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    include: { class: true },
  });
  if (!section) {
    throw new NotFoundError(`Section '${sectionId}' not found.`);
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
  });
  if (!subject) {
    throw new NotFoundError(`Subject '${subjectId}' not found.`);
  }

  // Enforce teacher assignment access if user is teacher
  if (user.role === "TEACHER") {
    await assertCanEnterSubjectMarks(user, schoolId, sectionId, subjectId, exam.academicYearId);
  }

  // Check subject config for this class in this exam
  const config = await prisma.examSubjectConfig.findUnique({
    where: {
      examId_classId_subjectId: {
        examId: exam.id,
        classId: section.classId,
        subjectId: subject.id,
      },
    },
  });

  if (!config) {
    throw new BadRequestError(
      `Subject '${subject.name}' is not configured for class '${section.class.name}' in this examination.`
    );
  }

  // Get or find workflow state
  const sectionSubject = await prisma.examSectionSubject.findUnique({
    where: {
      examId_sectionId_subjectId: {
        examId: exam.id,
        sectionId: section.id,
        subjectId: subject.id,
      },
    },
    include: {
      submittedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  const workflowStatus = sectionSubject?.status ?? ExamMarksSubmissionStatus.NOT_STARTED;

  // Determine if editable
  const isExamOpen = exam.status === ExamStatus.MARKS_ENTRY;
  const isTeacherEditable =
    isExamOpen &&
    (workflowStatus === ExamMarksSubmissionStatus.NOT_STARTED ||
      workflowStatus === ExamMarksSubmissionStatus.DRAFT ||
      workflowStatus === ExamMarksSubmissionStatus.RETURNED);

  const isEditable =
    user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN"
      ? exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.CANCELLED
      : isTeacherEditable;

  // Fetch active enrollments in this section for this academic year
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolId,
      sectionId: section.id,
      academicYearId: exam.academicYearId,
      status: "ACTIVE",
      student: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      student: true,
    },
    orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
  });

  // Fetch existing marks records for this exam and subject
  const existingMarks = await prisma.studentExamMark.findMany({
    where: {
      schoolId,
      examId: exam.id,
      subjectId: subject.id,
      sectionId: section.id,
    },
  });

  const marksByStudentId = new Map(existingMarks.map((m) => [m.studentId, m]));

  const students: ExamMarksRosterStudent[] = enrollments.map((enr) => {
    const mark = marksByStudentId.get(enr.studentId);
    let status: "ENTERED" | "ABSENT" | "EXEMPT" | "UNMARKED" = "UNMARKED";
    if (mark) {
      if (mark.isAbsent) status = "ABSENT";
      else if (mark.isExempt) status = "EXEMPT";
      else if (mark.marksObtained !== null) status = "ENTERED";
    }

    return {
      studentId: enr.student.id,
      name: enr.student.name,
      admissionNumber: enr.student.admissionNumber,
      rollNumber: enr.rollNumber,
      enrollmentId: enr.id,
      markId: mark?.id ?? null,
      marksObtained: mark?.marksObtained ?? null,
      isAbsent: mark?.isAbsent ?? false,
      isExempt: mark?.isExempt ?? false,
      remarks: mark?.remarks ?? null,
      status,
    };
  });

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      status: exam.status,
    },
    section: {
      id: section.id,
      name: section.name,
      classId: section.class.id,
      className: section.class.name,
    },
    subject: {
      id: subject.id,
      name: subject.name,
      code: subject.code,
    },
    config: {
      maxMarks: config.maxMarks,
      passMarks: config.passMarks,
    },
    workflow: {
      status: workflowStatus,
      submittedAt: sectionSubject?.submittedAt?.toISOString() ?? null,
      submittedBy: sectionSubject?.submittedBy
        ? { id: sectionSubject.submittedBy.id, name: sectionSubject.submittedBy.name }
        : null,
      reviewedAt: sectionSubject?.reviewedAt?.toISOString() ?? null,
      reviewedBy: sectionSubject?.reviewedBy
        ? { id: sectionSubject.reviewedBy.id, name: sectionSubject.reviewedBy.name }
        : null,
      reviewNotes: sectionSubject?.reviewNotes ?? null,
      isEditable,
    },
    students,
  };
}

export interface StudentMarkEntryInput {
  studentId: string;
  marksObtained?: number | null;
  isAbsent?: boolean;
  isExempt?: boolean;
  remarks?: string;
}

export interface SaveMarksDraftInput {
  entries: StudentMarkEntryInput[];
}

export async function saveMarksDraft(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  sectionId: string,
  subjectId: string,
  input: SaveMarksDraftInput
) {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to enter examination marks.");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
  });
  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  // Teacher authorization check
  if (user.role === "TEACHER") {
    await assertCanEnterSubjectMarks(user, schoolId, sectionId, subjectId, exam.academicYearId);
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
  });
  if (!section) {
    throw new NotFoundError(`Section '${sectionId}' not found.`);
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
  });
  if (!subject) {
    throw new NotFoundError(`Subject '${subjectId}' not found.`);
  }

  const config = await prisma.examSubjectConfig.findUnique({
    where: {
      examId_classId_subjectId: {
        examId: exam.id,
        classId: section.classId,
        subjectId: subject.id,
      },
    },
  });

  if (!config) {
    throw new BadRequestError(`Subject is not configured for this class in this examination.`);
  }

  // Check workflow status
  const existingSectionSubject = await prisma.examSectionSubject.findUnique({
    where: {
      examId_sectionId_subjectId: {
        examId: exam.id,
        sectionId: section.id,
        subjectId: subject.id,
      },
    },
  });

  if (user.role === "TEACHER") {
    if (exam.status !== ExamStatus.MARKS_ENTRY) {
      throw new BadRequestError(
        `Marks entry is currently closed for this examination (Status: ${exam.status}).`
      );
    }

    if (
      existingSectionSubject &&
      existingSectionSubject.status !== ExamMarksSubmissionStatus.NOT_STARTED &&
      existingSectionSubject.status !== ExamMarksSubmissionStatus.DRAFT &&
      existingSectionSubject.status !== ExamMarksSubmissionStatus.RETURNED
    ) {
      throw new BadRequestError(
        `Marks have already been submitted (${existingSectionSubject.status}) and cannot be edited unless returned for correction.`
      );
    }
  }

  // Validate active enrollments
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      schoolId,
      sectionId: section.id,
      academicYearId: exam.academicYearId,
      status: "ACTIVE",
    },
    select: { id: true, studentId: true },
  });

  const enrollmentMap = new Map(activeEnrollments.map((e) => [e.studentId, e.id]));

  // Validate entries
  const validatedEntries: Array<{
    studentId: string;
    enrollmentId: string;
    marksObtained: number | null;
    isAbsent: boolean;
    isExempt: boolean;
    remarks: string | null;
  }> = [];

  for (const entry of input.entries || []) {
    const enrollmentId = enrollmentMap.get(entry.studentId);
    if (!enrollmentId) {
      throw new BadRequestError(
        `Student '${entry.studentId}' is not actively enrolled in section '${sectionId}' for this academic year.`
      );
    }

    const isAbsent = Boolean(entry.isAbsent);
    const isExempt = Boolean(entry.isExempt);

    let marksObtained: number | null = null;
    if (
      !isAbsent &&
      !isExempt &&
      entry.marksObtained !== undefined &&
      entry.marksObtained !== null
    ) {
      const num = Number(entry.marksObtained);
      if (isNaN(num)) {
        throw new BadRequestError(
          `Marks obtained must be a valid number for student '${entry.studentId}'.`
        );
      }
      if (num < 0) {
        throw new BadRequestError(
          `Marks obtained cannot be negative for student '${entry.studentId}'.`
        );
      }
      if (num > config.maxMarks) {
        throw new BadRequestError(
          `Marks obtained (${num}) cannot exceed maximum marks (${config.maxMarks}) for student '${entry.studentId}'.`
        );
      }
      marksObtained = num;
    }

    validatedEntries.push({
      studentId: entry.studentId,
      enrollmentId,
      marksObtained,
      isAbsent,
      isExempt,
      remarks: entry.remarks?.trim() || null,
    });
  }

  // Execute database transaction
  await prisma.$transaction(async (tx) => {
    // 1. Ensure ExamSectionSubject exists in DRAFT or RETURNED status
    await tx.examSectionSubject.upsert({
      where: {
        examId_sectionId_subjectId: {
          examId: exam.id,
          sectionId: section.id,
          subjectId: subject.id,
        },
      },
      update: {
        status:
          existingSectionSubject?.status === ExamMarksSubmissionStatus.RETURNED
            ? ExamMarksSubmissionStatus.RETURNED
            : ExamMarksSubmissionStatus.DRAFT,
      },
      create: {
        schoolId,
        examId: exam.id,
        sectionId: section.id,
        subjectId: subject.id,
        status: ExamMarksSubmissionStatus.DRAFT,
      },
    });

    // 2. Upsert each student mark record
    for (const item of validatedEntries) {
      await tx.studentExamMark.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: exam.id,
            studentId: item.studentId,
            subjectId: subject.id,
          },
        },
        update: {
          marksObtained: item.marksObtained,
          isAbsent: item.isAbsent,
          isExempt: item.isExempt,
          remarks: item.remarks,
          updatedById: user.id,
        },
        create: {
          schoolId,
          examId: exam.id,
          studentId: item.studentId,
          enrollmentId: item.enrollmentId,
          sectionId: section.id,
          subjectId: subject.id,
          marksObtained: item.marksObtained,
          isAbsent: item.isAbsent,
          isExempt: item.isExempt,
          remarks: item.remarks,
          createdById: user.id,
        },
      });
    }
  });

  await logAuditEvent({
    action: "MARKS_DRAFT_SAVED",
    entityType: "ExamSectionSubject",
    entityId: `${exam.id}:${section.id}:${subject.id}`,
    schoolId,
    userId: user.id,
    details: {
      examId: exam.id,
      sectionId: section.id,
      subjectId: subject.id,
      entriesCount: validatedEntries.length,
    },
  });

  return getExamMarksRoster(schoolId, user, exam.id, section.id, subject.id);
}

export async function submitMarks(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  sectionId: string,
  subjectId: string,
  input?: SaveMarksDraftInput
) {
  // Save draft first if entries provided
  if (input?.entries && input.entries.length > 0) {
    await saveMarksDraft(schoolId, user, examId, sectionId, subjectId, input);
  }

  const roster = await getExamMarksRoster(schoolId, user, examId, sectionId, subjectId);

  // Validate completion: All enrolled students must have a recorded mark, be marked absent, or be exempt
  const uncompletedStudents = roster.students.filter((s) => s.status === "UNMARKED");
  if (uncompletedStudents.length > 0) {
    throw new BadRequestError(
      `Cannot submit incomplete marks register. ${uncompletedStudents.length} student(s) remain unmarked.`
    );
  }

  // Transition workflow state to SUBMITTED
  const updatedSectionSubject = await prisma.examSectionSubject.update({
    where: {
      examId_sectionId_subjectId: {
        examId,
        sectionId,
        subjectId,
      },
    },
    data: {
      status: ExamMarksSubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
      submittedById: user.id,
    },
  });

  await logAuditEvent({
    action: "MARKS_SUBMITTED",
    entityType: "ExamSectionSubject",
    entityId: `${examId}:${sectionId}:${subjectId}`,
    schoolId,
    userId: user.id,
    details: {
      examId,
      sectionId,
      subjectId,
      studentCount: roster.students.length,
    },
  });

  return updatedSectionSubject;
}
