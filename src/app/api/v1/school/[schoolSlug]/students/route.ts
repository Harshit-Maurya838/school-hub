import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import {
  admitStudent,
  admitStudentSchema,
  listStudents,
  resolveStudentSchoolAndAuthorize,
} from "@/lib/students";

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  // Enforces authentication, tenant verification, and SCHOOL_ADMIN / SUPER_ADMIN role
  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const body = await req.json().catch(() => ({}));
  const validated = admitStudentSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const student = await admitStudent(school.id, validated, {
    userId: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({ student }, undefined, 201);
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

  // Staff and Admin scope: supports search, filtering, and database-level pagination
  await resolveStudentSchoolAndAuthorize(req, schoolSlug, "read");

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const classId = searchParams.get("classId") || undefined;
  const sectionId = searchParams.get("sectionId") || undefined;
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "ACTIVE" ||
    statusParam === "INACTIVE" ||
    statusParam === "ARCHIVED" ||
    statusParam === "ALL"
      ? statusParam
      : undefined;

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const sortByParam = searchParams.get("sortBy");
  const sortBy =
    sortByParam === "name" || sortByParam === "admissionNumber" || sortByParam === "createdAt"
      ? sortByParam
      : "createdAt";
  const sortOrderParam = searchParams.get("sortOrder");
  const sortOrder = sortOrderParam === "asc" ? "asc" : "desc";

  const result = await listStudents({
    schoolId: school.id,
    search,
    academicYearId,
    classId,
    sectionId,
    status,
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 10 : limit,
    sortBy,
    sortOrder,
  });

  return successResponse(
    {
      students: result.students,
      pagination: result.pagination,
    },
    result.pagination
  );
});
