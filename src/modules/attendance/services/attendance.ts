import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthenticatedUser,
  getTeacherActiveAssignments,
  assertSchoolAccess,
  requireAuth,
} from "@/modules/auth";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { AttendanceStatus, RegisterStatus } from "@/generated/prisma/enums";

export interface NormalizedDate {
  date: Date;
  dateStr: string;
}

/**
 * Validates and normalizes date string (YYYY-MM-DD) to a canonical UTC midnight Date.
 * Guarantees zero time-shift across timezones and strict calendar correctness.
 */
export function normalizeAttendanceDate(dateInput: string | Date): NormalizedDate {
  let dateStr: string;

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestError("Invalid attendance date format. Expected YYYY-MM-DD.");
    }
    dateStr = trimmed;
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    dateStr = dateInput.toISOString().slice(0, 10);
  } else {
    throw new BadRequestError("Attendance date is required and must be valid.");
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new BadRequestError(`Invalid calendar date '${dateStr}'.`);
  }

  return { date, dateStr };
}

/**
 * Validates section existence and returns section with class and school verification.
 */
export async function assertSectionBelongsToSchool(
  schoolId: string,
  sectionId: string
): Promise<{ id: string; name: string; classId: string; className: string }> {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    include: { class: { select: { id: true, name: true } } },
  });

  if (!section) {
    throw new NotFoundError(`Section '${sectionId}' not found in this school.`);
  }

  return {
    id: section.id,
    name: section.name,
    classId: section.class.id,
    className: section.class.name,
  };
}

/**
 * Validates academic year for attendance operations.
 */
export async function resolveAcademicYearForAttendance(
  schoolId: string,
  academicYearId?: string
): Promise<{ id: string; name: string; startDate: Date; endDate: Date; isCurrent: boolean }> {
  let academicYear: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
  } | null = null;

  if (academicYearId) {
    academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    });

    if (!academicYear) {
      throw new NotFoundError(`Academic year '${academicYearId}' not found in this school.`);
    }
  } else {
    academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    });

    if (!academicYear) {
      throw new BadRequestError(
        "No active academic session found for this school. Please configure and activate an academic year."
      );
    }
  }

  return academicYear;
}

/**
 * Strict role-based guard for marking daily section attendance:
 * - SCHOOL_ADMIN (and SUPER_ADMIN) can mark any section in their school.
 * - TEACHER can ONLY mark sections where they have an active ClassTeacherAssignment for this academic year.
 * - Subject teachers without class teacher assignment cannot mark attendance (403 Forbidden).
 * - Accountants cannot mark attendance (403 Forbidden).
 */
export async function assertCanMarkSectionAttendance(
  user: AuthenticatedUser,
  schoolId: string,
  sectionId: string,
  academicYearId: string
): Promise<void> {
  if (user.role === "SUPER_ADMIN") return;

  if (user.role === "ACCOUNTANT") {
    await logAuditEvent({
      action: "ATTENDANCE_UNAUTHORIZED_ACCESS",
      entityType: "Section",
      entityId: sectionId,
      schoolId,
      userId: user.id,
      details: { role: user.role, reason: "Accountant attempted attendance mutation" },
    });
    throw new ForbiddenError(
      "Access denied: Accountants are not authorized to mark or edit student attendance"
    );
  }

  if (user.role === "SCHOOL_ADMIN") {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenError("Cross-tenant attendance access rejected");
    }
    return;
  }

  if (user.role === "TEACHER") {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenError("Cross-tenant attendance access rejected");
    }

    const assignments = await getTeacherActiveAssignments(schoolId, user.id, academicYearId);
    if (!assignments || !assignments.classTeacherSectionIds.includes(sectionId)) {
      await logAuditEvent({
        action: "ATTENDANCE_UNAUTHORIZED_ACCESS",
        entityType: "Section",
        entityId: sectionId,
        schoolId,
        userId: user.id,
        details: {
          role: user.role,
          reason: "Teacher is not the designated class teacher for this section",
          isSubjectTeacher: assignments?.subjectSectionIds.includes(sectionId) ?? false,
        },
      });

      throw new ForbiddenError(
        "Access denied: Only the designated active Class Teacher or School Administrator can mark daily attendance for this section"
      );
    }
    return;
  }

  throw new ForbiddenError("Access denied: You are not authorized to mark attendance");
}

