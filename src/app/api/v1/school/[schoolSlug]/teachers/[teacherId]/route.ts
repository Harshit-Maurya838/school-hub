import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";
import { assertTeacherAccess } from "@/lib/rbac";
import { getTeacherProfile, updateTeacherProfile } from "@/lib/teachers";

type Context = RouteContext<{ schoolSlug: string; teacherId: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const teacherId = params?.teacherId;

  if (!schoolSlug || !teacherId) {
    throw new BadRequestError("Missing schoolSlug or teacherId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "read");

  // Enforce teacher resource access (teachers can only access their own profile)
  await assertTeacherAccess(user, teacherId);

  const academicYearId = req.nextUrl.searchParams.get("academicYearId") || undefined;
  const teacher = await getTeacherProfile(school.id, teacherId, academicYearId);

  return successResponse({ teacher });
});

export const PUT = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const teacherId = params?.teacherId;

  if (!schoolSlug || !teacherId) {
    throw new BadRequestError("Missing schoolSlug or teacherId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));

  const updated = await updateTeacherProfile(school.id, teacherId, body, user.id);

  return successResponse({ teacher: updated });
});
