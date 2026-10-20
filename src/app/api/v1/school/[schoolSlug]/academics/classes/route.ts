import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  createClass,
  createClassSchema,
  listClasses,
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
  const search = req.nextUrl.searchParams.get("search") || undefined;

  const classes = await listClasses(school.id, search);

  return successResponse({ classes });
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));
  const validated = createClassSchema.parse(body);

  const newClass = await createClass(school.id, validated, user.id);

  return successResponse({ class: newClass }, undefined, 201);
});
