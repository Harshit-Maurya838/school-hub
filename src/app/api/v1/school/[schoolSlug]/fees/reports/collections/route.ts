import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { PaymentMethod } from "@/generated/prisma/enums";
import { resolveSchoolForFees, getCollectionReport } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const paymentMethod = (searchParams.get("paymentMethod") as PaymentMethod) || undefined;

  const payments = await getCollectionReport(school.id, user, {
    startDate,
    endDate,
    paymentMethod,
  });

  return successResponse(payments);
});
