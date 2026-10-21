import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";
import { getTeacherDirectory, ensureTeacherProfile } from "@/lib/teachers";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "read");
  const academicYearId = req.nextUrl.searchParams.get("academicYearId") || undefined;

  let teachers = await getTeacherDirectory(school.id, academicYearId);

  // If a Teacher is accessing the endpoint, limit visibility to their own profile
  if (user.role === "TEACHER") {
    teachers = teachers.filter((t) => t.userId === user.id);
  }

  return successResponse({ teachers });
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));

  if (!body.userId || typeof body.userId !== "string") {
    throw new BadRequestError("Valid userId is required");
  }

  const profile = await ensureTeacherProfile(school.id, body.userId, {
    employeeId: body.employeeId,
    qualification: body.qualification,
    specialization: body.specialization,
    designation: body.designation,
    department: body.department,
    joiningDate: body.joiningDate,
    status: body.status,
  });

  return successResponse({ teacher: profile }, undefined, 201);
});
