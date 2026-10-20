import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  deleteSubject,
  resolveSchoolAndAuthorize,
  updateSubject,
  updateSubjectSchema,
} from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string; subjectId: string }>;

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const subjectId = params?.subjectId;

  if (!schoolSlug || !subjectId) {
    throw new BadRequestError("Missing schoolSlug or subjectId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = updateSubjectSchema.parse(body);

  const updated = await updateSubject(school.id, subjectId, validated, user.id);

  return successResponse({ subject: updated });
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const subjectId = params?.subjectId;

  if (!schoolSlug || !subjectId) {
    throw new BadRequestError("Missing schoolSlug or subjectId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const result = await deleteSubject(school.id, subjectId, user.id);

  return successResponse(result);
});
