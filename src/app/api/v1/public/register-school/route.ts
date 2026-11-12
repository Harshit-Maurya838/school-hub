import { NextRequest } from "next/server";
import { apiHandler, requestMeta } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requestSchoolRegistrationOtp } from "@/modules/onboarding";

/** Validates the registration form and emails a one-time code to the admin email. */
export const POST = apiHandler(async (req: NextRequest) => {
  const { registration, expiresInMinutes } = await requestSchoolRegistrationOtp(
    await req.json().catch(() => ({})),
    requestMeta(req)
  );

  return successResponse(
    {
      message: `We sent a 6-digit code to ${registration.adminEmail}.`,
      email: registration.adminEmail,
      expiresInMinutes,
    },
    undefined,
    201
  );
});
