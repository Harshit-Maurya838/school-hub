import { NextRequest } from "next/server";
import { apiHandler, requestMeta } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { createSessionToken, setSessionCookieOnResponse } from "@/modules/auth";
import { verifySchoolRegistrationOtp } from "@/modules/onboarding";

/** Checks the emailed code, creates the school and its admin, and signs the admin in. */
export const POST = apiHandler(async (req: NextRequest) => {
  const { school, user } = await verifySchoolRegistrationOtp(
    await req.json().catch(() => ({})),
    requestMeta(req)
  );

  const token = await createSessionToken({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
    email: user.email,
    sessionVersion: user.sessionVersion,
  });

  const response = successResponse(
    {
      school,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolSlug: school.slug,
      },
    },
    undefined,
    201
  );
  setSessionCookieOnResponse(response, token);
  return response;
});
