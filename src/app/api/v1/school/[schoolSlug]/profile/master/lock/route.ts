import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/modules/academics";
import {
  assertCanLockSchoolProfile,
  setSchoolProfileLock,
} from "@/modules/onboarding/services/school-profile";

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const { school, user } = await resolveSchoolAndAuthorize(
    req,
    params?.schoolSlug as string,
    "read"
  );
  assertCanLockSchoolProfile(user, school.id);

  const body = await req.json().catch(() => ({}));
  const profile = await setSchoolProfileLock({
    schoolId: school.id,
    actorUserId: user.id,
    input: body,
  });

  return successResponse({ profile });
});
