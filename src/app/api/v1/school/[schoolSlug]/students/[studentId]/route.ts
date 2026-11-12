import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import { BadRequestError } from "@/lib/errors";
import {
  archiveStudent,
  getStudentForUser,
  resolveStudentSchoolAndAuthorize,
  updateStudentProfile,
  updateStudentSchema,
} from "@/modules/students";

type Context = RouteContext<{ schoolSlug: string; studentId: string }>;

async function routeParams(context?: Context) {
  const { schoolSlug, studentId } = (await context?.params) ?? {};
  if (!schoolSlug || !studentId) throw new BadRequestError("Missing required route parameters");
  return { schoolSlug, studentId };
}

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug, studentId } = await routeParams(context);
  const { user, school } = await requireSchoolAccess(req, schoolSlug);
  const student = await getStudentForUser(user, school.id, studentId);
  return successResponse({ student });
});

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug, studentId } = await routeParams(context);
  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const validated = updateStudentSchema.parse(await req.json().catch(() => ({})));
  const student = await updateStudentProfile(school.id, studentId, validated, {
    userId: user.id,
    ...requestMeta(req),
  });

  return successResponse({ student });
});

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug, studentId } = await routeParams(context);
  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const student = await archiveStudent(school.id, studentId, reason, {
    userId: user.id,
    ...requestMeta(req),
  });

  return successResponse({
    success: true,
    message: "Student record archived safely. Historical records and enrollment history preserved.",
    student,
  });
});
