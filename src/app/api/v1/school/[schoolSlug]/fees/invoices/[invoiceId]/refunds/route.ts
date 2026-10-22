import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, processRefund } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string; invoiceId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const invoiceId = params?.invoiceId;
  if (!schoolSlug || !invoiceId) throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const refund = await processRefund(school.id, user, invoiceId, {
    amount: body.amount,
    reason: body.reason,
    reference: body.reference,
    refundMethod: body.refundMethod,
    paymentId: body.paymentId,
  });

  return successResponse(refund, undefined, 201);
});
