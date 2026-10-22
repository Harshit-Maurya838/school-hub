import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { AuthenticatedUser, assertSchoolAccess, requireAuth, requireRole } from "@/modules/auth";
import { NextRequest } from "next/server";
import {
  assertCanMutateAcademicYear,
  assertCanMutateClass,
  assertCanMutateSection,
  assertCanMutateSubject,
  getAcademicSetupReadiness,
} from "@/modules/onboarding";

// Authorization & School Context Helper
export interface SchoolContext {
  school: {
    id: string;
    name: string;
    slug: string;
    code: string;
    isActive: boolean;
  };
  user: AuthenticatedUser;
}

export async function resolveSchoolAndAuthorize(
  req: NextRequest,
  schoolSlug: string,
  requiredAction: "read" | "write"
): Promise<SchoolContext> {
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

  if (requiredAction === "write") {
    // Only SCHOOL_ADMIN belonging to this school can mutate academic configuration
    if (user.role !== "SCHOOL_ADMIN" || user.schoolId !== school.id) {
      throw new ForbiddenError(
        "Only the school administrator of this school is authorized to modify academic configuration"
      );
    }
  } else {
    // Reads: SCHOOL_ADMIN (belonging to this school), or TEACHER of this school
    if (user.role === "SUPER_ADMIN") {
      // Platform super admin can view for maintenance
    } else {
      if (user.schoolId !== school.id) {
        throw new ForbiddenError("Cross-tenant access forbidden");
      }
      requireRole(user, ["SCHOOL_ADMIN", "TEACHER"]);
    }
  }

  return { school, user };
}

// Zod Validation Schemas
export const createAcademicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Academic year name is required")
      .max(100, "Academic year name too long"),
    startDate: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
    endDate: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
    isCurrent: z.boolean().optional().default(false),
  })
  .refine((data) => new Date(data.endDate).getTime() > new Date(data.startDate).getTime(), {
    message: "End date must be later than start date",
    path: ["endDate"],
  });

export const updateAcademicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Academic year name is required")
      .max(100, "Academic year name too long")
      .optional(),
    startDate: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" })
      .optional(),
    endDate: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" })
      .optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate).getTime() > new Date(data.startDate).getTime();
      }
      return true;
    },
    {
      message: "End date must be later than start date",
      path: ["endDate"],
    }
  );

export const createClassSchema = z.object({
  name: z.string().trim().min(1, "Class name is required").max(50, "Class name too long"),
  numericOrder: z
    .number()
    .int("Order must be an integer")
    .min(0, "Order must be non-negative")
    .max(1000, "Order value too high")
    .optional()
    .nullable(),
});

export const updateClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Class name is required")
    .max(50, "Class name too long")
    .optional(),
  numericOrder: z
    .number()
    .int("Order must be an integer")
    .min(0, "Order must be non-negative")
    .max(1000, "Order value too high")
    .optional()
    .nullable(),
});

export const createSectionSchema = z.object({
  classId: z.string().trim().min(1, "Parent class is required"),
  name: z.string().trim().min(1, "Section name is required").max(30, "Section name too long"),
  capacity: z
    .number()
    .int("Capacity must be an integer")
    .positive("Capacity must be a positive integer")
    .max(500, "Capacity exceeds maximum allowed")
    .optional()
    .nullable(),
});

export const updateSectionSchema = z.object({
  classId: z.string().trim().min(1, "Parent class is required").optional(),
  name: z
    .string()
    .trim()
    .min(1, "Section name is required")
    .max(30, "Section name too long")
    .optional(),
  capacity: z
    .number()
    .int("Capacity must be an integer")
    .positive("Capacity must be a positive integer")
    .max(500, "Capacity exceeds maximum allowed")
    .optional()
    .nullable(),
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required").max(100, "Subject name too long"),
  code: z
    .string()
    .trim()
    .max(20, "Subject code too long")
    .transform((val) => (val === "" ? null : val.toUpperCase()))
    .optional()
    .nullable(),
  classId: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Subject name is required")
    .max(100, "Subject name too long")
    .optional(),
  code: z
    .string()
    .trim()
    .max(20, "Subject code too long")
    .transform((val) => (val === "" ? null : val.toUpperCase()))
    .optional()
    .nullable(),
  classId: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
});

//Academic Year Management
export async function listAcademicYears(schoolId: string) {
  return await prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });
}

