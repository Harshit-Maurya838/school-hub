import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError, ConflictError } from "@/lib/errors";
import { Gender, GuardianRelationship } from "@/generated/prisma/enums";

const createStudentSchema = z.object({
  name: z.string().min(2, "Student name must be at least 2 characters"),
  admissionNumber: z.string().min(1, "Admission number is required"),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date of birth" }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  apaarId: z.string().optional(),
  guardian: z
    .object({
      name: z.string().min(2, "Guardian name is required"),
      phone: z.string().min(7, "Valid phone number is required"),
      email: z.string().email("Invalid guardian email").optional().nullable(),
      relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).default("GUARDIAN"),
      occupation: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, isActive: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  assertSchoolAccess(user, school.id);

  const body = await req.json().catch(() => ({}));
  const validated = createStudentSchema.parse(body);

  // Check unique admissionNumber in this school
  const existingAdmission = await prisma.student.findUnique({
    where: {
      schoolId_admissionNumber: {
        schoolId: school.id,
        admissionNumber: validated.admissionNumber.trim(),
      },
    },
  });

  if (existingAdmission) {
    throw new ConflictError(
      `Admission number '${validated.admissionNumber}' already exists in this school`
    );
  }

  const student = await prisma.$transaction(async (tx) => {
    const newStudent = await tx.student.create({
      data: {
        schoolId: school.id,
        name: validated.name.trim(),
        admissionNumber: validated.admissionNumber.trim(),
        dob: new Date(validated.dob),
        gender: validated.gender as Gender,
        apaarId: validated.apaarId?.trim() || null,
        isActive: true,
      },
    });

    if (validated.guardian) {
      const gInput = validated.guardian;
      const normalizedPhone = gInput.phone.trim();
      const normalizedEmail = gInput.email?.toLowerCase().trim() || null;

      // Find or create guardian record by schoolId and phone
      let guardian = await tx.guardian.findUnique({
        where: {
          schoolId_phone: {
            schoolId: school.id,
            phone: normalizedPhone,
          },
        },
      });

      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            schoolId: school.id,
            name: gInput.name.trim(),
            phone: normalizedPhone,
            email: normalizedEmail,
            occupation: gInput.occupation?.trim() || null,
            address: gInput.address?.trim() || null,
          },
        });
      }

      // Link student and guardian
      await tx.studentGuardian.create({
        data: {
          schoolId: school.id,
          studentId: newStudent.id,
          guardianId: guardian.id,
          relationship: gInput.relationship as GuardianRelationship,
          isPrimary: true,
        },
      });
    }

    return newStudent;
  });

  const fullStudent = await prisma.student.findUnique({
    where: { id: student.id },
    include: {
      guardians: {
        include: {
          guardian: true,
        },
      },
    },
  });

  return successResponse({ student: fullStudent }, undefined, 201);
});

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  assertSchoolAccess(user, school.id);

  // Parent scope: only return children linked to this guardian profile
  if (user.role === "PARENT") {
    const guardian = await prisma.guardian.findFirst({
      where: { userId: user.id, schoolId: school.id },
      select: { id: true },
    });

    if (!guardian) {
      return successResponse({ students: [] });
    }

    const links = await prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id, schoolId: school.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            dob: true,
            gender: true,
            isActive: true,
          },
        },
      },
    });

    const students = links.map((l) => ({
      ...l.student,
      relationship: l.relationship,
      isPrimary: l.isPrimary,
    }));

    return successResponse({ students });
  }

  // Student scope: only return their own record
  if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { userId: user.id, schoolId: school.id },
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        dob: true,
        gender: true,
        isActive: true,
      },
    });

    return successResponse({ students: student ? [student] : [] });
  }

  // Staff and Admin scope
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"]);

  const students = await prisma.student.findMany({
    where: { schoolId: school.id, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      guardians: {
        include: {
          guardian: {
            select: { id: true, name: true, phone: true, email: true, userId: true },
          },
        },
      },
    },
  });

  return successResponse({ students });
});
