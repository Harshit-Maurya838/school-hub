import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  createClassWithSetup,
  getClassSetupOverview,
  resolveSchoolAndAuthorize,
} from "@/modules/academics";
import { canViewSchoolFees } from "@/modules/auth";

type Context = RouteContext<{ schoolSlug: string }>;

/** Everything the Classes & Subjects screen shows, per class and section. */
export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school, user } = await resolveSchoolAndAuthorize(
    req,
    params?.schoolSlug as string,
    "read"
  );
  const overview = await getClassSetupOverview(school.id, {
    includeFees: canViewSchoolFees(user, school.id),
  });
  return successResponse({ overview });
});

/** Creates a class with its sections (in one medium) and, optionally, default subjects. */
export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school, user } = await resolveSchoolAndAuthorize(
    req,
    params?.schoolSlug as string,
    "write"
  );
  const body = await req.json().catch(() => ({}));
  const result = await createClassWithSetup(school.id, body, user.id);
  return successResponse(result, undefined, 201);
});
