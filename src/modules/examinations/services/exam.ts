import { prisma } from "@/lib/prisma";
import {
  AuthenticatedUser,
  assertSchoolAccess,
  assertCanManageExams,
  assertCanEnterSubjectMarks,
  assertCanReviewMarks,
  assertCanPublishResults,
  assertCanAdminCorrectMarks,
  getTeacherActiveAssignments,
} from "@/modules/auth";
import { BadRequestError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { ExamStatus, ExamType, ExamMarksSubmissionStatus } from "@/generated/prisma/enums";

// ============================================================================
// Lifecycle & Transition Helpers
// ============================================================================

const VALID_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  DRAFT: [ExamStatus.SCHEDULED, ExamStatus.CANCELLED],
  SCHEDULED: [ExamStatus.MARKS_ENTRY, ExamStatus.DRAFT, ExamStatus.CANCELLED],
  MARKS_ENTRY: [ExamStatus.UNDER_REVIEW, ExamStatus.SCHEDULED, ExamStatus.CANCELLED],
  UNDER_REVIEW: [ExamStatus.PUBLISHED, ExamStatus.MARKS_ENTRY, ExamStatus.CANCELLED],
  PUBLISHED: [], // Terminal lifecycle status. Results are final; modifications only through audited admin corrections.
  CANCELLED: [ExamStatus.DRAFT], // Admin can restore a cancelled exam back to draft
};

