import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  deleteClass,
  resolveSchoolAndAuthorize,
  updateClass,
  updateClassSchema,
} from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string; classId: string }>;

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const classId = params?.classId;

  if (!schoolSlug || !classId) {
    throw new BadRequestError("Missing schoolSlug or classId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = updateClassSchema.parse(body);

  const updated = await updateClass(school.id, classId, validated, user.id);

  return successResponse({ class: updated });
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const classId = params?.classId;

  if (!schoolSlug || !classId) {
    throw new BadRequestError("Missing schoolSlug or classId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const result = await deleteClass(school.id, classId, user.id);

  return successResponse(result);
});
