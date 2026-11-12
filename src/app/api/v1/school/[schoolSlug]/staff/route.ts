import { NextRequest } from "next/server";
import { apiHandler, requestMeta, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireSchoolAccess } from "@/modules/auth";
import {
  createStaffMember,
  createStaffSchema,
  getStaffDirectoryWithInviteStatus,
} from "@/modules/staff";

type Context = RouteContext<{ schoolSlug: string }>;
const ADMINS = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { school } = await requireSchoolAccess(req, schoolSlug, { roles: [...ADMINS] });

  const academicYearId = req.nextUrl.searchParams.get("academicYearId") || undefined;
  const staff = await getStaffDirectoryWithInviteStatus(school.id, academicYearId);
  return successResponse({ staff });
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const { schoolSlug } = (await context?.params) ?? {};
  const { user, school } = await requireSchoolAccess(req, schoolSlug, {
    roles: [...ADMINS],
    requireActive: true,
  });

  const validated = createStaffSchema.parse(await req.json().catch(() => ({})));
  const result = await createStaffMember({
    ...validated,
    schoolId: school.id,
    actorUserId: user.id,
    ...requestMeta(req),
  });

  return successResponse(result, undefined, 201);
});
