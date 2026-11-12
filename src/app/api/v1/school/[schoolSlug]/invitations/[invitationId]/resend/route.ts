import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import { BadRequestError } from "@/lib/errors";
import { resendInvitation } from "@/modules/onboarding";

type Context = RouteContext<{ schoolSlug: string; invitationId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug, invitationId } = (await context?.params) ?? {};
  const { user, school } = await requireSchoolAccess(req, schoolSlug, {
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    requireActive: true,
  });
  if (!invitationId) throw new BadRequestError("Missing required route parameters");

  const result = await resendInvitation({
    schoolId: school.id,
    invitationId,
    invitedById: user.id,
    ...requestMeta(req),
  });

  return successResponse({
    message: "Invitation successfully resent",
    invitation: result.invitation,
    actionUrl: result.actionUrl,
    rawToken: result.rawToken,
  });
});
