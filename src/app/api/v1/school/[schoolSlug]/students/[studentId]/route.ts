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
import {
  archiveStudent,
  getStudentById,
  resolveStudentSchoolAndAuthorize,
  updateStudentProfile,
  updateStudentSchema,
} from "@/lib/students";

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

  // Resource-level authorization for parent & student roles
  if (user.role === "PARENT") {
    await assertParentStudentAccess(user, studentId);
  } else if (user.role === "STUDENT") {
    await assertStudentOwnAccess(user, studentId);
  }

  const student = await getStudentById(school.id, studentId);

  // Parents and students cannot view archived records
  if ((user.role === "PARENT" || user.role === "STUDENT") && student.deletedAt) {
    throw new NotFoundError("Student not found");
  }

  return successResponse({ student });
});

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const studentId = params?.studentId;

  if (!schoolSlug || !studentId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const body = await req.json().catch(() => ({}));
  const validated = updateStudentSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const student = await updateStudentProfile(school.id, studentId, validated, {
    userId: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({ student });
});

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const studentId = params?.studentId;

  if (!schoolSlug || !studentId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : undefined;

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const student = await archiveStudent(school.id, studentId, reason, {
    userId: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({
    success: true,
    message: "Student record archived safely. Historical records and enrollment history preserved.",
    student,
  });
});
