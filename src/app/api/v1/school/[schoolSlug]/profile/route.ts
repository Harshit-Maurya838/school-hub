import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/lib/academics";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { normalizeCode } from "@/lib/provisioning";
import { getSchoolDetailsReadiness } from "@/lib/school-readiness";

type Context = RouteContext<{ schoolSlug: string }>;

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "School name must be at least 2 characters")
    .max(100, "School name too long")
    .optional(),
  code: z
    .string()
    .trim()
    .min(2, "School code must be at least 2 characters")
    .max(50, "School code too long")
    .optional(),
});

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  const { school } = await resolveSchoolAndAuthorize(req, schoolSlug as string, "read");
  const readiness = await getSchoolDetailsReadiness(school.id);

  return successResponse({
    school,
    readiness,
  });
});

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug as string, "write");
  const body = await req.json().catch(() => ({}));
  const validated = updateProfileSchema.parse(body);

  const updateData: { name?: string; code?: string } = {};

  if (validated.name && validated.name.trim() !== school.name) {
    updateData.name = validated.name.trim();
  }

  if (validated.code) {
    const normalized = normalizeCode(validated.code);
    if (normalized !== school.code) {
      const existing = await prisma.school.findUnique({
        where: { code: normalized },
        select: { id: true },
      });
      if (existing && existing.id !== school.id) {
        throw new ConflictError(`School code '${normalized}' is already in use by another school`);
      }
      updateData.code = normalized;
    }
  }

  let updatedSchool = school;
  if (Object.keys(updateData).length > 0) {
    const result = await prisma.school.update({
      where: { id: school.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAuditEvent({
      action: "SCHOOL_UPDATED",
      entityType: "School",
      entityId: school.id,
      schoolId: school.id,
      userId: user.id,
      details: updateData,
    });

    updatedSchool = result;
  }

  const readiness = await getSchoolDetailsReadiness(school.id);

  return successResponse({
    school: updatedSchool,
    readiness,
    message: "School details successfully updated",
  });
});
