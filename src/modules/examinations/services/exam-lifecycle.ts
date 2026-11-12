// Exams: status transitions, school resolution, exam CRUD and lifecycle.
import { prisma } from "@/lib/prisma";
import {
  AuthenticatedUser,
  assertSchoolAccess,
  assertCanManageExams,
  findSchoolBySlug,
} from "@/modules/auth";
import { BadRequestError, NotFoundError, ValidationError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { ExamStatus, ExamType } from "@/generated/prisma/enums";
import { publishExamResults } from "./exam-review";

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
  const { id, name, slug } = await findSchoolBySlug(schoolSlug);
  assertSchoolAccess(user, id);
  return { id, name, slug };
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
