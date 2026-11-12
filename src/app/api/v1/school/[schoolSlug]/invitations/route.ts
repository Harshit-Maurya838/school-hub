import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import { inviteToSchool, listSchoolInvitations } from "@/modules/onboarding";

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { user, school } = await requireSchoolAccess(req, schoolSlug, {
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    permission: "invitation:create",
  });

  const result = await inviteToSchool({
    schoolId: school.id,
    invitedById: user.id,
    input: await req.json().catch(() => ({})),
    ...requestMeta(req),
  });

  return successResponse(
    { invitation: result.invitation, actionUrl: result.actionUrl },
    undefined,
    201
  );
});

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { school } = await requireSchoolAccess(req, schoolSlug, {
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    permission: "invitation:view",
  });

  return successResponse({ invitations: await listSchoolInvitations(school.id) });
});
