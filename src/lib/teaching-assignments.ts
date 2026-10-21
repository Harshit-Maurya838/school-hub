import { prisma } from "./prisma";
import { NotFoundError, BadRequestError, ConflictError, PreconditionFailedError } from "./errors";
import { logAuditEvent } from "./audit";

export const HIGH_WORKLOAD_SECTION_THRESHOLD = 6;

export interface AssignClassTeacherParams {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  teacherProfileId: string;
  notes?: string;
  actorUserId?: string;
}

export interface AssignSubjectTeacherParams {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherProfileId: string;
  periodsPerWeek?: number | null;
  notes?: string;
  actorUserId?: string;
}

export interface RemoveSubjectTeacherParams {
  schoolId: string;
  assignmentId: string;
  actorUserId?: string;
}

export interface WorkloadSummary {
  sectionsCount: number;
  subjectsCount: number;
  totalPeriodsPerWeek?: number;
  isClassTeacher: boolean;
  classTeacherSectionName?: string;
  isHighWorkload: boolean;
  warning?: string;
}

/**
 * Calculates a teacher's teaching load across an academic year.
 */
export async function calculateTeacherWorkload(
  schoolId: string,
  teacherProfileId: string,
  academicYearId: string
): Promise<WorkloadSummary> {
  const [classAssignments, subjectAssignments] = await Promise.all([
    prisma.classTeacherAssignment.findMany({
      where: {
        schoolId,
        teacherProfileId,
        academicYearId,
        status: "ACTIVE",
      },
      include: { section: true, class: true },
    }),
    prisma.subjectTeacherAssignment.findMany({
      where: {
        schoolId,
        teacherProfileId,
        academicYearId,
        status: "ACTIVE",
      },
      select: { sectionId: true, subjectId: true, periodsPerWeek: true },
    }),
  ]);

  const uniqueSections = new Set([
    ...classAssignments.map((ca) => ca.sectionId),
    ...subjectAssignments.map((sa) => sa.sectionId),
  ]);
  const uniqueSubjects = new Set(subjectAssignments.map((sa) => sa.subjectId));

  const sectionsCount = uniqueSections.size;
  const isHighWorkload = sectionsCount > HIGH_WORKLOAD_SECTION_THRESHOLD;
  const totalPeriodsPerWeek = subjectAssignments.reduce(
    (sum, sa) => sum + (sa.periodsPerWeek || 0),
    0
  );

  let warning: string | undefined;
  if (isHighWorkload) {
    warning = `High Teaching Load: Faculty member is currently assigned to ${sectionsCount} sections (warning threshold: >${HIGH_WORKLOAD_SECTION_THRESHOLD}).`;
  }

  return {
    sectionsCount,
    subjectsCount: uniqueSubjects.size,
    totalPeriodsPerWeek,
    isClassTeacher: classAssignments.length > 0,
    classTeacherSectionName: classAssignments[0]
      ? `${classAssignments[0].class.name} - ${classAssignments[0].section.name}`
      : undefined,
    isHighWorkload,
    warning,
  };
}

/**
 * Validates prerequisites and assigns/reassigns a class teacher to a section for an academic year.
 * Retains complete history by marking any prior active assignment as REPLACED.
 */
