import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { resendInvitation } from "@/modules/onboarding/services/invitations";

type Context = RouteContext<{ schoolSlug: string; invitationId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const invitationId = params?.invitationId;

  if (!schoolSlug || !invitationId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!school || !school.isActive) {
    throw new NotFoundError("School not found or is inactive");
  }

  assertSchoolAccess(user, school.id);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await resendInvitation({
    schoolId: school.id,
    invitationId,
    invitedById: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({
    message: "Invitation successfully resent",
    invitation: result.invitation,
    actionUrl: result.actionUrl,
    rawToken: result.rawToken,
  });
});