export async function createAcademicYear(
  schoolId: string,
  input: z.infer<typeof createAcademicYearSchema>,
  userId?: string
) {
  await assertCanMutateAcademicYear(schoolId);

  const name = input.name.trim();
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  if (endDate.getTime() <= startDate.getTime()) {
    throw new BadRequestError("End date must be later than start date");
  }

  // Check name uniqueness in this school
  const existingName = await prisma.academicYear.findUnique({
    where: {
      schoolId_name: {
        schoolId,
        name,
      },
    },
  });

  if (existingName) {
    throw new ConflictError(`Academic year '${name}' already exists in this school`);
  }

  // Atomic creation inside transaction
  const academicYear = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      // Set any existing current academic year to isCurrent = false first
      await tx.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return await tx.academicYear.create({
      data: {
        schoolId,
        name,
        startDate,
        endDate,
        isCurrent: Boolean(input.isCurrent),
      },
    });
  });

  await logAuditEvent({
    action: "ACADEMIC_YEAR_CREATED",
    entityType: "AcademicYear",
    entityId: academicYear.id,
    schoolId,
    userId,
    details: {
      name: academicYear.name,
      isCurrent: academicYear.isCurrent,
      startDate: academicYear.startDate.toISOString(),
      endDate: academicYear.endDate.toISOString(),
    },
  });

  return academicYear;
}

export async function updateAcademicYear(
  schoolId: string,
  yearId: string,
  input: z.infer<typeof updateAcademicYearSchema>,
  userId?: string
) {
  await assertCanMutateAcademicYear(schoolId);

  const existing = await prisma.academicYear.findFirst({
    where: { id: yearId, schoolId },
  });

  if (!existing) {
    throw new NotFoundError("Academic year not found in this school");
  }

  const startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
  const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;

  if (endDate.getTime() <= startDate.getTime()) {
    throw new BadRequestError("End date must be later than start date");
  }

  if (input.name && input.name.trim() !== existing.name) {
    const duplicate = await prisma.academicYear.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: input.name.trim(),
        },
      },
    });
    if (duplicate && duplicate.id !== yearId) {
      throw new ConflictError(`Academic year '${input.name.trim()}' already exists in this school`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.isCurrent === true && !existing.isCurrent) {
      // Clear current from other years in the same school
      await tx.academicYear.updateMany({
        where: { schoolId, isCurrent: true, id: { not: yearId } },
        data: { isCurrent: false },
      });
    }

    return await tx.academicYear.update({
      where: { id: yearId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.startDate ? { startDate } : {}),
        ...(input.endDate ? { endDate } : {}),
        ...(input.isCurrent !== undefined ? { isCurrent: input.isCurrent } : {}),
      },
    });
  });

  await logAuditEvent({
    action: "ACADEMIC_YEAR_UPDATED",
    entityType: "AcademicYear",
    entityId: updated.id,
    schoolId,
    userId,
    details: {
      name: updated.name,
      isCurrent: updated.isCurrent,
    },
  });

  return updated;
}

export async function setCurrentAcademicYear(schoolId: string, yearId: string, userId?: string) {
  await assertCanMutateAcademicYear(schoolId);

  const target = await prisma.academicYear.findFirst({
    where: { id: yearId, schoolId },
  });

  if (!target) {
    throw new NotFoundError("Academic year not found in this school");
  }

  if (target.isCurrent) {
    return target; // Already current, no-op
  }

  // Atomically switch current year in transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Unset all currently active years in this school
    await tx.academicYear.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    // Set the selected year as current
    return await tx.academicYear.update({
      where: { id: yearId },
      data: { isCurrent: true },
    });
  });

  await logAuditEvent({
    action: "ACADEMIC_YEAR_SET_CURRENT",
    entityType: "AcademicYear",
    entityId: updated.id,
    schoolId,
    userId,
    details: {
      name: updated.name,
      previousCurrentId: target.id,
    },
  });

  return updated;
}

