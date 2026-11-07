import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/modules/academics";
import { getSchoolProfile } from "@/modules/onboarding/services/school-profile";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school } = await resolveSchoolAndAuthorize(req, params?.schoolSlug as string, "read");

  return successResponse({ profile: await getSchoolProfile(school.id) });
});
