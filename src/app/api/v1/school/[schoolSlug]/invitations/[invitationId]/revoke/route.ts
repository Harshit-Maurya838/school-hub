import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";

type Context = RouteContext<{ schoolSlug: string; invitationId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  requirePermission(user, "invitation:revoke");

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const invitationId = params?.invitationId;

  if (!schoolSlug || !invitationId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  assertSchoolAccess(user, school.id);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, schoolId: school.id },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (invitation.status === "REVOKED") {
    throw new BadRequestError("Invitation has already been revoked");
  }

  if (invitation.status === "ACCEPTED") {
    throw new BadRequestError("Cannot revoke an invitation that has already been accepted");
  }

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      revokedAt: true,
    },
  });

  await logAuditEvent({
    action: "INVITATION_REVOKED",
    entityType: "Invitation",
    entityId: invitation.id,
    schoolId: school.id,
    userId: user.id,
    details: { email: invitation.email, role: invitation.role },
    ipAddress,
    userAgent,
  });

  return successResponse({
    message: "Invitation successfully revoked",
    invitation: updated,
  });
});
