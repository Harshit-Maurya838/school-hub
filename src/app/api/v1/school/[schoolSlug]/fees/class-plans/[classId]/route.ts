import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth } from "@/modules/auth";
import { getClassFeePlan, resolveSchoolForFees, saveClassFeePlan } from "@/modules/fees";

type Context = RouteContext<{ schoolSlug: string; classId: string }>;

/** A class's monthly fee, admission fee and additional costs for the active session. */
export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(params?.schoolSlug as string, user);
  const plan = await getClassFeePlan(school.id, user, params?.classId as string);
  return successResponse({ plan });
});

/** Replaces the class's plan; issued invoices keep their own item snapshot. */
export const PUT = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(params?.schoolSlug as string, user);
  const body = await req.json().catch(() => ({}));
  const plan = await saveClassFeePlan(school.id, user, params?.classId as string, body);
  return successResponse({ plan });
});
