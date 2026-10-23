import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { resendInvitation } from "@/modules/onboarding/services/invitations";

type Context = RouteContext<{ schoolSlug: string; staffId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const staffId = params?.staffId;

  if (!schoolSlug || !staffId) {
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

  // Locate the staff member by User ID or TeacherProfile ID
  const staffUser = await prisma.user.findFirst({
    where: {
      schoolId: school.id,
      OR: [{ id: staffId }, { teacherProfile: { id: staffId } }],
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!staffUser) {
    throw new NotFoundError("Staff member record not found in this school");
  }

  if (!staffUser.email) {
    throw new BadRequestError("Staff member does not have an email address configured");
  }

  if (staffUser.passwordHash !== null) {
    throw new BadRequestError(
      "This staff member has already activated their account with a password."
    );
  }

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await resendInvitation({
    schoolId: school.id,
    email: staffUser.email,
    invitedById: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({
    message: `Invitation issued to ${staffUser.email}`,
    invitation: result.invitation,
    actionUrl: result.actionUrl,
    rawToken: result.rawToken,
  });
});
