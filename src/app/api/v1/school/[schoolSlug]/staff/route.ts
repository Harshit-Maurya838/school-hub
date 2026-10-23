import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, assertSchoolAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { createStaffMember, getStaffDirectoryWithInviteStatus } from "@/modules/staff";

const createStaffSchema = z.object({
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
  sendInvite: z.boolean().optional().default(false),
});

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]);

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

  const academicYearId = req.nextUrl.searchParams.get("academicYearId") || undefined;
  const staff = await getStaffDirectoryWithInviteStatus(school.id, academicYearId);

  return successResponse({ staff });
});

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
  const validated = createStaffSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await createStaffMember({
    schoolId: school.id,
    actorUserId: user.id,
    name: validated.name,
    email: validated.email,
    phone: validated.phone,
    role: validated.role,
    employeeId: validated.employeeId,
    qualification: validated.qualification,
    specialization: validated.specialization,
    designation: validated.designation,
    department: validated.department,
    joiningDate: validated.joiningDate,
    employmentStatus: validated.employmentStatus,
    sendInvite: validated.sendInvite,
    ipAddress,
    userAgent,
  });

  return successResponse(result, undefined, 201);
});
