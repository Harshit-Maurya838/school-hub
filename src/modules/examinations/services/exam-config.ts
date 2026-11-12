// Exams: class/subject configuration and exam queries.
import { prisma } from "@/lib/prisma";
import { AuthenticatedUser, assertSchoolAccess, assertCanManageExams } from "@/modules/auth";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { ExamStatus } from "@/generated/prisma/enums";

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
