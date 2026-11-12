import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import { bulkStaffSchema, createStaffBulk } from "@/modules/staff";

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { user, school } = await requireSchoolAccess(req, schoolSlug, {
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    requireActive: true,
  });

  const validated = bulkStaffSchema.parse(await req.json().catch(() => ({})));
  const result = await createStaffBulk({
    schoolId: school.id,
    actorUserId: user.id,
    members: validated.members,
    sendInvitesImmediately: validated.sendInvitesImmediately,
    ...requestMeta(req),
  });

  return successResponse(result, undefined, 201);
});