export async function deleteAcademicYear(schoolId: string, yearId: string, userId?: string) {
  await assertCanMutateAcademicYear(schoolId);

  const existing = await prisma.academicYear.findFirst({
    where: { id: yearId, schoolId },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError("Academic year not found in this school");
  }

  if (existing.isCurrent) {
    throw new ConflictError(
      "Cannot delete the current active academic year. Switch the active year first."
    );
  }

  if (existing._count.enrollments > 0) {
    throw new ConflictError(
      `Cannot delete academic year '${existing.name}' because it contains ${existing._count.enrollments} student enrollment record(s).`
    );
  }

  await prisma.academicYear.delete({
    where: { id: yearId },
  });

  await logAuditEvent({
    action: "ACADEMIC_YEAR_DELETED",
    entityType: "AcademicYear",
    entityId: yearId,
    schoolId,
    userId,
    details: { name: existing.name },
  });

  return { success: true };
}

// ============================================================================
// Phase C: Class Management
// ============================================================================

export async function listClasses(schoolId: string, search?: string) {
  const whereClause: {
    schoolId: string;
    name?: { contains: string; mode: "insensitive" };
  } = { schoolId };

  if (search && search.trim() !== "") {
    whereClause.name = { contains: search.trim(), mode: "insensitive" };
  }

  return await prisma.class.findMany({
    where: whereClause,
    orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
    include: {
      sections: {
        select: {
          id: true,
          name: true,
          capacity: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: "asc" },
      },
      subjects: {
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      },
      _count: {
        select: {
          sections: true,
          subjects: true,
        },
      },
    },
  });
}

export async function createClass(
  schoolId: string,
  input: z.infer<typeof createClassSchema>,
  userId?: string
) {
  await assertCanMutateClass(schoolId);

  const name = input.name.trim();

  // Check unique class name in this school
  const existing = await prisma.class.findUnique({
    where: {
      schoolId_name: {
        schoolId,
        name,
      },
    },
  });

  if (existing) {
    throw new ConflictError(`Class '${name}' already exists in this school`);
  }

  const newClass = await prisma.class.create({
    data: {
      schoolId,
      name,
      numericOrder: input.numericOrder ?? null,
    },
    include: {
      _count: {
        select: { sections: true, subjects: true },
      },
    },
  });

  await logAuditEvent({
    action: "CLASS_CREATED",
    entityType: "Class",
    entityId: newClass.id,
    schoolId,
    userId,
    details: { name: newClass.name, numericOrder: newClass.numericOrder },
  });

  return newClass;
}

export async function updateClass(
  schoolId: string,
  classId: string,
  input: z.infer<typeof updateClassSchema>,
  userId?: string
) {
  await assertCanMutateClass(schoolId);

  const existing = await prisma.class.findFirst({
    where: { id: classId, schoolId },
  });

  if (!existing) {
    throw new NotFoundError("Class not found in this school");
  }

  if (input.name && input.name.trim() !== existing.name) {
    const duplicate = await prisma.class.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: input.name.trim(),
        },
      },
    });
    if (duplicate && duplicate.id !== classId) {
      throw new ConflictError(`Class '${input.name.trim()}' already exists in this school`);
    }
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.numericOrder !== undefined ? { numericOrder: input.numericOrder } : {}),
    },
    include: {
      _count: {
        select: { sections: true, subjects: true },
      },
    },
  });

  await logAuditEvent({
    action: "CLASS_UPDATED",
    entityType: "Class",
    entityId: updated.id,
    schoolId,
    userId,
    details: { name: updated.name, numericOrder: updated.numericOrder },
  });

  return updated;
}

