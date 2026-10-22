import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, applyFeeAdjustment } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string; invoiceId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const invoiceId = params?.invoiceId;
  if (!schoolSlug || !invoiceId) throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const adjustment = await applyFeeAdjustment(school.id, user, invoiceId, {
    type: body.type,
    amount: body.amount,
    reason: body.reason,
  });

  return successResponse(adjustment, undefined, 201);
});
