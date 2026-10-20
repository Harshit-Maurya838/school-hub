import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { issueInvitation } from "@/lib/invitations";
import { Role } from "@/generated/prisma/enums";

const inviteStaffSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Invalid email address")),
  role: z.enum(["TEACHER", "ACCOUNTANT", "PARENT", "STUDENT"], {
    message: "Role must be TEACHER, ACCOUNTANT, PARENT, or STUDENT",
  }),
  guardianId: z.string().optional(),
  studentId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  requirePermission(user, "invitation:create");

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  assertSchoolAccess(user, school.id);

  const body = await req.json().catch(() => ({}));
  const validated = inviteStaffSchema.parse(body);

  // Guard against role escalation: School Admin can never invite SUPER_ADMIN or SCHOOL_ADMIN
  if (
    (validated.role as string) === "SUPER_ADMIN" ||
    (validated.role as string) === "SCHOOL_ADMIN"
  ) {
    throw new ForbiddenError("School administrators cannot invite platform or school admin roles");
  }

  // Parent invitation validation: if PARENT, ensure guardianId is provided or verified
  if (validated.role === "PARENT") {
    if (!validated.guardianId) {
      throw new BadRequestError(
        "A guardian record ID (guardianId) is required to issue a Parent invitation"
      );
    }
  }

  // Student invitation validation: if STUDENT, ensure studentId is provided
  if (validated.role === "STUDENT") {
    if (!validated.studentId) {
      throw new BadRequestError(
        "A student record ID (studentId) is required to issue a Student invitation"
      );
    }
  }

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await issueInvitation({
    schoolId: school.id,
    email: validated.email,
    role: validated.role as Role,
    invitedById: user.id,
    guardianId: validated.guardianId,
    studentId: validated.studentId,
    metadata: validated.metadata,
    ipAddress,
    userAgent,
  });

  return successResponse(
    {
      invitation: result.invitation,
      actionUrl: result.actionUrl,
    },
    undefined,
    201
  );
});

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  requirePermission(user, "invitation:view");

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  assertSchoolAccess(user, school.id);

  const invitations = await prisma.invitation.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      createdAt: true,
      guardian: {
        select: { id: true, name: true, phone: true },
      },
      student: {
        select: { id: true, name: true, admissionNumber: true },
      },
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return successResponse({ invitations });
});