export async function assignClassTeacher(params: AssignClassTeacherParams) {
  const { schoolId, academicYearId, classId, sectionId, teacherProfileId, notes, actorUserId } =
    params;

  // 1. Verify Academic Year
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId },
    select: { id: true, name: true },
  });
  if (!academicYear) {
    throw new NotFoundError("Academic year not found in this school");
  }

  // 2. Verify Class
  const classRecord = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true },
  });
  if (!classRecord) {
    throw new NotFoundError("Class not found in this school");
  }

  // 3. Verify Section and validate class/section relationship
  const sectionRecord = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    select: { id: true, name: true, classId: true },
  });
  if (!sectionRecord) {
    throw new NotFoundError("Section not found in this school");
  }
  if (sectionRecord.classId !== classRecord.id) {
    throw new BadRequestError(
      `Section '${sectionRecord.name}' does not belong to Class '${classRecord.name}'`
    );
  }

  // 4. Verify Teacher Profile and active employment status
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { id: teacherProfileId, schoolId },
    include: { user: true },
  });
  if (!teacherProfile) {
    throw new NotFoundError("Teacher profile not found in this school");
  }

  if (
    !teacherProfile.user.isActive ||
    teacherProfile.user.deletedAt !== null ||
    teacherProfile.status !== "ACTIVE"
  ) {
    throw new PreconditionFailedError(
      `Cannot assign inactive teacher '${teacherProfile.user.name}' (status: ${teacherProfile.status}, user active: ${teacherProfile.user.isActive})`,
      { prerequisite: "TEACHER_MUST_BE_ACTIVE" }
    );
  }

  // 5. Execute assignment in a database transaction with row-level locking
  const result = await prisma.$transaction(async (tx) => {
    // Lock section row to strictly serialize concurrent assignments to this section
    await tx.$executeRaw`SELECT id FROM "sections" WHERE id = ${sectionRecord.id} FOR UPDATE`;

    // Check for existing active class teacher assignment for this section & year
    const existingActive = await tx.classTeacherAssignment.findFirst({
      where: {
        academicYearId,
        sectionId,
        status: "ACTIVE",
      },
    });

    let isReplacement = false;
    if (existingActive) {
      if (existingActive.teacherProfileId === teacherProfile.id) {
        throw new ConflictError(
          `Teacher '${teacherProfile.user.name}' is already assigned as the active class teacher for Section '${sectionRecord.name}' in academic year '${academicYear.name}'`
        );
      }

      // Reassignment: mark current as REPLACED and record end date
      isReplacement = true;
      await tx.classTeacherAssignment.update({
        where: { id: existingActive.id },
        data: {
          status: "REPLACED",
          endDate: new Date(),
        },
      });
    }

    // Create new active assignment
    const created = await tx.classTeacherAssignment.create({
      data: {
        schoolId,
        academicYearId,
        classId: classRecord.id,
        sectionId: sectionRecord.id,
        teacherProfileId: teacherProfile.id,
        status: "ACTIVE",
        startDate: new Date(),
        notes: notes?.trim() || null,
      },
      include: {
        teacher: { include: { user: true } },
        class: true,
        section: true,
        academicYear: true,
      },
    });

    return { ...created, isReplacement };
  });

  // 6. Audit logging
  await logAuditEvent({
    action: result.isReplacement ? "CLASS_TEACHER_REPLACED" : "CLASS_TEACHER_ASSIGNED",
    entityType: "ClassTeacherAssignment",
    entityId: result.id,
    schoolId,
    userId: actorUserId,
    details: {
      className: classRecord.name,
      sectionName: sectionRecord.name,
      academicYearName: academicYear.name,
      teacherName: teacherProfile.user.name,
      teacherEmployeeId: teacherProfile.employeeId,
      isReplacement: result.isReplacement,
    },
  });

  return result;
}

/**
 * Validates prerequisites and assigns a teacher to teach a subject in a specific section.
 * Prevents duplicate active assignments and checks workload warnings.
 */
