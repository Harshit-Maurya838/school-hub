import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { resolveSchoolAndAuthorize } from "@/modules/academics";
import { isProfileStep, saveSchoolProfileStep } from "@/modules/onboarding/services/school-profile";

type Context = RouteContext<{ schoolSlug: string; step: string }>;

export const PUT = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school, user } = await resolveSchoolAndAuthorize(
    req,
    params?.schoolSlug as string,
    "write"
  );

  if (!isProfileStep(params?.step)) {
    throw new NotFoundError("Unknown school profile step");
  }

  const body = await req.json().catch(() => ({}));
  const profile = await saveSchoolProfileStep({
    schoolId: school.id,
    actorUserId: user.id,
    step: params.step,
    input: body,
  });

  return successResponse({ profile });
});