export async function deleteClass(schoolId: string, classId: string, userId?: string) {
  await assertCanMutateClass(schoolId);

  const existing = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    include: {
      _count: {
        select: {
          sections: true,
          subjects: true,
        },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError("Class not found in this school");
  }

  if (existing._count.sections > 0 || existing._count.subjects > 0) {
    throw new ConflictError(
      `Cannot delete class '${existing.name}' with existing relationships (${existing._count.sections} section(s), ${existing._count.subjects} subject(s)). Please delete or reassign them first.`
    );
  }

  await prisma.class.delete({
    where: { id: classId },
  });

  await logAuditEvent({
    action: "CLASS_DELETED",
    entityType: "Class",
    entityId: classId,
    schoolId,
    userId,
    details: { name: existing.name },
  });

  return { success: true };
}

// ============================================================================
// Phase D: Section Management
// ============================================================================

export async function listSections(schoolId: string, classId?: string, academicYearId?: string) {
  const whereClause: {
    schoolId: string;
    classId?: string;
  } = { schoolId };

  if (classId && classId.trim() !== "") {
    whereClause.classId = classId.trim();
  }

  const sections = await prisma.section.findMany({
    where: whereClause,
    orderBy: [{ class: { numericOrder: "asc" } }, { class: { name: "asc" } }, { name: "asc" }],
    include: {
      class: {
        select: { id: true, name: true, numericOrder: true },
      },
      classTeacherAssignments: {
        where: {
          status: "ACTIVE",
          ...(academicYearId ? { academicYearId } : {}),
        },
        include: {
          teacher: {
            include: { user: true },
          },
        },
        take: 1,
      },
      _count: {
        select: {
          enrollments: true,
          subjectTeacherAssignments: {
            where: {
              status: "ACTIVE",
              ...(academicYearId ? { academicYearId } : {}),
            },
          },
        },
      },
    },
  });

  return sections.map((sec) => ({
    id: sec.id,
    name: sec.name,
    capacity: sec.capacity,
    classId: sec.classId,
    createdAt: sec.createdAt,
    updatedAt: sec.updatedAt,
    class: sec.class,
    _count: {
      enrollments: sec._count.enrollments,
      subjectAssignments: sec._count.subjectTeacherAssignments,
    },
    classTeacher: sec.classTeacherAssignments[0]
      ? {
          id: sec.classTeacherAssignments[0].teacher.id,
          name: sec.classTeacherAssignments[0].teacher.user.name,
          employeeId: sec.classTeacherAssignments[0].teacher.employeeId,
        }
      : null,
  }));
}

export async function createSection(
  schoolId: string,
  input: z.infer<typeof createSectionSchema>,
  userId?: string
) {
  const name = input.name.trim();
  const classId = input.classId.trim();

  // Validate prerequisites and parent class
  const parentClass = await assertCanMutateSection(schoolId, classId);

  // Check section name uniqueness within this class
  const existing = await prisma.section.findUnique({
    where: {
      classId_name: {
        classId,
        name,
      },
    },
  });

  if (existing) {
    throw new ConflictError(`Section '${name}' already exists in class '${parentClass.name}'`);
  }

  if (input.capacity !== null && input.capacity !== undefined && input.capacity <= 0) {
    throw new BadRequestError("Capacity must be a positive integer");
  }

  const section = await prisma.section.create({
    data: {
      schoolId,
      classId,
      name,
      capacity: input.capacity ?? null,
    },
    include: {
      class: {
        select: { id: true, name: true },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });

  await logAuditEvent({
    action: "SECTION_CREATED",
    entityType: "Section",
    entityId: section.id,
    schoolId,
    userId,
    details: {
      name: section.name,
      classId: section.classId,
      className: parentClass.name,
      capacity: section.capacity,
    },
  });

  return section;
}

export async function updateSection(
  schoolId: string,
  sectionId: string,
  input: z.infer<typeof updateSectionSchema>,
  userId?: string
) {
  const existing = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    include: { class: true },
  });

  if (!existing) {
    throw new NotFoundError("Section not found in this school");
  }

  const targetClassId = input.classId ? input.classId.trim() : existing.classId;
  await assertCanMutateSection(schoolId, targetClassId);

  const targetName = input.name ? input.name.trim() : existing.name;

  if (targetName !== existing.name || targetClassId !== existing.classId) {
    const duplicate = await prisma.section.findUnique({
      where: {
        classId_name: {
          classId: targetClassId,
          name: targetName,
        },
      },
    });

    if (duplicate && duplicate.id !== sectionId) {
      throw new ConflictError(`Section '${targetName}' already exists in the selected class`);
    }
  }

  if (input.capacity !== null && input.capacity !== undefined && input.capacity <= 0) {
    throw new BadRequestError("Capacity must be a positive integer");
  }

  const updated = await prisma.section.update({
    where: { id: sectionId },
    data: {
      ...(input.name ? { name: targetName } : {}),
      ...(input.classId ? { classId: targetClassId } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
    },
    include: {
      class: {
        select: { id: true, name: true },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });

  await logAuditEvent({
    action: "SECTION_UPDATED",
    entityType: "Section",
    entityId: updated.id,
    schoolId,
    userId,
    details: {
      name: updated.name,
      classId: updated.classId,
      capacity: updated.capacity,
    },
  });

  return updated;
}

export async function deleteSection(schoolId: string, sectionId: string, userId?: string) {
  await assertCanMutateClass(schoolId);

  const existing = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    include: {
      class: true,
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError("Section not found in this school");
  }

  if (existing._count.enrollments > 0) {
    throw new ConflictError(
      `Cannot delete section '${existing.name}' of class '${existing.class.name}' because it contains ${existing._count.enrollments} active student enrollment(s).`
    );
  }

  await prisma.section.delete({
    where: { id: sectionId },
  });

  await logAuditEvent({
    action: "SECTION_DELETED",
    entityType: "Section",
    entityId: sectionId,
    schoolId,
    userId,
    details: { name: existing.name, classId: existing.classId },
  });

  return { success: true };
}

// ============================================================================
// Phase E: Subject Management
// ============================================================================

export async function listSubjects(schoolId: string, classId?: string | "school-wide") {
  const whereClause: {
    schoolId: string;
    classId?: string | null;
  } = { schoolId };

  if (classId === "school-wide") {
    whereClause.classId = null;
  } else if (classId && classId.trim() !== "") {
    whereClause.classId = classId.trim();
  }

  return await prisma.subject.findMany({
    where: whereClause,
    orderBy: [{ class: { numericOrder: "asc" } }, { class: { name: "asc" } }, { name: "asc" }],
    include: {
      class: {
        select: { id: true, name: true, numericOrder: true },
      },
    },
  });
}

export async function createSubject(
  schoolId: string,
  input: z.infer<typeof createSubjectSchema>,
  userId?: string
) {
  const name = input.name.trim();
  const code = input.code ? input.code.trim().toUpperCase() : null;
  const classId = input.classId ? input.classId.trim() : null;

  await assertCanMutateSubject(schoolId, classId);

  // Check duplicate subject name within the appropriate scope
  const duplicate = await prisma.subject.findFirst({
    where: {
      schoolId,
      classId,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (duplicate) {
    const scopeDescription = classId ? "this class" : "school-wide subjects";
    throw new ConflictError(`Subject with name '${name}' already exists in ${scopeDescription}`);
  }

  const subject = await prisma.subject.create({
    data: {
      schoolId,
      classId,
      name,
      code,
    },
    include: {
      class: {
        select: { id: true, name: true },
      },
    },
  });

  await logAuditEvent({
    action: "SUBJECT_CREATED",
    entityType: "Subject",
    entityId: subject.id,
    schoolId,
    userId,
    details: {
      name: subject.name,
      code: subject.code,
      classId: subject.classId,
      isSchoolWide: subject.classId === null,
    },
  });

  return subject;
}

export async function updateSubject(
  schoolId: string,
  subjectId: string,
  input: z.infer<typeof updateSubjectSchema>,
  userId?: string
) {
  const existing = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
  });

  if (!existing) {
    throw new NotFoundError("Subject not found in this school");
  }

  const targetClassId =
    input.classId !== undefined ? (input.classId ? input.classId.trim() : null) : existing.classId;

  await assertCanMutateSubject(schoolId, targetClassId);

  const targetName = input.name ? input.name.trim() : existing.name;

  if (
    targetName.toLowerCase() !== existing.name.toLowerCase() ||
    targetClassId !== existing.classId
  ) {
    const duplicate = await prisma.subject.findFirst({
      where: {
        schoolId,
        classId: targetClassId,
        name: { equals: targetName, mode: "insensitive" },
        id: { not: subjectId },
      },
    });

    if (duplicate) {
      const scopeDescription = targetClassId ? "this class" : "school-wide subjects";
      throw new ConflictError(
        `Subject with name '${targetName}' already exists in ${scopeDescription}`
      );
    }
  }

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data: {
      ...(input.name ? { name: targetName } : {}),
      ...(input.code !== undefined
        ? { code: input.code ? input.code.trim().toUpperCase() : null }
        : {}),
      ...(input.classId !== undefined ? { classId: targetClassId } : {}),
    },
    include: {
      class: {
        select: { id: true, name: true },
      },
    },
  });

  await logAuditEvent({
    action: "SUBJECT_UPDATED",
    entityType: "Subject",
    entityId: updated.id,
    schoolId,
    userId,
    details: {
      name: updated.name,
      code: updated.code,
      classId: updated.classId,
    },
  });

  return updated;
}

export async function deleteSubject(schoolId: string, subjectId: string, userId?: string) {
  await assertCanMutateClass(schoolId);

  const existing = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
  });

  if (!existing) {
    throw new NotFoundError("Subject not found in this school");
  }

  await prisma.subject.delete({
    where: { id: subjectId },
  });

  await logAuditEvent({
    action: "SUBJECT_DELETED",
    entityType: "Subject",
    entityId: subjectId,
    schoolId,
    userId,
    details: { name: existing.name, classId: existing.classId },
  });

  return { success: true };
}

// ============================================================================
// Academic Summary Overview (for Dashboard / Academic Hub)
// ============================================================================

export async function getAcademicOverview(schoolId: string, schoolSlug?: string) {
  const [currentYear, yearsCount, classesCount, sectionsCount, subjectsCount, readiness] =
    await Promise.all([
      prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      }),
      prisma.academicYear.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.section.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId } }),
      getAcademicSetupReadiness(schoolId, schoolSlug),
    ]);

  return {
    currentYear,
    stats: {
      yearsCount,
      classesCount,
      sectionsCount,
      subjectsCount,
    },
    readiness,
  };
}
