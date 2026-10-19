import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { verifyRegistrationEmail } from "@/lib/school-registration";

export const GET = apiHandler(async (req: NextRequest) => {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    throw new BadRequestError("Verification token parameter is required");
  }

  const result = await verifyRegistrationEmail(token);

  return successResponse({
    message: result.message,
    registration: {
      id: result.registration.id,
      schoolName: result.registration.schoolName,
      status: result.registration.status,
    },
  });
});
