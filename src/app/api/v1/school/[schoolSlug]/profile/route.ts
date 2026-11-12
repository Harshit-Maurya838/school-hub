import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/modules/academics";
import { getSchoolDetailsReadiness, updateSchoolDetails } from "@/modules/onboarding";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { school } = await resolveSchoolAndAuthorize(req, schoolSlug ?? "", "read");
  const readiness = await getSchoolDetailsReadiness(school.id);
  return successResponse({ school, readiness });
});

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug ?? "", "write");

  const updated = await updateSchoolDetails({
    school,
    actorUserId: user.id,
    input: await req.json().catch(() => ({})),
  });
  const readiness = await getSchoolDetailsReadiness(school.id);

  return successResponse({
    school: updated ?? school,
    readiness,
    message: "School details successfully updated",
  });
});
