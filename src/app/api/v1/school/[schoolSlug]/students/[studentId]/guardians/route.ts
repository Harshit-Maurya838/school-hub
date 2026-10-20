import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import {
  addStudentGuardian,
  guardianInputSchema,
  resolveStudentSchoolAndAuthorize,
} from "@/lib/students";
import { GuardianRelationship } from "@/generated/prisma/enums";

type Context = RouteContext<{ schoolSlug: string; studentId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const studentId = params?.studentId;

  if (!schoolSlug || !studentId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const body = await req.json().catch(() => ({}));
  const validated = guardianInputSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const link = await addStudentGuardian(
    school.id,
    studentId,
    {
      name: validated.name,
      phone: validated.phone,
      email: validated.email,
      relationship: validated.relationship as GuardianRelationship,
      occupation: validated.occupation,
      address: validated.address,
      isPrimary: validated.isPrimary,
    },
    {
      userId: user.id,
      ipAddress,
      userAgent,
    }
  );

  return successResponse({ guardianLink: link }, undefined, 201);
});
