import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  createSection,
  createSectionSchema,
  listSections,
  resolveSchoolAndAuthorize,
} from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school } = await resolveSchoolAndAuthorize(req, schoolSlug, "read");
  const classId = req.nextUrl.searchParams.get("classId") || undefined;

  const sections = await listSections(school.id, classId);

  return successResponse({ sections });
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = createSectionSchema.parse(body);

  const section = await createSection(school.id, validated, user.id);

  return successResponse({ section }, undefined, 201);
});
