import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  deleteAcademicYear,
  resolveSchoolAndAuthorize,
  updateAcademicYear,
  updateAcademicYearSchema,
} from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string; yearId: string }>;

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const yearId = params?.yearId;

  if (!schoolSlug || !yearId) {
    throw new BadRequestError("Missing schoolSlug or yearId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = updateAcademicYearSchema.parse(body);

  const updated = await updateAcademicYear(school.id, yearId, validated, user.id);

  return successResponse({ academicYear: updated });
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const yearId = params?.yearId;

  if (!schoolSlug || !yearId) {
    throw new BadRequestError("Missing schoolSlug or yearId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const result = await deleteAcademicYear(school.id, yearId, user.id);

  return successResponse(result);
});