/**
 * Strict role-based guard for viewing daily section attendance:
 * - SCHOOL_ADMIN can view all sections.
 * - TEACHER can view assigned sections (Class Teacher or Subject Teacher).
 * - Others denied.
 */
export async function assertCanViewSectionAttendance(
  user: AuthenticatedUser,
  schoolId: string,
  sectionId: string,
  academicYearId: string
): Promise<void> {
  if (user.role === "SUPER_ADMIN") return;

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError(
      "Access denied: Accountants cannot view classroom attendance registers"
    );
  }

  if (user.role === "SCHOOL_ADMIN") {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenError("Cross-tenant attendance access rejected");
    }
    return;
  }

  if (user.role === "TEACHER") {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenError("Cross-tenant attendance access rejected");
    }

    const assignments = await getTeacherActiveAssignments(schoolId, user.id, academicYearId);
    if (!assignments || !assignments.allPermittedSectionIds.includes(sectionId)) {
      throw new ForbiddenError(
        "Access denied: You do not have an active teaching assignment for this section"
      );
    }
    return;
  }

  throw new ForbiddenError("Access denied: Unauthorized attendance access");
}

/**
 * Administrative correction guard:
 * Only SCHOOL_ADMIN (and SUPER_ADMIN) can execute administrative corrections on submitted registers.
 */
export function assertCanAdminCorrectAttendance(user: AuthenticatedUser, schoolId: string): void {
  if (user.role === "SUPER_ADMIN") return;

  if (user.role !== "SCHOOL_ADMIN" || user.schoolId !== schoolId) {
    throw new ForbiddenError(
      "Access denied: Only School Administrators can perform administrative corrections on submitted attendance registers"
    );
  }
}

/**
 * Retrieves attendance overview and authorized section options for the user.
 */
