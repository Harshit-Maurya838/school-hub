import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import {
  admitStudent,
  admitStudentSchema,
  listStudentsForUser,
  resolveStudentSchoolAndAuthorize,
} from "@/modules/students";

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  // Enforces authentication, tenant verification, and SCHOOL_ADMIN / SUPER_ADMIN role
  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug ?? "", "write");

  const validated = admitStudentSchema.parse(await req.json().catch(() => ({})));
  const student = await admitStudent(school.id, validated, {
    userId: user.id,
    ...requestMeta(req),
  });

  return successResponse({ student }, undefined, 201);
});

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { user, school } = await requireSchoolAccess(req, schoolSlug);
  const { data, meta } = await listStudentsForUser(user, school, req.nextUrl.searchParams);
  return successResponse(data, meta);
});
