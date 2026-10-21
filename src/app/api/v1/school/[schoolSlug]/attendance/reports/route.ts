import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { getAttendanceReports, resolveSchoolAndAuthorizeAttendance } from "@/lib/attendance";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId") || undefined;
  const studentId = searchParams.get("studentId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;

  const { school, user } = await resolveSchoolAndAuthorizeAttendance(req, schoolSlug, "view");
  const result = await getAttendanceReports(school.id, user, {
    sectionId,
    studentId,
    startDate,
    endDate,
    academicYearId,
  });

  return successResponse(result);
});
