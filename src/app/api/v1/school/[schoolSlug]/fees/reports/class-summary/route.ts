import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/modules/auth";
import { resolveSchoolForFees, getClassWiseCollectionSummary } from "@/modules/fees";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId") || undefined;

  const summary = await getClassWiseCollectionSummary(school.id, user, academicYearId);
  return successResponse(summary);
});