export async function assignSubjectTeacher(params: AssignSubjectTeacherParams) {
  const {
    schoolId,
    academicYearId,
    classId,
    sectionId,
    subjectId,
    teacherProfileId,
    periodsPerWeek,
    notes,
    actorUserId,
  } = params;

  // 1. Verify Academic Year
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId },
    select: { id: true, name: true },
  });
  if (!academicYear) {
    throw new NotFoundError("Academic year not found in this school");
  }

  // 2. Verify Class
  const classRecord = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true },
  });
  if (!classRecord) {
    throw new NotFoundError("Class not found in this school");
  }

  // 3. Verify Section and validate section belongs to class
  const sectionRecord = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    select: { id: true, name: true, classId: true },
  });
  if (!sectionRecord) {
    throw new NotFoundError("Section not found in this school");
  }
  if (sectionRecord.classId !== classRecord.id) {
    throw new BadRequestError(
      `Section '${sectionRecord.name}' does not belong to Class '${classRecord.name}'`
    );
  }

  // 4. Verify Subject and validate subject belongs to class (or is school-wide)
  const subjectRecord = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
    select: { id: true, name: true, code: true, classId: true },
  });
  if (!subjectRecord) {
    throw new NotFoundError("Subject not found in this school");
  }
  if (subjectRecord.classId !== null && subjectRecord.classId !== classRecord.id) {
    throw new BadRequestError(
      `Subject '${subjectRecord.name}' is designated for a different class and cannot be assigned to Class '${classRecord.name}'`
    );
  }

  // 5. Verify Teacher Profile and active employment status
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { id: teacherProfileId, schoolId },
    include: { user: true },
  });
  if (!teacherProfile) {
    throw new NotFoundError("Teacher profile not found in this school");
  }

  if (
    !teacherProfile.user.isActive ||
    teacherProfile.user.deletedAt !== null ||
    teacherProfile.status !== "ACTIVE"
  ) {
    throw new PreconditionFailedError(
      `Cannot assign inactive teacher '${teacherProfile.user.name}' (status: ${teacherProfile.status}, user active: ${teacherProfile.user.isActive})`,
      { prerequisite: "TEACHER_MUST_BE_ACTIVE" }
    );
  }

  // 6. Execute assignment in a database transaction with row-level locking
  const assignment = await prisma.$transaction(async (tx) => {
    // Lock section row to strictly serialize concurrent subject assignments
    await tx.$executeRaw`SELECT id FROM "sections" WHERE id = ${sectionRecord.id} FOR UPDATE`;

    const existingActive = await tx.subjectTeacherAssignment.findFirst({
      where: {
        academicYearId,
        sectionId,
        subjectId,
        status: "ACTIVE",
      },
      include: {
        teacher: { include: { user: true } },
      },
    });

    if (existingActive) {
      if (existingActive.teacherProfileId === teacherProfile.id) {
        throw new ConflictError(
          `Teacher '${teacherProfile.user.name}' is already actively assigned to '${subjectRecord.name}' in Section ${sectionRecord.name} for this academic year`
        );
      }
      throw new ConflictError(
        `Teacher '${existingActive.teacher.user.name}' is already assigned to '${subjectRecord.name}' in Section ${sectionRecord.name}. Remove the existing assignment first.`
      );
    }

    return await tx.subjectTeacherAssignment.create({
      data: {
        schoolId,
        academicYearId,
        classId: classRecord.id,
        sectionId: sectionRecord.id,
        subjectId: subjectRecord.id,
        teacherProfileId: teacherProfile.id,
        status: "ACTIVE",
        startDate: new Date(),
        periodsPerWeek: periodsPerWeek !== undefined ? periodsPerWeek : null,
        notes: notes?.trim() || null,
      },
      include: {
        teacher: { include: { user: true } },
        class: true,
        section: true,
        subject: true,
        academicYear: true,
      },
    });
  });

  // 8. Compute workload warning
  const workload = await calculateTeacherWorkload(schoolId, teacherProfile.id, academicYearId);

  // 9. Audit logging
  await logAuditEvent({
    action: "SUBJECT_TEACHER_ASSIGNED",
    entityType: "SubjectTeacherAssignment",
    entityId: assignment.id,
    schoolId,
    userId: actorUserId,
    details: {
      className: classRecord.name,
      sectionName: sectionRecord.name,
      subjectName: subjectRecord.name,
      teacherName: teacherProfile.user.name,
      teacherEmployeeId: teacherProfile.employeeId,
      academicYearName: academicYear.name,
      workloadWarning: workload.warning || null,
    },
  });

  return {
    assignment,
    workload,
  };
}

/**
 * Safely deactivates or removes a subject teaching assignment.
 */
