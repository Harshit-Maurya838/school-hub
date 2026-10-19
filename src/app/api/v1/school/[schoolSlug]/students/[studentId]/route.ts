import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  requireAuth,
  assertSchoolAccess,
  assertParentStudentAccess,
  assertStudentOwnAccess,
} from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string; studentId: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const studentId = params?.studentId;

  if (!schoolSlug || !studentId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  assertSchoolAccess(user, school.id);

  // Resource-level authorization
  if (user.role === "PARENT") {
    await assertParentStudentAccess(user, studentId);
  } else if (user.role === "STUDENT") {
    await assertStudentOwnAccess(user, studentId);
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: school.id, deletedAt: null },
    include: {
      guardians: {
        include: {
          guardian: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
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
      },
    },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  return successResponse({ student });
});
