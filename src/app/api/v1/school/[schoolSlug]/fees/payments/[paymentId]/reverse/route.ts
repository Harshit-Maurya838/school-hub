import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, reversePayment } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string; paymentId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const paymentId = params?.paymentId;
  if (!schoolSlug || !paymentId) throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const payment = await reversePayment(school.id, user, paymentId, {
    reason: body.reason,
  });

  return successResponse(payment);
});