export async function removeSubjectTeacherAssignment(params: RemoveSubjectTeacherParams) {
  const { schoolId, assignmentId, actorUserId } = params;

  const assignment = await prisma.subjectTeacherAssignment.findFirst({
    where: { id: assignmentId, schoolId },
    include: {
      teacher: { include: { user: true } },
      subject: true,
      section: true,
      class: true,
      academicYear: true,
    },
  });

  if (!assignment) {
    throw new NotFoundError("Subject teaching assignment not found in this school");
  }

  const updated = await prisma.subjectTeacherAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "CANCELLED",
      endDate: new Date(),
    },
  });

  await logAuditEvent({
    action: "SUBJECT_TEACHER_REMOVED",
    entityType: "SubjectTeacherAssignment",
    entityId: assignment.id,
    schoolId,
    userId: actorUserId,
    details: {
      className: assignment.class.name,
      sectionName: assignment.section.name,
      subjectName: assignment.subject.name,
      teacherName: assignment.teacher.user.name,
      academicYearName: assignment.academicYear.name,
    },
  });

  return updated;
}

/**
 * Retrieves the comprehensive faculty assignment overview for a specific section and academic year.
 */
export async function getSectionTeachingAssignments(
  schoolId: string,
  academicYearId: string,
  sectionId: string
) {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    include: {
      class: true,
    },
  });

  if (!section) {
    throw new NotFoundError("Section not found in this school");
  }

  const [classTeacher, classTeacherHistory, subjectAssignments, subjects, teachers] =
    await Promise.all([
      // Current active class teacher
      prisma.classTeacherAssignment.findFirst({
        where: {
          schoolId,
          academicYearId,
          sectionId,
          status: "ACTIVE",
        },
        include: {
          teacher: { include: { user: true } },
        },
      }),

      // History of class teachers for this section & year
      prisma.classTeacherAssignment.findMany({
        where: {
          schoolId,
          academicYearId,
          sectionId,
          status: { not: "ACTIVE" },
        },
        orderBy: { startDate: "desc" },
        include: {
          teacher: { include: { user: true } },
        },
      }),

      // Active subject teacher assignments
      prisma.subjectTeacherAssignment.findMany({
        where: {
          schoolId,
          academicYearId,
          sectionId,
          status: "ACTIVE",
        },
        include: {
          subject: true,
          teacher: { include: { user: true } },
        },
      }),

      // Available subjects for this class (class-specific or school-wide)
      prisma.subject.findMany({
        where: {
          schoolId,
          OR: [{ classId: section.classId }, { classId: null }],
        },
        orderBy: { name: "asc" },
      }),

      // Available active teachers in the school
      prisma.teacherProfile.findMany({
        where: {
          schoolId,
          status: "ACTIVE",
          user: { isActive: true, deletedAt: null },
        },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      }),
    ]);

  return {
    section: {
      id: section.id,
      name: section.name,
      classId: section.classId,
      className: section.class.name,
    },
    classTeacher: classTeacher
      ? {
          id: classTeacher.id,
          teacherProfileId: classTeacher.teacherProfileId,
          name: classTeacher.teacher.user.name,
          email: classTeacher.teacher.user.email,
          phone: classTeacher.teacher.user.phone,
          employeeId: classTeacher.teacher.employeeId,
          designation: classTeacher.teacher.designation,
          startDate: classTeacher.startDate.toISOString(),
          status: classTeacher.status,
          notes: classTeacher.notes,
        }
      : null,
    classTeacherHistory: classTeacherHistory.map((h) => ({
      id: h.id,
      name: h.teacher.user.name,
      employeeId: h.teacher.employeeId,
      startDate: h.startDate.toISOString(),
      endDate: h.endDate ? h.endDate.toISOString() : null,
      status: h.status,
    })),
    subjectTeachers: subjectAssignments.map((sa) => ({
      id: sa.id,
      subjectId: sa.subjectId,
      subjectName: sa.subject.name,
      subjectCode: sa.subject.code,
      teacherProfileId: sa.teacherProfileId,
      teacherName: sa.teacher.user.name,
      employeeId: sa.teacher.employeeId,
      periodsPerWeek: sa.periodsPerWeek,
      startDate: sa.startDate.toISOString(),
      status: sa.status,
      notes: sa.notes,
    })),
    availableSubjects: subjects.map((sub) => ({
      id: sub.id,
      name: sub.name,
      code: sub.code,
      isClassSpecific: sub.classId !== null,
    })),
    availableTeachers: teachers.map((t) => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      employeeId: t.employeeId,
      department: t.department,
      designation: t.designation,
    })),
  };
}
