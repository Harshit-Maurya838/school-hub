import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import { BadRequestError } from "@/lib/errors";
import { reissueStaffInvitation } from "@/modules/staff";

type Context = RouteContext<{ schoolSlug: string; staffId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug, staffId } = (await context?.params) ?? {};
  const { user, school } = await requireSchoolAccess(req, schoolSlug, {
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    requireActive: true,
  });
  if (!staffId) throw new BadRequestError("Missing required route parameters");

  const result = await reissueStaffInvitation({
    schoolId: school.id,
    staffId,
    actorUserId: user.id,
    ...requestMeta(req),
  });

  return successResponse({
    message: `Invitation issued to ${result.email}`,
    invitation: result.invitation,
    actionUrl: result.actionUrl,
    rawToken: result.rawToken,
  });
});
