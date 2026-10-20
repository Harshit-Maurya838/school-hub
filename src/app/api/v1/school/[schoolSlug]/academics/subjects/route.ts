import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  createSubject,
  createSubjectSchema,
  listSubjects,
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
  const classIdParam = req.nextUrl.searchParams.get("classId") || undefined;

  const subjects = await listSubjects(school.id, classIdParam);

  return successResponse({ subjects });
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = createSubjectSchema.parse(body);

  const subject = await createSubject(school.id, validated, user.id);

  return successResponse({ subject }, undefined, 201);
});
