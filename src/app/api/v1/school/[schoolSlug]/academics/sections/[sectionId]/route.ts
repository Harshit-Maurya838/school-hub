import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  deleteSection,
  resolveSchoolAndAuthorize,
  updateSection,
  updateSectionSchema,
} from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string; sectionId: string }>;

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const sectionId = params?.sectionId;

  if (!schoolSlug || !sectionId) {
    throw new BadRequestError("Missing schoolSlug or sectionId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = updateSectionSchema.parse(body);

  const updated = await updateSection(school.id, sectionId, validated, user.id);

  return successResponse({ section: updated });
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const sectionId = params?.sectionId;

  if (!schoolSlug || !sectionId) {
    throw new BadRequestError("Missing schoolSlug or sectionId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const result = await deleteSection(school.id, sectionId, user.id);

  return successResponse(result);
});