export function isValidExamStatusTransition(from: ExamStatus, to: ExamStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function normalizeExamDate(dateInput: string | Date, fieldName = "Date"): Date {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid date provided for '${fieldName}'.`);
  }
  return date;
}

// ============================================================================
// School and Tenant Resolution Helper
// ============================================================================

export async function resolveSchoolForExam(
  schoolSlug: string,
  user: AuthenticatedUser
): Promise<{ id: string; name: string; slug: string }> {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!school) {
    throw new NotFoundError(`School '${schoolSlug}' not found.`);
  }

  assertSchoolAccess(user, school.id);
  return school;
}

// ============================================================================
// Examination CRUD & Lifecycle Management (SCHOOL_ADMIN)
// ============================================================================

export interface CreateExamInput {
  academicYearId?: string;
  name: string;
  type: ExamType;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
}

export async function createExam(
  schoolId: string,
  user: AuthenticatedUser,
  input: CreateExamInput
) {
  assertCanManageExams(user, schoolId);

  const trimmedName = input.name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new ValidationError("Examination name is required (minimum 2 characters).");
  }

  const validTypes: ExamType[] = [
    ExamType.UNIT_TEST,
    ExamType.MID_TERM,
    ExamType.FINAL,
    ExamType.QUARTERLY,
    ExamType.PRACTICAL,
    ExamType.OTHER,
  ];
  if (!validTypes.includes(input.type)) {
    throw new BadRequestError(`Invalid examination type '${input.type}'.`);
  }

  const startDate = normalizeExamDate(input.startDate, "startDate");
  const endDate = normalizeExamDate(input.endDate, "endDate");

  if (startDate > endDate) {
    throw new BadRequestError("Examination start date cannot be later than end date.");
  }

  // Resolve academic year
  let academicYear = null;
  if (input.academicYearId) {
    academicYear = await prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId },
    });
    if (!academicYear) {
      throw new NotFoundError(`Academic year '${input.academicYearId}' not found in this school.`);
    }
  } else {
    academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!academicYear) {
      throw new BadRequestError(
        "No active academic session found. Please activate an academic year."
      );
    }
  }

  // Check name uniqueness within academic year
  const existingExam = await prisma.exam.findFirst({
    where: {
      schoolId,
      academicYearId: academicYear.id,
      name: { equals: trimmedName, mode: "insensitive" },
    },
  });

  if (existingExam) {
    throw new BadRequestError(
      `An examination named '${trimmedName}' already exists in this academic year.`
    );
  }

  const exam = await prisma.exam.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      name: trimmedName,
      type: input.type,
      description: input.description?.trim() || null,
      startDate,
      endDate,
      status: ExamStatus.DRAFT,
      createdById: user.id,
    },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
    },
  });

  await logAuditEvent({
    action: "EXAM_CREATED",
    entityType: "Exam",
    entityId: exam.id,
    schoolId,
    userId: user.id,
    details: {
      examId: exam.id,
      name: exam.name,
      type: exam.type,
      academicYearId: academicYear.id,
      startDate: exam.startDate.toISOString(),
      endDate: exam.endDate.toISOString(),
    },
  });

  return exam;
}

export interface UpdateExamInput {
  name?: string;
  type?: ExamType;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export async function updateExam(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  input: UpdateExamInput
) {
  assertCanManageExams(user, schoolId);

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  if (exam.status === ExamStatus.PUBLISHED) {
    throw new BadRequestError("Cannot modify details of a published examination.");
  }
  if (exam.status === ExamStatus.CANCELLED) {
    throw new BadRequestError("Cannot modify details of a cancelled examination.");
  }

  const updateData: Record<string, unknown> = {
    updatedById: user.id,
  };

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new ValidationError("Examination name must be at least 2 characters.");
    }
    const duplicate = await prisma.exam.findFirst({
      where: {
        schoolId,
        academicYearId: exam.academicYearId,
        name: { equals: trimmed, mode: "insensitive" },
        NOT: { id: exam.id },
      },
    });
    if (duplicate) {
      throw new BadRequestError(`An examination named '${trimmed}' already exists.`);
    }
    updateData.name = trimmed;
  }

  if (input.type !== undefined) {
    updateData.type = input.type;
  }

  if (input.description !== undefined) {
    updateData.description = input.description.trim() || null;
  }

  const newStart = input.startDate
    ? normalizeExamDate(input.startDate, "startDate")
    : exam.startDate;
  const newEnd = input.endDate ? normalizeExamDate(input.endDate, "endDate") : exam.endDate;

  if (newStart > newEnd) {
    throw new BadRequestError("Examination start date cannot be later than end date.");
  }

  if (input.startDate) updateData.startDate = newStart;
  if (input.endDate) updateData.endDate = newEnd;

  const updated = await prisma.exam.update({
    where: { id: exam.id },
    data: updateData,
    include: {
      academicYear: { select: { id: true, name: true } },
    },
  });

  await logAuditEvent({
    action: "EXAM_UPDATED",
    entityType: "Exam",
    entityId: exam.id,
    schoolId,
    userId: user.id,
    details: { changes: updateData },
  });

  return updated;
}

export async function updateExamStatus(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  newStatus: ExamStatus
) {
  assertCanManageExams(user, schoolId);

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      classes: true,
      subjectConfigs: true,
    },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  if (exam.status === newStatus) {
    return exam;
  }

  if (!isValidExamStatusTransition(exam.status, newStatus)) {
    throw new BadRequestError(
      `Invalid lifecycle transition from '${exam.status}' to '${newStatus}'. Allowed transitions: ${
        VALID_TRANSITIONS[exam.status].join(", ") || "none"
      }.`
    );
  }

  // Pre-condition validations
  if (newStatus === ExamStatus.SCHEDULED || newStatus === ExamStatus.MARKS_ENTRY) {
    if (exam.classes.length === 0) {
      throw new BadRequestError(
        "Cannot activate an examination without configuring participating classes."
      );
    }
    if (exam.subjectConfigs.length === 0) {
      throw new BadRequestError(
        "Cannot activate an examination without configuring subject marks rules."
      );
    }
  }

  if (newStatus === ExamStatus.PUBLISHED) {
    return publishExamResults(schoolId, user, examId);
  }

  const updated = await prisma.exam.update({
    where: { id: exam.id },
    data: {
      status: newStatus,
      updatedById: user.id,
    },
  });

  await logAuditEvent({
    action: "EXAM_STATUS_CHANGED",
    entityType: "Exam",
    entityId: exam.id,
    schoolId,
    userId: user.id,
    details: {
      previousStatus: exam.status,
      newStatus,
    },
  });

  return updated;
}

// ============================================================================
// Examination Class and Subject Configuration
// ============================================================================

export interface SubjectMarksConfigInput {
  classId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
}

export interface ConfigureExamInput {
  classIds: string[];
  subjectConfigs: SubjectMarksConfigInput[];
}

export async function configureExamClassesAndSubjects(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  input: ConfigureExamInput
) {
  assertCanManageExams(user, schoolId);

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  if (exam.status === ExamStatus.PUBLISHED) {
    throw new BadRequestError("Cannot modify configuration of a published examination.");
  }

  const uniqueClassIds = Array.from(new Set(input.classIds || []));
  if (uniqueClassIds.length === 0) {
    throw new BadRequestError("At least one participating class must be selected.");
  }

  // Validate classes belong to school
  const validClasses = await prisma.class.findMany({
    where: { id: { in: uniqueClassIds }, schoolId },
    select: { id: true, name: true },
  });

  if (validClasses.length !== uniqueClassIds.length) {
    throw new BadRequestError("One or more selected classes do not belong to this school.");
  }

  if (!input.subjectConfigs || input.subjectConfigs.length === 0) {
    throw new BadRequestError("Subject marks configuration is required.");
  }

  // Validate each subject config
  const validatedConfigs: Array<{
    classId: string;
    subjectId: string;
    maxMarks: number;
    passMarks: number;
  }> = [];

  const seenConfigKeys = new Set<string>();

  for (const item of input.subjectConfigs) {
    const key = `${item.classId}:${item.subjectId}`;
    if (seenConfigKeys.has(key)) {
      throw new BadRequestError(
        `Duplicate subject configuration for class '${item.classId}' and subject '${item.subjectId}'.`
      );
    }
    seenConfigKeys.add(key);

    if (!uniqueClassIds.includes(item.classId)) {
      throw new BadRequestError(
        `Subject configuration references class '${item.classId}' which is not in participating classes.`
      );
    }

    if (typeof item.maxMarks !== "number" || isNaN(item.maxMarks) || item.maxMarks <= 0) {
      throw new BadRequestError(
        `Maximum marks must be a positive number for subject '${item.subjectId}'.`
      );
    }

    if (typeof item.passMarks !== "number" || isNaN(item.passMarks) || item.passMarks <= 0) {
      throw new BadRequestError(
        `Passing marks must be a positive number for subject '${item.subjectId}'.`
      );
    }

    if (item.passMarks > item.maxMarks) {
      throw new BadRequestError(
        `Passing marks (${item.passMarks}) cannot exceed maximum marks (${item.maxMarks}) for subject '${item.subjectId}'.`
      );
    }

    // Verify subject belongs to school and class
    const subject = await prisma.subject.findFirst({
      where: {
        id: item.subjectId,
        schoolId,
        OR: [{ classId: item.classId }, { classId: null }],
      },
    });

    if (!subject) {
      throw new BadRequestError(
        `Subject '${item.subjectId}' does not belong to class '${item.classId}' or this school.`
      );
    }

    validatedConfigs.push({
      classId: item.classId,
      subjectId: item.subjectId,
      maxMarks: Number(item.maxMarks),
      passMarks: Number(item.passMarks),
    });
  }

  // Transaction to update classes and subject configs atomically
  await prisma.$transaction(async (tx) => {
    // 1. Sync ExamClass records
    await tx.examClass.deleteMany({
      where: { examId: exam.id },
    });

    await tx.examClass.createMany({
      data: uniqueClassIds.map((cid) => ({
        schoolId,
        examId: exam.id,
        classId: cid,
      })),
    });

    // 2. Sync ExamSubjectConfig records
    await tx.examSubjectConfig.deleteMany({
      where: { examId: exam.id },
    });

    await tx.examSubjectConfig.createMany({
      data: validatedConfigs.map((cfg) => ({
        schoolId,
        examId: exam.id,
        classId: cfg.classId,
        subjectId: cfg.subjectId,
        maxMarks: cfg.maxMarks,
        passMarks: cfg.passMarks,
      })),
    });
  });

  await logAuditEvent({
    action: "EXAM_CLASSES_CONFIGURED",
    entityType: "Exam",
    entityId: exam.id,
    schoolId,
    userId: user.id,
    details: { classIds: uniqueClassIds },
  });

  await logAuditEvent({
    action: "EXAM_SUBJECTS_CONFIGURED",
    entityType: "Exam",
    entityId: exam.id,
    schoolId,
    userId: user.id,
    details: { count: validatedConfigs.length },
  });

  return getExamDetails(schoolId, user, exam.id);
}

// ============================================================================
// Examination Queries
// ============================================================================

export async function getSchoolExams(
  schoolId: string,
  user: AuthenticatedUser,
  academicYearId?: string
) {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to view examination records.");
  }

  const whereClause: Record<string, unknown> = { schoolId };
  if (academicYearId) {
    whereClause.academicYearId = academicYearId;
  }

  const exams = await prisma.exam.findMany({
    where: whereClause,
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      classes: {
        include: {
          class: { select: { id: true, name: true } },
        },
      },
      subjectConfigs: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
      sectionSubjects: {
        select: {
          id: true,
          sectionId: true,
          subjectId: true,
          status: true,
        },
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  return exams;
}

export async function getExamDetails(schoolId: string, user: AuthenticatedUser, examId: string) {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to view examination details.");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      classes: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
              sections: {
                select: { id: true, name: true },
                orderBy: { name: "asc" },
              },
            },
          },
        },
      },
      subjectConfigs: {
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      },
      sectionSubjects: {
        include: {
          section: {
            select: {
              id: true,
              name: true,
              class: { select: { id: true, name: true } },
            },
          },
          subject: { select: { id: true, name: true, code: true } },
          submittedBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
      },
      publishedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  return exam;
}

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

// ============================================================================
// Review & Publication Workflows (SCHOOL_ADMIN)
// ============================================================================

export async function returnMarksForCorrection(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  sectionId: string,
  subjectId: string,
  reason: string
) {
  assertCanReviewMarks(user, schoolId);

  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    throw new ValidationError("A return reason (minimum 5 characters) is required.");
  }

  const sectionSubject = await prisma.examSectionSubject.findUnique({
    where: {
      examId_sectionId_subjectId: {
        examId,
        sectionId,
        subjectId,
      },
    },
  });

  if (!sectionSubject) {
    throw new NotFoundError("Marks submission not found.");
  }

  if (sectionSubject.status !== ExamMarksSubmissionStatus.SUBMITTED) {
    throw new BadRequestError(
      `Cannot return marks in status '${sectionSubject.status}'. Only SUBMITTED marks can be returned.`
    );
  }

  const updated = await prisma.examSectionSubject.update({
    where: { id: sectionSubject.id },
    data: {
      status: ExamMarksSubmissionStatus.RETURNED,
      reviewedAt: new Date(),
      reviewedById: user.id,
      reviewNotes: trimmedReason,
    },
  });

  await logAuditEvent({
    action: "MARKS_RETURNED",
    entityType: "ExamSectionSubject",
    entityId: sectionSubject.id,
    schoolId,
    userId: user.id,
    details: {
      examId,
      sectionId,
      subjectId,
      reason: trimmedReason,
    },
  });

  return updated;
}

export async function approveMarks(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  sectionId: string,
  subjectId: string
) {
  assertCanReviewMarks(user, schoolId);

  const sectionSubject = await prisma.examSectionSubject.findUnique({
    where: {
      examId_sectionId_subjectId: {
        examId,
        sectionId,
        subjectId,
      },
    },
  });

  if (!sectionSubject) {
    throw new NotFoundError("Marks submission not found.");
  }

  if (sectionSubject.status !== ExamMarksSubmissionStatus.SUBMITTED) {
    throw new BadRequestError(
      `Cannot approve marks in status '${sectionSubject.status}'. Only SUBMITTED marks can be approved.`
    );
  }

  const updated = await prisma.examSectionSubject.update({
    where: { id: sectionSubject.id },
    data: {
      status: ExamMarksSubmissionStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  await logAuditEvent({
    action: "MARKS_APPROVED",
    entityType: "ExamSectionSubject",
    entityId: sectionSubject.id,
    schoolId,
    userId: user.id,
    details: { examId, sectionId, subjectId },
  });

  return updated;
}

export async function publishExamResults(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string
) {
  assertCanPublishResults(user, schoolId);

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      sectionSubjects: true,
      studentMarks: true,
    },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  if (exam.status === ExamStatus.PUBLISHED) {
    return exam;
  }

  if (exam.studentMarks.length === 0) {
    throw new BadRequestError("Cannot publish an examination with no entered marks.");
  }

  // Atomically transition exam to PUBLISHED and update all submitted/approved sectionSubjects to PUBLISHED
  const updatedExam = await prisma.$transaction(async (tx) => {
    await tx.examSectionSubject.updateMany({
      where: {
        examId: exam.id,
        status: { in: [ExamMarksSubmissionStatus.APPROVED, ExamMarksSubmissionStatus.SUBMITTED] },
      },
      data: {
        status: ExamMarksSubmissionStatus.PUBLISHED,
      },
    });

    return tx.exam.update({
      where: { id: exam.id },
      data: {
        status: ExamStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedById: user.id,
      },
    });
  });

  await logAuditEvent({
    action: "EXAM_RESULTS_PUBLISHED",
    entityType: "Exam",
    entityId: exam.id,
    schoolId,
    userId: user.id,
    details: {
      examId: exam.id,
      marksRecordCount: exam.studentMarks.length,
    },
  });

  return updatedExam;
}

export interface AdminCorrectMarksInput {
  studentMarkId: string;
  newMarks?: number | null;
  newAbsent?: boolean;
  newExempt?: boolean;
  reason: string;
}

export async function adminCorrectMarks(
  schoolId: string,
  user: AuthenticatedUser,
  examId: string,
  input: AdminCorrectMarksInput
) {
  assertCanAdminCorrectMarks(user, schoolId);

  const trimmedReason = input.reason?.trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    throw new ValidationError(
      "An administrative correction reason (minimum 5 characters) is required."
    );
  }

  const mark = await prisma.studentExamMark.findFirst({
    where: { id: input.studentMarkId, examId, schoolId },
    include: {
      exam: true,
      section: true,
      subject: true,
    },
  });

  if (!mark) {
    throw new NotFoundError(`Student marks record '${input.studentMarkId}' not found.`);
  }

  const config = await prisma.examSubjectConfig.findUnique({
    where: {
      examId_classId_subjectId: {
        examId,
        classId: mark.section.classId,
        subjectId: mark.subjectId,
      },
    },
  });

  if (!config) {
    throw new NotFoundError("Subject configuration not found for this marks record.");
  }

  const isAbsent = Boolean(input.newAbsent);
  const isExempt = Boolean(input.newExempt);

  let newMarks: number | null = null;
  if (!isAbsent && !isExempt && input.newMarks !== undefined && input.newMarks !== null) {
    const num = Number(input.newMarks);
    if (isNaN(num) || num < 0 || num > config.maxMarks) {
      throw new BadRequestError(`Marks must be between 0 and ${config.maxMarks}.`);
    }
    newMarks = num;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Record audited correction
    const correction = await tx.examMarkCorrection.create({
      data: {
        schoolId,
        examId,
        studentMarkId: mark.id,
        studentId: mark.studentId,
        subjectId: mark.subjectId,
        correctedById: user.id,
        previousMarks: mark.marksObtained,
        newMarks,
        previousAbsent: mark.isAbsent,
        newAbsent: isAbsent,
        reason: trimmedReason,
        details: {
          previousExempt: mark.isExempt,
          newExempt: isExempt,
        },
      },
    });

    // 2. Update student mark record
    const updatedMark = await tx.studentExamMark.update({
      where: { id: mark.id },
      data: {
        marksObtained: newMarks,
        isAbsent,
        isExempt,
        updatedById: user.id,
      },
    });

    return { correction, updatedMark };
  });

  await logAuditEvent({
    action: "MARKS_ADMIN_CORRECTED",
    entityType: "StudentExamMark",
    entityId: mark.id,
    schoolId,
    userId: user.id,
    details: {
      examId,
      studentId: mark.studentId,
      subjectId: mark.subjectId,
      previousMarks: mark.marksObtained,
      newMarks,
      previousAbsent: mark.isAbsent,
      newAbsent: isAbsent,
      reason: trimmedReason,
    },
  });

  return result;
}

// ============================================================================
// Examination Reports and Statistics
// ============================================================================

export interface SubjectMarksSummary {
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
  status: ExamMarksSubmissionStatus;
}

export interface StudentResultItem {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  marksObtained: number | null;
  isAbsent: boolean;
  isExempt: boolean;
  status: "PASS" | "FAIL" | "ABSENT" | "EXEMPT" | "UNMARKED";
}

export interface StudentExamSummary {
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
  results: StudentResultItem[];
}

export async function getExamReports(schoolId: string, user: AuthenticatedUser, examId: string) {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to view examination reports.");
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
      studentMarks: {
        include: {
          student: true,
          section: {
            include: { class: true },
          },
          subject: true,
        },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  // Access control for non-admin: TEACHER can only see if PUBLISHED or their assigned subjects
  if (user.role !== "SCHOOL_ADMIN" && user.role !== "SUPER_ADMIN") {
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenError("Examination results have not been published yet.");
    }
  }

  // 1. Completion Overview
  const totalSubmissionsExpected = exam.classes.reduce((sum, c) => {
    const classSectionsCount = c.class.sections.length;
    const classSubjectsCount = exam.subjectConfigs.filter(
      (cfg) => cfg.classId === c.classId
    ).length;
    return sum + classSectionsCount * classSubjectsCount;
  }, 0);

  const statusCounts = {
    NOT_STARTED: 0,
    DRAFT: 0,
    SUBMITTED: 0,
    RETURNED: 0,
    APPROVED: 0,
    PUBLISHED: 0,
  };

  for (const ss of exam.sectionSubjects) {
    if (statusCounts[ss.status] !== undefined) {
      statusCounts[ss.status]++;
    }
  }

  statusCounts.NOT_STARTED = Math.max(0, totalSubmissionsExpected - exam.sectionSubjects.length);

  const completedCount =
    exam.status === ExamStatus.PUBLISHED
      ? statusCounts.PUBLISHED
      : statusCounts.APPROVED + statusCounts.PUBLISHED;

  const completionPercentage =
    totalSubmissionsExpected > 0
      ? Math.round((completedCount / totalSubmissionsExpected) * 100)
      : 0;

  // 2. Subject-wise summaries
  const subjectSummaries: SubjectMarksSummary[] = [];

  for (const examClass of exam.classes) {
    const classSections = examClass.class.sections;
    const classConfigs = exam.subjectConfigs.filter((cfg) => cfg.classId === examClass.classId);

    for (const section of classSections) {
      for (const config of classConfigs) {
        const sectionMarks = exam.studentMarks.filter(
          (m) => m.sectionId === section.id && m.subjectId === config.subjectId
        );

        const workflow = exam.sectionSubjects.find(
          (ss) => ss.sectionId === section.id && ss.subjectId === config.subjectId
        );

        let appeared = 0;
        let absent = 0;
        let exempt = 0;
        let passed = 0;
        let failed = 0;
        let marksSum = 0;
        let highest = 0;
        let lowest = config.maxMarks;

        for (const m of sectionMarks) {
          if (m.isAbsent) {
            absent++;
          } else if (m.isExempt) {
            exempt++;
          } else if (m.marksObtained !== null) {
            appeared++;
            marksSum += m.marksObtained;
            if (m.marksObtained >= config.passMarks) {
              passed++;
            } else {
              failed++;
            }
            if (m.marksObtained > highest) highest = m.marksObtained;
            if (m.marksObtained < lowest) lowest = m.marksObtained;
          }
        }

        const passPercentage = appeared > 0 ? Math.round((passed / appeared) * 100) : 0;
        const averageMarks = appeared > 0 ? Number((marksSum / appeared).toFixed(1)) : 0;

        subjectSummaries.push({
          classId: examClass.class.id,
          className: examClass.class.name,
          sectionId: section.id,
          sectionName: section.name,
          subjectId: config.subject.id,
          subjectName: config.subject.name,
          maxMarks: config.maxMarks,
          passMarks: config.passMarks,
          totalEnrolled: sectionMarks.length,
          appeared,
          absent,
          exempt,
          passed,
          failed,
          passPercentage,
          averageMarks,
          highestMarks: appeared > 0 ? highest : 0,
          lowestMarks: appeared > 0 ? lowest : 0,
          status: workflow?.status ?? ExamMarksSubmissionStatus.NOT_STARTED,
        });
      }
    }
  }

  // 3. Student result summaries (grouped by student)
  const studentMap = new Map<
    string,
    {
      student: { id: string; name: string; admissionNumber: string };
      sectionName: string;
      className: string;
      marks: typeof exam.studentMarks;
    }
  >();

  for (const m of exam.studentMarks) {
    if (!studentMap.has(m.studentId)) {
      studentMap.set(m.studentId, {
        student: m.student,
        sectionName: m.section.name,
        className: m.section.class.name,
        marks: [],
      });
    }
    studentMap.get(m.studentId)!.marks.push(m);
  }

  const studentSummaries: StudentExamSummary[] = [];

  for (const [, item] of studentMap) {
    let totalMax = 0;
    let totalObtained = 0;
    let anyFail = false;
    let anyIncomplete = false;

    const results: StudentResultItem[] = item.marks.map((m) => {
      const config = exam.subjectConfigs.find(
        (cfg) => cfg.subjectId === m.subjectId && cfg.classId === m.section.classId
      );
      const maxMarks = config?.maxMarks ?? 100;
      const passMarks = config?.passMarks ?? 40;

      totalMax += maxMarks;

      let status: "PASS" | "FAIL" | "ABSENT" | "EXEMPT" | "UNMARKED" = "UNMARKED";
      if (m.isAbsent) {
        status = "ABSENT";
        anyFail = true;
      } else if (m.isExempt) {
        status = "EXEMPT";
      } else if (m.marksObtained !== null) {
        totalObtained += m.marksObtained;
        if (m.marksObtained >= passMarks) {
          status = "PASS";
        } else {
          status = "FAIL";
          anyFail = true;
        }
      } else {
        anyIncomplete = true;
      }

      return {
        subjectId: m.subject.id,
        subjectName: m.subject.name,
        maxMarks,
        passMarks,
        marksObtained: m.marksObtained,
        isAbsent: m.isAbsent,
        isExempt: m.isExempt,
        status,
      };
    });

    const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;
    const overallStatus = anyIncomplete ? "INCOMPLETE" : anyFail ? "FAIL" : "PASS";

    studentSummaries.push({
      studentId: item.student.id,
      name: item.student.name,
      admissionNumber: item.student.admissionNumber,
      rollNumber: null,
      sectionName: item.sectionName,
      className: item.className,
      totalMaxMarks: totalMax,
      totalMarksObtained: totalObtained,
      percentage,
      overallStatus,
      results,
    });
  }

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      status: exam.status,
      startDate: exam.startDate.toISOString(),
      endDate: exam.endDate.toISOString(),
      publishedAt: exam.publishedAt?.toISOString() ?? null,
    },
    completion: {
      totalExpected: totalSubmissionsExpected,
      completed: completedCount,
      percentage: completionPercentage,
      statusCounts,
    },
    subjectSummaries,
    studentSummaries,
  };
}
