// Exams: marks review, approval, publication and admin corrections.
import { prisma } from "@/lib/prisma";
import {
  AuthenticatedUser,
  assertCanReviewMarks,
  assertCanPublishResults,
  assertCanAdminCorrectMarks,
} from "@/modules/auth";
import { BadRequestError, NotFoundError, ValidationError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { ExamStatus, ExamMarksSubmissionStatus } from "@/generated/prisma/enums";

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
