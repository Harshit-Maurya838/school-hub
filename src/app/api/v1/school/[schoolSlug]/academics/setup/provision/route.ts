import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { provisionClassStructureFromProfile, resolveSchoolAndAuthorize } from "@/modules/academics";

type Context = RouteContext<{ schoolSlug: string }>;

/** Creates any classes, sections and default subjects the saved school profile implies. */
export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school, user } = await resolveSchoolAndAuthorize(
    req,
    params?.schoolSlug as string,
    "write"
  );
  const provisioning = await provisionClassStructureFromProfile(school.id, user.id);
  return successResponse({ provisioning });
});
