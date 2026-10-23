import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { createStaffBulk } from "@/modules/staff";

const staffMemberItemSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(["TEACHER", "ACCOUNTANT", "SCHOOL_ADMIN"]).default("TEACHER"),
  employeeId: z.string().trim().optional().nullable(),
  qualification: z.string().trim().optional().nullable(),
  specialization: z.string().trim().optional().nullable(),
  designation: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"]).optional(),
});

const bulkStaffSchema = z.object({
  members: z.array(staffMemberItemSchema).min(1, "At least one member is required for bulk import"),
  sendInvitesImmediately: z.boolean().optional().default(false),
});

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);

  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!school || !school.isActive) {
    throw new NotFoundError("School not found or is inactive");
  }

  assertSchoolAccess(user, school.id);

  const body = await req.json().catch(() => ({}));
  const validated = bulkStaffSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await createStaffBulk({
    schoolId: school.id,
    actorUserId: user.id,
    members: validated.members,
    sendInvitesImmediately: validated.sendInvitesImmediately,
    ipAddress,
    userAgent,
  });

  return successResponse(result, undefined, 201);
});
