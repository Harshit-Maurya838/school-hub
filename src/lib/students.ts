import { z } from "zod";
import { prisma } from "./prisma";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PreconditionFailedError,
} from "./errors";
import { logAuditEvent } from "./audit";
import { AuthenticatedUser } from "./auth";
import { assertSchoolAccess, requireAuth, requireRole } from "./rbac";
import { NextRequest } from "next/server";
import { Gender, GuardianRelationship } from "@/generated/prisma/enums";
import { assertCanAdmitStudent, assertClassAndSectionForSchool } from "./school-readiness";

// Authorization & School Context
export interface StudentSchoolContext {
  school: {
    id: string;
    name: string;
    slug: string;
    code: string;
    isActive: boolean;
  };
  user: AuthenticatedUser;
}

export async function resolveStudentSchoolAndAuthorize(
  req: NextRequest,
  schoolSlug: string,
  requiredAction: "read" | "write"
): Promise<StudentSchoolContext> {
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

  assertSchoolAccess(user, school.id);

  if (requiredAction === "write") {
    // Platform Super Admin or School Admin of this specific school
    if (user.role === "SUPER_ADMIN") {
      // Super admin platform maintenance allowed
    } else if (user.role === "SCHOOL_ADMIN" && user.schoolId === school.id) {
      // Authorized school admin
    } else {
      throw new ForbiddenError(
        "Only school administrators are authorized to manage student records and admissions"
      );
    }
  } else {
    // Reads: Staff (Admin, Teacher, Accountant) or Super Admin
    if (user.role === "SUPER_ADMIN") {
      // Super admin view allowed
    } else {
      if (user.schoolId !== school.id) {
        throw new ForbiddenError("Cross-tenant access forbidden");
      }
      requireRole(user, ["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"]);
    }
  }

  return { school, user };
}

// Zod Validation Schemas
export const guardianInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Guardian name must be at least 2 characters"),
  phone: z.string().trim().min(7, "Valid phone number is required"),
  email: z.string().trim().email("Invalid guardian email").optional().nullable().or(z.literal("")),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).default("GUARDIAN"),
  occupation: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
});

export const enrollmentInputSchema = z.object({
  classId: z.string().trim().min(1, "Class is required"),
  sectionId: z.string().trim().min(1, "Section is required"),
  academicYearId: z.string().trim().optional(),
  rollNumber: z.string().trim().optional().nullable(),
});

export const admitStudentSchema = z.object({
  name: z.string().trim().min(2, "Student name must be at least 2 characters"),
  admissionNumber: z.string().trim().min(1, "Admission number is required"),
  dob: z
    .string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date of birth" }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  apaarId: z.string().trim().optional().nullable(),
  guardians: z.array(guardianInputSchema).optional(),
  guardian: guardianInputSchema.optional(), // Legacy backward compatibility
  enrollment: enrollmentInputSchema.optional(),
  classId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  academicYearId: z.string().trim().optional(),
  rollNumber: z.string().trim().optional().nullable(),
});

