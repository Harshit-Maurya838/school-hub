import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { getDailyRegister, resolveSchoolAndAuthorizeAttendance } from "@/lib/attendance";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const date = searchParams.get("date");
  const academicYearId = searchParams.get("academicYearId") || undefined;

  if (!sectionId) {
    throw new BadRequestError("Query parameter 'sectionId' is required");
  }

  if (!date) {
    throw new BadRequestError("Query parameter 'date' (YYYY-MM-DD) is required");
  }

  const { school, user } = await resolveSchoolAndAuthorizeAttendance(req, schoolSlug, "view");
  const result = await getDailyRegister(school.id, user, {
    sectionId,
    date,
    academicYearId,
  });

  return successResponse(result);
});
