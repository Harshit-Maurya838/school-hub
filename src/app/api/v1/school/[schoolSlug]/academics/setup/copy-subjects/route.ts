import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { copyClassSubjects, resolveSchoolAndAuthorize } from "@/modules/academics";

type Context = RouteContext<{ schoolSlug: string }>;

/** Copies one class's subjects to other classes, skipping names they already have. */
export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school, user } = await resolveSchoolAndAuthorize(
    req,
    params?.schoolSlug as string,
    "write"
  );
  const body = await req.json().catch(() => ({}));
  const result = await copyClassSubjects(school.id, body, user.id);
  return successResponse(result);
});