export async function getAttendanceOverview(schoolId: string, user: AuthenticatedUser) {
  const currentYear = await resolveAcademicYearForAttendance(schoolId);

  // Fetch all classes and sections
  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: {
      sections: {
        select: {
          id: true,
          name: true,
          capacity: true,
          _count: {
            select: {
              enrollments: {
                where: {
                  academicYearId: currentYear.id,
                  status: "ACTIVE",
                  student: { isActive: true, deletedAt: null },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
  });

  // Filter sections by role
  let classTeacherSectionIds: string[] = [];
  let permittedSectionIds: string[] = [];

  if (user.role === "TEACHER") {
    const assignments = await getTeacherActiveAssignments(schoolId, user.id, currentYear.id);
    classTeacherSectionIds = assignments?.classTeacherSectionIds || [];
    permittedSectionIds = assignments?.allPermittedSectionIds || [];
  } else if (user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN") {
    permittedSectionIds = classes.flatMap((c) => c.sections.map((s) => s.id));
    classTeacherSectionIds = permittedSectionIds;
  }

  const sectionsList = classes.flatMap((cls) =>
    cls.sections
      .filter((s) => permittedSectionIds.includes(s.id))
      .map((sec) => ({
        sectionId: sec.id,
        sectionName: sec.name,
        classId: cls.id,
        className: cls.name,
        displayName: `${cls.name} - ${sec.name}`,
        studentCount: sec._count.enrollments,
        isClassTeacher: classTeacherSectionIds.includes(sec.id),
      }))
  );

  const defaultSection = sectionsList.find((s) => s.isClassTeacher) || sectionsList[0] || null;

  return {
    currentAcademicYear: {
      id: currentYear.id,
      name: currentYear.name,
      startDate: currentYear.startDate,
      endDate: currentYear.endDate,
    },
    sections: sectionsList,
    defaultSectionId: defaultSection?.sectionId || null,
    totalAssignedSections: sectionsList.length,
    canMarkAny: classTeacherSectionIds.length > 0,
    userRole: user.role,
  };
}

/**
 * Retrieves daily register and enrolled roster for a section on a specific date.
 */
export async function getDailyRegister(
  schoolId: string,
  user: AuthenticatedUser,
  params: {
    sectionId: string;
    date: string;
    academicYearId?: string;
  }
) {
  const { date, dateStr } = normalizeAttendanceDate(params.date);
  const section = await assertSectionBelongsToSchool(schoolId, params.sectionId);
  const academicYear = await resolveAcademicYearForAttendance(schoolId, params.academicYearId);

  await assertCanViewSectionAttendance(user, schoolId, section.id, academicYear.id);

  // Determine if the user has mark privileges for this section
  let canMark = false;
  if (user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN") {
    canMark = true;
  } else if (user.role === "TEACHER") {
    const assignments = await getTeacherActiveAssignments(schoolId, user.id, academicYear.id);
    canMark = assignments?.classTeacherSectionIds.includes(section.id) ?? false;
  }

  // Fetch active eligible enrolled students in this section for this academic year
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolId,
      sectionId: section.id,
      academicYearId: academicYear.id,
      status: "ACTIVE",
      student: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          gender: true,
        },
      },
    },
    orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
  });

  // Fetch existing register if created
  const register = await prisma.attendanceRegister.findUnique({
    where: {
      schoolId_academicYearId_sectionId_date: {
        schoolId,
        academicYearId: academicYear.id,
        sectionId: section.id,
        date,
      },
    },
    include: {
      records: true,
      submittedBy: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
      corrections: {
        include: {
          correctedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const recordMap = new Map<
    string,
    { status: AttendanceStatus; remarks: string | null; recordId: string }
  >();
  if (register) {
    for (const rec of register.records) {
      recordMap.set(rec.studentId, {
        status: rec.status,
        remarks: rec.remarks,
        recordId: rec.id,
      });
    }
  }

  const roster = enrollments.map((enr) => {
    const existing = recordMap.get(enr.student.id);
    return {
      enrollmentId: enr.id,
      studentId: enr.student.id,
      admissionNumber: enr.student.admissionNumber,
      name: enr.student.name,
      gender: enr.student.gender,
      rollNumber: enr.rollNumber,
      status: existing?.status || null,
      remarks: existing?.remarks || null,
      recordId: existing?.recordId || null,
    };
  });

  const presentCount = roster.filter((r) => r.status === "PRESENT").length;
  const absentCount = roster.filter((r) => r.status === "ABSENT").length;
  const lateCount = roster.filter((r) => r.status === "LATE").length;
  const excusedCount = roster.filter((r) => r.status === "EXCUSED").length;
  const unmarkedCount = roster.filter((r) => r.status === null).length;

  return {
    register: register
      ? {
          id: register.id,
          status: register.status,
          date: dateStr,
          submittedAt: register.submittedAt,
          submittedBy: register.submittedBy,
          createdBy: register.createdBy,
          updatedBy: register.updatedBy,
          notes: register.notes,
          createdAt: register.createdAt,
          updatedAt: register.updatedAt,
          correctionsCount: register.corrections.length,
          corrections: register.corrections,
        }
      : null,
    section: {
      id: section.id,
      name: section.name,
      classId: section.classId,
      className: section.className,
      displayName: `${section.className} - ${section.name}`,
    },
    academicYear: {
      id: academicYear.id,
      name: academicYear.name,
    },
    date: dateStr,
    roster,
    stats: {
      totalStudents: roster.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      unmarkedCount,
      isFullyMarked: unmarkedCount === 0 && roster.length > 0,
    },
    permissions: {
      canMark,
      canSubmit: canMark && register?.status !== "SUBMITTED",
      canSaveDraft: canMark && register?.status !== "SUBMITTED",
      canAdminCorrect: user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN",
      isLocked: register?.status === "SUBMITTED",
    },
  };
}

export interface StudentAttendanceInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

/**
 * Saves daily attendance as DRAFT.
 * Validates section enrollment, does not allow overwriting submitted registers.
 */
export async function saveAttendanceDraft(
  schoolId: string,
  user: AuthenticatedUser,
  params: {
    sectionId: string;
    date: string;
    academicYearId?: string;
    notes?: string | null;
    records: StudentAttendanceInput[];
  }
) {
  const { date, dateStr } = normalizeAttendanceDate(params.date);
  const section = await assertSectionBelongsToSchool(schoolId, params.sectionId);
  const academicYear = await resolveAcademicYearForAttendance(schoolId, params.academicYearId);

  await assertCanMarkSectionAttendance(user, schoolId, section.id, academicYear.id);

  // Fetch valid enrollments for validation
  const validEnrollments = await prisma.enrollment.findMany({
    where: {
      schoolId,
      sectionId: section.id,
      academicYearId: academicYear.id,
      status: "ACTIVE",
      student: { isActive: true, deletedAt: null },
    },
    select: { id: true, studentId: true },
  });

  const enrollmentMap = new Map<string, string>();
  for (const enr of validEnrollments) {
    enrollmentMap.set(enr.studentId, enr.id);
  }

  // Validate student records
  for (const item of params.records) {
    if (!enrollmentMap.has(item.studentId)) {
      throw new BadRequestError(
        `Student '${item.studentId}' is not actively enrolled in section '${section.name}' for academic session '${academicYear.name}'.`
      );
    }
  }

  // Check if register exists and is submitted
  const existingRegister = await prisma.attendanceRegister.findUnique({
    where: {
      schoolId_academicYearId_sectionId_date: {
        schoolId,
        academicYearId: academicYear.id,
        sectionId: section.id,
        date,
      },
    },
  });

  if (existingRegister && existingRegister.status === "SUBMITTED") {
    throw new ConflictError(
      "Cannot save draft for a submitted register. Use the administrative correction workflow."
    );
  }

  // Execute atomic transaction
  const savedRegister = await prisma.$transaction(async (tx) => {
    const register = await tx.attendanceRegister.upsert({
      where: {
        schoolId_academicYearId_sectionId_date: {
          schoolId,
          academicYearId: academicYear.id,
          sectionId: section.id,
          date,
        },
      },
      create: {
        schoolId,
        academicYearId: academicYear.id,
        sectionId: section.id,
        date,
        status: "DRAFT",
        createdById: user.id,
        updatedById: user.id,
        notes: params.notes || null,
      },
      update: {
        updatedById: user.id,
        notes: params.notes !== undefined ? params.notes : undefined,
      },
    });

    // Upsert individual attendance records
    for (const rec of params.records) {
      const enrollmentId = enrollmentMap.get(rec.studentId)!;
      await tx.attendanceRecord.upsert({
        where: {
          registerId_studentId: {
            registerId: register.id,
            studentId: rec.studentId,
          },
        },
        create: {
          registerId: register.id,
          studentId: rec.studentId,
          enrollmentId,
          status: rec.status,
          remarks: rec.remarks || null,
        },
        update: {
          status: rec.status,
          remarks: rec.remarks !== undefined ? rec.remarks : undefined,
        },
      });
    }

    return register;
  });

  await logAuditEvent({
    action: "ATTENDANCE_DRAFT_SAVED",
    entityType: "AttendanceRegister",
    entityId: savedRegister.id,
    schoolId,
    userId: user.id,
    details: {
      sectionId: section.id,
      date: dateStr,
      savedRecordsCount: params.records.length,
      status: "DRAFT",
    },
  });

  return getDailyRegister(schoolId, user, {
    sectionId: section.id,
    date: dateStr,
    academicYearId: academicYear.id,
  });
}

/**
 * Submits daily attendance register.
 * Invariants enforced:
 * - Every actively enrolled student must have a valid status.
 * - Cannot submit an already-submitted register.
 * - Locks the register and records submission author and timestamp.
 */
export async function submitAttendanceRegister(
  schoolId: string,
  user: AuthenticatedUser,
  params: {
    sectionId: string;
    date: string;
    academicYearId?: string;
    notes?: string | null;
    records: StudentAttendanceInput[];
  }
) {
  const { date, dateStr } = normalizeAttendanceDate(params.date);
  const section = await assertSectionBelongsToSchool(schoolId, params.sectionId);
  const academicYear = await resolveAcademicYearForAttendance(schoolId, params.academicYearId);

  await assertCanMarkSectionAttendance(user, schoolId, section.id, academicYear.id);

  // Fetch all active enrollments for the section
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolId,
      sectionId: section.id,
      academicYearId: academicYear.id,
      status: "ACTIVE",
      student: { isActive: true, deletedAt: null },
    },
    select: { id: true, studentId: true },
  });

  if (enrollments.length === 0) {
    throw new BadRequestError(
      `Cannot submit attendance register: Section '${section.name}' has no active student enrollments.`
    );
  }

  const enrollmentMap = new Map<string, string>();
  for (const enr of enrollments) {
    enrollmentMap.set(enr.studentId, enr.id);
  }

  // Validate that every enrolled student has a record provided
  const submittedStudentIds = new Set(params.records.map((r) => r.studentId));
  const missingStudents: string[] = [];

  for (const enr of enrollments) {
    if (!submittedStudentIds.has(enr.studentId)) {
      missingStudents.push(enr.studentId);
    }
  }

  if (missingStudents.length > 0) {
    throw new ValidationError(
      `Attendance submission incomplete: ${missingStudents.length} student(s) on the roster have not been marked. All enrolled students must have an attendance status before submission.`
    );
  }

  // Validate that each submitted record has a valid enum status
  const validStatuses = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
  for (const rec of params.records) {
    if (!validStatuses.has(rec.status)) {
      throw new ValidationError(
        `Invalid attendance status '${rec.status}' for student '${rec.studentId}'. Must be PRESENT, ABSENT, LATE, or EXCUSED.`
      );
    }
  }

  // Check if register already submitted
  const existingRegister = await prisma.attendanceRegister.findUnique({
    where: {
      schoolId_academicYearId_sectionId_date: {
        schoolId,
        academicYearId: academicYear.id,
        sectionId: section.id,
        date,
      },
    },
  });

  if (existingRegister && existingRegister.status === "SUBMITTED") {
    throw new ConflictError(
      "Attendance register for this date and section has already been submitted and locked."
    );
  }

  // Atomic transaction
  const submittedRegister = await prisma.$transaction(async (tx) => {
    const register = await tx.attendanceRegister.upsert({
      where: {
        schoolId_academicYearId_sectionId_date: {
          schoolId,
          academicYearId: academicYear.id,
          sectionId: section.id,
          date,
        },
      },
      create: {
        schoolId,
        academicYearId: academicYear.id,
        sectionId: section.id,
        date,
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedById: user.id,
        createdById: user.id,
        updatedById: user.id,
        notes: params.notes || null,
      },
      update: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedById: user.id,
        updatedById: user.id,
        notes: params.notes !== undefined ? params.notes : undefined,
      },
    });

    for (const rec of params.records) {
      const enrollmentId = enrollmentMap.get(rec.studentId)!;
      await tx.attendanceRecord.upsert({
        where: {
          registerId_studentId: {
            registerId: register.id,
            studentId: rec.studentId,
          },
        },
        create: {
          registerId: register.id,
          studentId: rec.studentId,
          enrollmentId,
          status: rec.status,
          remarks: rec.remarks || null,
        },
        update: {
          status: rec.status,
          remarks: rec.remarks !== undefined ? rec.remarks : undefined,
        },
      });
    }

    return register;
  });

  await logAuditEvent({
    action: "ATTENDANCE_REGISTER_SUBMITTED",
    entityType: "AttendanceRegister",
    entityId: submittedRegister.id,
    schoolId,
    userId: user.id,
    details: {
      sectionId: section.id,
      date: dateStr,
      totalStudents: enrollments.length,
      submittedById: user.id,
    },
  });

  return getDailyRegister(schoolId, user, {
    sectionId: section.id,
    date: dateStr,
    academicYearId: academicYear.id,
  });
}

/**
 * Performs an administrative correction on an attendance register.
 * Strict rules:
 * - Only SCHOOL_ADMIN / SUPER_ADMIN.
 * - Mandatory reason (at least 5 characters).
 * - Records before & after status and logs audit event.
 */
export async function correctAttendanceRegister(
  schoolId: string,
  user: AuthenticatedUser,
  params: {
    registerId: string;
    reason: string;
    updates: StudentAttendanceInput[];
  }
) {
  assertCanAdminCorrectAttendance(user, schoolId);

  const cleanReason = (params.reason || "").trim();
  if (cleanReason.length < 5) {
    throw new ValidationError(
      "Administrative correction reason is mandatory and must be at least 5 characters explaining the correction."
    );
  }

  if (!params.updates || params.updates.length === 0) {
    throw new ValidationError("At least one student attendance update must be provided.");
  }

  const register = await prisma.attendanceRegister.findFirst({
    where: { id: params.registerId, schoolId },
    include: {
      records: true,
      section: { select: { id: true, name: true } },
    },
  });

  if (!register) {
    throw new NotFoundError(`Attendance register '${params.registerId}' not found in this school.`);
  }

  const existingRecordsMap = new Map<
    string,
    { id: string; status: AttendanceStatus; remarks: string | null }
  >();
  for (const r of register.records) {
    existingRecordsMap.set(r.studentId, {
      id: r.id,
      status: r.status,
      remarks: r.remarks,
    });
  }

  const correctionsLogged: Array<{
    studentId: string;
    previousStatus: AttendanceStatus;
    newStatus: AttendanceStatus;
  }> = [];

  await prisma.$transaction(async (tx) => {
    for (const update of params.updates) {
      const existing = existingRecordsMap.get(update.studentId);
      if (!existing) {
        throw new BadRequestError(
          `Student '${update.studentId}' does not have an existing attendance record in this register.`
        );
      }

      const previousStatus = existing.status;
      const newStatus = update.status;

      // Update the record
      await tx.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: newStatus,
          remarks: update.remarks !== undefined ? update.remarks : existing.remarks,
        },
      });

      // Record correction log entry
      await tx.attendanceCorrection.create({
        data: {
          registerId: register.id,
          recordId: existing.id,
          schoolId,
          correctedById: user.id,
          reason: cleanReason,
          previousStatus,
          newStatus,
          details: {
            studentId: update.studentId,
            remarks: update.remarks || null,
          },
        },
      });

      correctionsLogged.push({
        studentId: update.studentId,
        previousStatus,
        newStatus,
      });
    }

    // Update register modification metadata
    await tx.attendanceRegister.update({
      where: { id: register.id },
      data: {
        updatedById: user.id,
      },
    });
  });

  await logAuditEvent({
    action: "ATTENDANCE_REGISTER_CORRECTED",
    entityType: "AttendanceRegister",
    entityId: register.id,
    schoolId,
    userId: user.id,
    details: {
      reason: cleanReason,
      sectionId: register.sectionId,
      correctionsCount: correctionsLogged.length,
      corrections: correctionsLogged,
    },
  });

  return getDailyRegister(schoolId, user, {
    sectionId: register.sectionId,
    date: register.date.toISOString().slice(0, 10),
    academicYearId: register.academicYearId,
  });
}

