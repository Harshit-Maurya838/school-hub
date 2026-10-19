import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { verifyInvitation } from "@/lib/invitations";

export const GET = apiHandler(async (req: NextRequest) => {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    throw new BadRequestError("Invitation token parameter is required");
  }

  const result = await verifyInvitation(token);

  return successResponse({
    invitation: {
      id: result.id,
      email: result.email,
      role: result.role,
      schoolName: result.schoolName,
      schoolSlug: result.schoolSlug,
      expiresAt: result.expiresAt,
      guardian: result.guardian,
      student: result.student,
    },
  });
});