export const updateStudentSchema = z.object({
  name: z.string().trim().min(2, "Student name must be at least 2 characters").optional(),
  admissionNumber: z.string().trim().min(1, "Admission number is required").optional(),
  dob: z
    .string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date of birth" })
    .optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  apaarId: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type AdmitStudentInput = z.infer<typeof admitStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export interface ListStudentsOptions {
  schoolId: string;
  search?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "ALL";
  page?: number;
  limit?: number;
  sortBy?: "name" | "admissionNumber" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Admits a student atomically:
 * 1. Verifies unique admissionNumber per school.
 * 2. If enrollment requested, validates prerequisites (readiness, current year, class/section match, capacity).
 * 3. In single DB transaction: creates Student, reuses/creates Guardian(s), creates StudentGuardian link(s), creates Enrollment.
 * 4. Logs audit event.
 */
export async function admitStudent(
  schoolId: string,
  input: AdmitStudentInput,
  actor: {
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const cleanAdmissionNumber = input.admissionNumber.trim();
  const cleanName = input.name.trim();

  // 1. Check uniqueness of admissionNumber per school
  const existingStudent = await prisma.student.findUnique({
    where: {
      schoolId_admissionNumber: {
        schoolId,
        admissionNumber: cleanAdmissionNumber,
      },
    },
  });

  if (existingStudent) {
    throw new ConflictError(
      `Student with admission number '${cleanAdmissionNumber}' already exists in this school`,
      { code: "DUPLICATE_ADMISSION_NUMBER" }
    );
  }

  // 2. Resolve Enrollment Information
  const classId = input.enrollment?.classId || input.classId;
  const sectionId = input.enrollment?.sectionId || input.sectionId;
  const requestedYearId = input.enrollment?.academicYearId || input.academicYearId;
  const rollNumber = input.enrollment?.rollNumber || input.rollNumber;

  const hasEnrollmentRequest = Boolean(classId || sectionId || requestedYearId);

  let targetAcademicYear: { id: string; name: string } | null = null;
  let validatedClass: { id: string; name: string } | null = null;
  let validatedSection: { id: string; name: string; capacity: number | null } | null = null;

  if (hasEnrollmentRequest) {
    // Assert school is active and ready, and current academic year is configured
    const currentYear = await assertCanAdmitStudent(schoolId);

    if (requestedYearId && requestedYearId.trim() !== currentYear.id) {
      // Validate specific requested academic year belongs to this school
      const specificYear = await prisma.academicYear.findFirst({
        where: { id: requestedYearId.trim(), schoolId },
        select: { id: true, name: true },
      });
      if (!specificYear) {
        throw new PreconditionFailedError(
          "Requested academic year does not belong to this school.",
          { prerequisite: "ACADEMIC_YEAR_NOT_FOUND" }
        );
      }
      targetAcademicYear = specificYear;
    } else {
      targetAcademicYear = currentYear;
    }

    if (!classId) {
      throw new PreconditionFailedError("Class is required for student enrollment.", {
        prerequisite: "CLASS_REQUIRED",
      });
    }

    if (!sectionId) {
      throw new PreconditionFailedError("Section is required for student enrollment.", {
        prerequisite: "SECTION_REQUIRED",
      });
    }

    const { classRecord, sectionRecord } = await assertClassAndSectionForSchool(
      schoolId,
      classId,
      sectionId
    );
    validatedClass = classRecord;
    validatedSection = sectionRecord;
  }

  // 3. Prepare Guardians list
  const guardiansToProcess: Array<{
    name: string;
    phone: string;
    email?: string | null;
    relationship: GuardianRelationship;
    occupation?: string | null;
    address?: string | null;
    isPrimary: boolean;
  }> = [];

  if (input.guardians && input.guardians.length > 0) {
    input.guardians.forEach((g, idx) => {
      guardiansToProcess.push({
        name: g.name.trim(),
        phone: g.phone.trim(),
        email: g.email?.trim() || null,
        relationship: g.relationship as GuardianRelationship,
        occupation: g.occupation?.trim() || null,
        address: g.address?.trim() || null,
        isPrimary: g.isPrimary ?? idx === 0,
      });
    });
  } else if (input.guardian) {
    guardiansToProcess.push({
      name: input.guardian.name.trim(),
      phone: input.guardian.phone.trim(),
      email: input.guardian.email?.trim() || null,
      relationship: input.guardian.relationship as GuardianRelationship,
      occupation: input.guardian.occupation?.trim() || null,
      address: input.guardian.address?.trim() || null,
      isPrimary: true,
    });
  }

  // Ensure at most one primary guardian if multiple provided
  const primaryCount = guardiansToProcess.filter((g) => g.isPrimary).length;
  if (primaryCount > 1) {
    let assigned = false;
    for (const g of guardiansToProcess) {
      if (!assigned && g.isPrimary) {
        assigned = true;
      } else {
        g.isPrimary = false;
      }
    }
  } else if (guardiansToProcess.length > 0 && primaryCount === 0) {
    guardiansToProcess[0].isPrimary = true;
  }

  // 4. Atomic Database Transaction
  const createdStudent = await prisma.$transaction(async (tx) => {
    // If enrollment is requested and section has a capacity limit, lock section row and enforce capacity
    if (validatedSection && targetAcademicYear) {
      if (validatedSection.capacity !== null && validatedSection.capacity !== undefined) {
        // Concurrency-safe row locking: locks the section record in PostgreSQL for the duration of this tx
        await tx.$executeRaw`SELECT id FROM sections WHERE id = ${validatedSection.id} FOR UPDATE`;

        const activeCount = await tx.enrollment.count({
          where: {
            sectionId: validatedSection.id,
            academicYearId: targetAcademicYear.id,
            status: "ACTIVE",
          },
        });

        if (activeCount >= validatedSection.capacity) {
          throw new ConflictError(
            `Section '${validatedSection.name}' has reached its maximum capacity of ${validatedSection.capacity} students.`,
            {
              code: "SECTION_CAPACITY_EXCEEDED",
              capacity: validatedSection.capacity,
              currentCount: activeCount,
            }
          );
        }
      }
    }

    // A. Create Student
    const student = await tx.student.create({
      data: {
        schoolId,
        name: cleanName,
        admissionNumber: cleanAdmissionNumber,
        dob: new Date(input.dob),
        gender: input.gender as Gender,
        apaarId: input.apaarId?.trim() || null,
        isActive: true,
      },
    });

    // B. Process Guardians
    for (const gInput of guardiansToProcess) {
      // Find or create guardian by (schoolId, phone)
      let guardian = await tx.guardian.findUnique({
        where: {
          schoolId_phone: {
            schoolId,
            phone: gInput.phone,
          },
        },
      });

      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            schoolId,
            name: gInput.name,
            phone: gInput.phone,
            email: gInput.email || null,
            occupation: gInput.occupation || null,
            address: gInput.address || null,
          },
        });
      } else {
        // Update contact fields if empty on existing record
        await tx.guardian.update({
          where: { id: guardian.id },
          data: {
            name: guardian.name || gInput.name,
            email: guardian.email || gInput.email || null,
            occupation: guardian.occupation || gInput.occupation || null,
            address: guardian.address || gInput.address || null,
          },
        });
      }

      // Link student and guardian
      await tx.studentGuardian.create({
        data: {
          schoolId,
          studentId: student.id,
          guardianId: guardian.id,
          relationship: gInput.relationship,
          isPrimary: gInput.isPrimary,
        },
      });
    }

    // C. Create Enrollment if requested
    if (validatedSection && targetAcademicYear) {
      await tx.enrollment.create({
        data: {
          schoolId,
          studentId: student.id,
          sectionId: validatedSection.id,
          academicYearId: targetAcademicYear.id,
          rollNumber: rollNumber?.trim() || null,
          status: "ACTIVE",
        },
      });
    }

    return student;
  });

  // 5. Audit Logging
  await logAuditEvent({
    action: "STUDENT_ADMITTED",
    entityType: "STUDENT",
    schoolId,
    userId: actor.userId,
    entityId: createdStudent.id,
    details: {
      name: createdStudent.name,
      admissionNumber: createdStudent.admissionNumber,
      guardiansCount: guardiansToProcess.length,
      enrolled: Boolean(validatedSection && targetAcademicYear),
      classId: validatedClass?.id,
      sectionId: validatedSection?.id,
      academicYearId: targetAcademicYear?.id,
      rollNumber: rollNumber?.trim() || null,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  // 6. Return fully populated student
  return getStudentById(schoolId, createdStudent.id);
}

/**
 * Retrieves a single student by ID within the tenant school.
 */
export async function getStudentById(schoolId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      guardians: {
        include: {
          guardian: true,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      enrollments: {
        include: {
          section: {
            include: {
              class: true,
            },
          },
          academicYear: true,
        },
        orderBy: [{ academicYear: { isCurrent: "desc" } }, { createdAt: "desc" }],
      },
    },
  });

  if (!student) {
    throw new NotFoundError("Student record not found in this school");
  }

  return student;
}

/**
 * Lists students with database-level pagination, search, and filters.
 */
export async function listStudents(options: ListStudentsOptions) {
  const {
    schoolId,
    search,
    academicYearId,
    classId,
    sectionId,
    status = "ACTIVE",
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const take = Math.min(Math.max(1, limit), 100);
  const skip = (Math.max(1, page) - 1) * take;

  // Build where clause
  const where: Record<string, unknown> = {
    schoolId,
  };

  // Status Filter
  if (status === "ACTIVE") {
    where.deletedAt = null;
    where.isActive = true;
  } else if (status === "INACTIVE") {
    where.deletedAt = null;
    where.isActive = false;
  } else if (status === "ARCHIVED") {
    where.deletedAt = { not: null };
  } else if (status === "ALL") {
    // Return all records (active, inactive, and archived)
  } else {
    where.deletedAt = null;
  }

  // Search Filter (name or admissionNumber)
  if (search && search.trim() !== "") {
    const cleanSearch = search.trim();
    where.OR = [
      { name: { contains: cleanSearch, mode: "insensitive" } },
      { admissionNumber: { contains: cleanSearch, mode: "insensitive" } },
    ];
  }

  // Enrollment Filters (academicYearId, classId, sectionId)
  if (academicYearId || classId || sectionId) {
    const enrollmentWhere: Record<string, unknown> = {};

    if (academicYearId) {
      enrollmentWhere.academicYearId = academicYearId;
    }
    if (sectionId) {
      enrollmentWhere.sectionId = sectionId;
    }
    if (classId) {
      enrollmentWhere.section = { classId };
    }

    where.enrollments = {
      some: enrollmentWhere,
    };
  }

  // Determine sort order
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sortBy === "name") {
    orderBy.name = sortOrder;
  } else if (sortBy === "admissionNumber") {
    orderBy.admissionNumber = sortOrder;
  } else {
    orderBy.createdAt = sortOrder;
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        guardians: {
          include: {
            guardian: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        enrollments: {
          include: {
            section: {
              include: {
                class: true,
              },
            },
            academicYear: true,
          },
          orderBy: [{ academicYear: { isCurrent: "desc" } }, { createdAt: "desc" }],
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  return {
    students,
    pagination: {
      page: Math.max(1, page),
      limit: take,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Updates permitted student profile details.
 */
export async function updateStudentProfile(
  schoolId: string,
  studentId: string,
  updates: UpdateStudentInput,
  actor: {
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });

  if (!student) {
    throw new NotFoundError("Student record not found in this school");
  }

  // If admissionNumber is changing, verify uniqueness
  if (updates.admissionNumber) {
    const cleanAdmissionNumber = updates.admissionNumber.trim();
    if (cleanAdmissionNumber !== student.admissionNumber) {
      const existing = await prisma.student.findUnique({
        where: {
          schoolId_admissionNumber: {
            schoolId,
            admissionNumber: cleanAdmissionNumber,
          },
        },
      });

      if (existing) {
        throw new ConflictError(
          `Student with admission number '${cleanAdmissionNumber}' already exists in this school`,
          { code: "DUPLICATE_ADMISSION_NUMBER" }
        );
      }
    }
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: {
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.admissionNumber ? { admissionNumber: updates.admissionNumber.trim() } : {}),
      ...(updates.dob ? { dob: new Date(updates.dob) } : {}),
      ...(updates.gender ? { gender: updates.gender as Gender } : {}),
      ...(updates.apaarId !== undefined ? { apaarId: updates.apaarId?.trim() || null } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    },
  });

  await logAuditEvent({
    action: "STUDENT_UPDATED",
    entityType: "STUDENT",
    schoolId,
    userId: actor.userId,
    entityId: student.id,
    details: updates as Record<string, unknown>,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return getStudentById(schoolId, updated.id);
}

/**
 * Safely archives a student record:
 * - Sets deletedAt timestamp and deactivates profile.
 * - Does NOT delete historical enrollments or guardians.
 */
export async function archiveStudent(
  schoolId: string,
  studentId: string,
  reason?: string,
  actor?: {
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });

  if (!student) {
    throw new NotFoundError("Student record not found in this school");
  }

  if (student.deletedAt) {
    throw new ConflictError("Student is already archived", { code: "ALREADY_ARCHIVED" });
  }

  const archived = await prisma.student.update({
    where: { id: student.id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  await logAuditEvent({
    action: "STUDENT_ARCHIVED",
    entityType: "STUDENT",
    schoolId,
    userId: actor?.userId,
    entityId: student.id,
    details: { reason: reason || "Administrative archival" },
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return archived;
}

/**
 * Restores an archived student record.
 */
export async function restoreStudent(
  schoolId: string,
  studentId: string,
  actor?: {
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });

  if (!student) {
    throw new NotFoundError("Student record not found in this school");
  }

  if (!student.deletedAt) {
    throw new ConflictError("Student is not archived", { code: "NOT_ARCHIVED" });
  }

  const restored = await prisma.student.update({
    where: { id: student.id },
    data: {
      deletedAt: null,
      isActive: true,
    },
  });

  await logAuditEvent({
    action: "STUDENT_RESTORED",
    entityType: "STUDENT",
    schoolId,
    userId: actor?.userId,
    entityId: student.id,
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return restored;
}

/**
 * Enrolls an existing student into an academic session and class/section.
 * Validates uniqueness: one enrollment per student per academic year.
 * Concurrency-safely checks section capacity.
 */
export async function enrollStudent(
  schoolId: string,
  studentId: string,
  input: {
    classId: string;
    sectionId: string;
    academicYearId?: string;
    rollNumber?: string | null;
  },
  actor?: {
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });

  if (!student) {
    throw new NotFoundError("Student record not found in this school");
  }

  // Resolve academic year
  let targetYear: { id: string; name: string };
  if (input.academicYearId) {
    const year = await prisma.academicYear.findFirst({
      where: { id: input.academicYearId.trim(), schoolId },
      select: { id: true, name: true },
    });
    if (!year) {
      throw new PreconditionFailedError("Academic year does not belong to this school.", {
        prerequisite: "ACADEMIC_YEAR_NOT_FOUND",
      });
    }
    targetYear = year;
  } else {
    targetYear = await assertCanAdmitStudent(schoolId);
  }

  // Prevent duplicate enrollment in the same academic year
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_academicYearId: {
        studentId: student.id,
        academicYearId: targetYear.id,
      },
    },
  });

  if (existingEnrollment) {
    throw new ConflictError(
      `Student is already enrolled in academic session '${targetYear.name}'.`,
      { code: "DUPLICATE_ENROLLMENT" }
    );
  }

  // Validate class & section
  const { sectionRecord } = await assertClassAndSectionForSchool(
    schoolId,
    input.classId,
    input.sectionId
  );

  // Transaction with section locking
  const enrollment = await prisma.$transaction(async (tx) => {
    if (sectionRecord.capacity !== null && sectionRecord.capacity !== undefined) {
      await tx.$executeRaw`SELECT id FROM sections WHERE id = ${sectionRecord.id} FOR UPDATE`;

      const activeCount = await tx.enrollment.count({
        where: {
          sectionId: sectionRecord.id,
          academicYearId: targetYear.id,
          status: "ACTIVE",
        },
      });

      if (activeCount >= sectionRecord.capacity) {
        throw new ConflictError(
          `Section '${sectionRecord.name}' has reached its maximum capacity of ${sectionRecord.capacity} students.`,
          {
            code: "SECTION_CAPACITY_EXCEEDED",
            capacity: sectionRecord.capacity,
            currentCount: activeCount,
          }
        );
      }
    }

    return tx.enrollment.create({
      data: {
        schoolId,
        studentId: student.id,
        sectionId: sectionRecord.id,
        academicYearId: targetYear.id,
        rollNumber: input.rollNumber?.trim() || null,
        status: "ACTIVE",
      },
    });
  });

  await logAuditEvent({
    action: "ENROLLMENT_CREATED",
    entityType: "ENROLLMENT",
    schoolId,
    userId: actor?.userId,
    entityId: enrollment.id,
    details: {
      studentId: student.id,
      sectionId: sectionRecord.id,
      academicYearId: targetYear.id,
      rollNumber: input.rollNumber?.trim() || null,
    },
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return enrollment;
}

/**
 * Links a guardian to a student.
 */
export async function addStudentGuardian(
  schoolId: string,
  studentId: string,
  guardianData: {
    name: string;
    phone: string;
    email?: string | null;
    relationship: GuardianRelationship;
    occupation?: string | null;
    address?: string | null;
    isPrimary?: boolean;
  },
  actor?: {
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });

  if (!student) {
    throw new NotFoundError("Student record not found in this school");
  }

  const cleanPhone = guardianData.phone.trim();

  // Find or create Guardian
  let guardian = await prisma.guardian.findUnique({
    where: {
      schoolId_phone: {
        schoolId,
        phone: cleanPhone,
      },
    },
  });

  if (!guardian) {
    guardian = await prisma.guardian.create({
      data: {
        schoolId,
        name: guardianData.name.trim(),
        phone: cleanPhone,
        email: guardianData.email?.trim() || null,
        occupation: guardianData.occupation?.trim() || null,
        address: guardianData.address?.trim() || null,
      },
    });
  }

  // Check if link already exists
  const existingLink = await prisma.studentGuardian.findUnique({
    where: {
      studentId_guardianId: {
        studentId: student.id,
        guardianId: guardian.id,
      },
    },
  });

  if (existingLink) {
    throw new ConflictError("Guardian is already linked to this student", {
      code: "GUARDIAN_ALREADY_LINKED",
    });
  }

  // If new link is marked primary, unset other primaries
  if (guardianData.isPrimary) {
    await prisma.studentGuardian.updateMany({
      where: { studentId: student.id },
      data: { isPrimary: false },
    });
  }

  const link = await prisma.studentGuardian.create({
    data: {
      schoolId,
      studentId: student.id,
      guardianId: guardian.id,
      relationship: guardianData.relationship,
      isPrimary: Boolean(guardianData.isPrimary),
    },
  });

  await logAuditEvent({
    action: "GUARDIAN_LINKED",
    entityType: "STUDENT_GUARDIAN",
    schoolId,
    userId: actor?.userId,
    entityId: link.id,
    details: {
      studentId: student.id,
      guardianId: guardian.id,
      relationship: guardianData.relationship,
      isPrimary: Boolean(guardianData.isPrimary),
    },
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return link;
}