/**
 * Retrieves historical registers with role-based filtering.
 */
export async function getHistoricalRegisters(
  schoolId: string,
  user: AuthenticatedUser,
  filters: {
    sectionId?: string;
    classId?: string;
    startDate?: string;
    endDate?: string;
    status?: RegisterStatus;
    limit?: number;
    offset?: number;
  }
) {
  const currentYear = await resolveAcademicYearForAttendance(schoolId);

  // Determine authorized sections for user
  let permittedSectionIds: string[] = [];
  if (user.role === "TEACHER") {
    const assignments = await getTeacherActiveAssignments(schoolId, user.id, currentYear.id);
    if (!assignments || assignments.allPermittedSectionIds.length === 0) {
      return { registers: [], total: 0 };
    }
    permittedSectionIds = assignments.allPermittedSectionIds;
  } else if (user.role === "SCHOOL_ADMIN" || user.role === "SUPER_ADMIN") {
    const allSections = await prisma.section.findMany({
      where: { schoolId },
      select: { id: true },
    });
    permittedSectionIds = allSections.map((s) => s.id);
  } else {
    throw new ForbiddenError("Access denied: You are not authorized to view attendance history");
  }

  const whereClause: {
    schoolId: string;
    sectionId: { in: string[] };
    status?: RegisterStatus;
    date?: { gte?: Date; lte?: Date };
    section?: { classId?: string };
  } = {
    schoolId,
    sectionId: {
      in: filters.sectionId
        ? permittedSectionIds.includes(filters.sectionId)
          ? [filters.sectionId]
          : []
        : permittedSectionIds,
    },
  };

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.classId) {
    whereClause.section = { classId: filters.classId };
  }

  if (filters.startDate || filters.endDate) {
    whereClause.date = {};
    if (filters.startDate) {
      whereClause.date.gte = normalizeAttendanceDate(filters.startDate).date;
    }
    if (filters.endDate) {
      whereClause.date.lte = normalizeAttendanceDate(filters.endDate).date;
    }
  }

  const limit = Math.min(filters.limit || 30, 100);
  const offset = filters.offset || 0;

  const [registers, total] = await Promise.all([
    prisma.attendanceRegister.findMany({
      where: whereClause,
      include: {
        section: {
          select: {
            id: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
        records: {
          select: { status: true },
        },
        submittedBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.attendanceRegister.count({ where: whereClause }),
  ]);

  const formattedRegisters = registers.map((reg) => {
    const presentCount = reg.records.filter((r) => r.status === "PRESENT").length;
    const absentCount = reg.records.filter((r) => r.status === "ABSENT").length;
    const lateCount = reg.records.filter((r) => r.status === "LATE").length;
    const excusedCount = reg.records.filter((r) => r.status === "EXCUSED").length;
    const totalRecorded = reg.records.length;

    return {
      id: reg.id,
      date: reg.date.toISOString().slice(0, 10),
      status: reg.status,
      sectionId: reg.section.id,
      sectionName: reg.section.name,
      className: reg.section.class.name,
      displayName: `${reg.section.class.name} - ${reg.section.name}`,
      submittedAt: reg.submittedAt,
      submittedBy: reg.submittedBy,
      totalEnrolled: totalRecorded,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage:
        totalRecorded > 0
          ? Number((((presentCount + lateCount) / totalRecorded) * 100).toFixed(1))
          : 0,
    };
  });

  return {
    registers: formattedRegisters,
    total,
    limit,
    offset,
  };
}

/**
 * Calculates section and student attendance summaries with explicit formulas.
 * Explicit Formula:
 * - Denominator: Total submitted registers where student had an active attendance record.
 * - Numerator: Present records (and separately, Present + Late records).
 * - Excused absences are tracked separately and not counted as Present.
 * - Missing registers are not assumed absent.
 */
export async function getAttendanceReports(
  schoolId: string,
  user: AuthenticatedUser,
  filters: {
    sectionId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
    academicYearId?: string;
  }
) {
  const academicYear = await resolveAcademicYearForAttendance(schoolId, filters.academicYearId);

  // Authorize user
  if (user.role === "TEACHER") {
    const assignments = await getTeacherActiveAssignments(schoolId, user.id, academicYear.id);
    if (!assignments) {
      throw new ForbiddenError("Teacher has no active assignments for this session");
    }
    if (filters.sectionId && !assignments.allPermittedSectionIds.includes(filters.sectionId)) {
      throw new ForbiddenError("Unauthorized access to section report");
    }
  } else if (user.role !== "SCHOOL_ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Access denied: Unauthorized to view attendance reports");
  }

  // Base register filter: only SUBMITTED registers count toward formal attendance stats
  const registerWhere: {
    schoolId: string;
    academicYearId: string;
    status: RegisterStatus;
    sectionId?: string;
    date?: { gte?: Date; lte?: Date };
  } = {
    schoolId,
    academicYearId: academicYear.id,
    status: "SUBMITTED",
  };

  if (filters.sectionId) {
    registerWhere.sectionId = filters.sectionId;
  }

  if (filters.startDate || filters.endDate) {
    registerWhere.date = {};
    if (filters.startDate) {
      registerWhere.date.gte = normalizeAttendanceDate(filters.startDate).date;
    }
    if (filters.endDate) {
      registerWhere.date.lte = normalizeAttendanceDate(filters.endDate).date;
    }
  }

  const registers = await prisma.attendanceRegister.findMany({
    where: registerWhere,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
      records: {
        include: {
          student: {
            select: { id: true, name: true, admissionNumber: true },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // Section-level aggregation
  const sectionAggregates = new Map<
    string,
    {
      sectionId: string;
      sectionName: string;
      className: string;
      submittedRegistersCount: number;
      totalStudentEntries: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      excusedCount: number;
    }
  >();

  // Student-level aggregation
  const studentAggregates = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      admissionNumber: string;
      sectionId: string;
      recordedDaysCount: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      excusedCount: number;
      records: Array<{
        date: string;
        status: AttendanceStatus;
        remarks: string | null;
      }>;
    }
  >();

  for (const reg of registers) {
    const secKey = reg.sectionId;
    if (!sectionAggregates.has(secKey)) {
      sectionAggregates.set(secKey, {
        sectionId: reg.section.id,
        sectionName: reg.section.name,
        className: reg.section.class.name,
        submittedRegistersCount: 0,
        totalStudentEntries: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
      });
    }

    const secAgg = sectionAggregates.get(secKey)!;
    secAgg.submittedRegistersCount += 1;

    for (const rec of reg.records) {
      secAgg.totalStudentEntries += 1;
      if (rec.status === "PRESENT") secAgg.presentCount += 1;
      else if (rec.status === "ABSENT") secAgg.absentCount += 1;
      else if (rec.status === "LATE") secAgg.lateCount += 1;
      else if (rec.status === "EXCUSED") secAgg.excusedCount += 1;

      // Filter by studentId if requested
      if (filters.studentId && rec.studentId !== filters.studentId) {
        continue;
      }

      if (!studentAggregates.has(rec.studentId)) {
        studentAggregates.set(rec.studentId, {
          studentId: rec.student.id,
          studentName: rec.student.name,
          admissionNumber: rec.student.admissionNumber,
          sectionId: reg.sectionId,
          recordedDaysCount: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          records: [],
        });
      }

      const stAgg = studentAggregates.get(rec.studentId)!;
      stAgg.recordedDaysCount += 1;
      if (rec.status === "PRESENT") stAgg.presentCount += 1;
      else if (rec.status === "ABSENT") stAgg.absentCount += 1;
      else if (rec.status === "LATE") stAgg.lateCount += 1;
      else if (rec.status === "EXCUSED") stAgg.excusedCount += 1;

      stAgg.records.push({
        date: reg.date.toISOString().slice(0, 10),
        status: rec.status,
        remarks: rec.remarks,
      });
    }
  }

  const sectionSummaries = Array.from(sectionAggregates.values()).map((s) => {
    const total = s.totalStudentEntries;
    const presentAndLate = s.presentCount + s.lateCount;
    return {
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      className: s.className,
      displayName: `${s.className} - ${s.sectionName}`,
      submittedRegistersCount: s.submittedRegistersCount,
      totalStudentEntries: total,
      presentCount: s.presentCount,
      absentCount: s.absentCount,
      lateCount: s.lateCount,
      excusedCount: s.excusedCount,
      attendancePercentage: total > 0 ? Number(((presentAndLate / total) * 100).toFixed(1)) : 0,
      strictPresentPercentage: total > 0 ? Number(((s.presentCount / total) * 100).toFixed(1)) : 0,
    };
  });

  const studentSummaries = Array.from(studentAggregates.values()).map((st) => {
    const totalDays = st.recordedDaysCount;
    const presentAndLate = st.presentCount + st.lateCount;
    return {
      studentId: st.studentId,
      studentName: st.studentName,
      admissionNumber: st.admissionNumber,
      sectionId: st.sectionId,
      recordedDaysCount: totalDays,
      presentCount: st.presentCount,
      absentCount: st.absentCount,
      lateCount: st.lateCount,
      excusedCount: st.excusedCount,
      attendancePercentage:
        totalDays > 0 ? Number(((presentAndLate / totalDays) * 100).toFixed(1)) : 0,
      strictPresentPercentage:
        totalDays > 0 ? Number(((st.presentCount / totalDays) * 100).toFixed(1)) : 0,
      history: st.records.slice(-30), // latest 30 records
    };
  });

  return {
    academicYear: { id: academicYear.id, name: academicYear.name },
    formulaDefinition: {
      formula: "(Present + Late) / Total Recorded Register Days * 100",
      denominator: "Total submitted daily registers for which student has an enrollment record",
      statutoryDisclaimer:
        "Preliminary attendance calculations based on submitted daily registers. Statutory attendance percentages require school holiday, leave policy, and operational calendar configurations.",
    },
    sections: sectionSummaries,
    students: studentSummaries,
    totalRegistersCount: registers.length,
  };
}

/**
 * Common tenant and authorization resolver for attendance API endpoints.
 */
export async function resolveSchoolAndAuthorizeAttendance(
  req: NextRequest,
  schoolSlug: string,
  mode: "view" | "mark" | "admin"
): Promise<{
  school: { id: string; name: string; slug: string; code: string; isActive: boolean };
  user: AuthenticatedUser;
}> {
  const user = await requireAuth(req);

  if (!schoolSlug || typeof schoolSlug !== "string") {
    throw new BadRequestError("Valid school slug is required");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug.trim() },
    select: { id: true, name: true, slug: true, code: true, isActive: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  // Cross-tenant verification
  assertSchoolAccess(user, school.id);

  // Accountant is strictly forbidden from attendance module
  if (user.role === "ACCOUNTANT") {
    await logAuditEvent({
      action: "ATTENDANCE_UNAUTHORIZED_ACCESS",
      entityType: "School",
      entityId: school.id,
      schoolId: school.id,
      userId: user.id,
      details: { role: user.role, reason: "Accountant attempted attendance access" },
    });
    throw new ForbiddenError(
      "Access denied: Accountants are not authorized to access student daily attendance registers"
    );
  }

  if (mode === "admin") {
    assertCanAdminCorrectAttendance(user, school.id);
  } else if (mode === "mark") {
    if (user.role !== "SCHOOL_ADMIN" && user.role !== "TEACHER" && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Access denied: Not authorized to mark attendance");
    }
  } else {
    // view
    if (user.role !== "SCHOOL_ADMIN" && user.role !== "TEACHER" && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Access denied: Not authorized to view attendance");
    }
  }

  return { school, user };
}
