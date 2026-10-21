import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";
import { getSectionTeachingAssignments } from "@/lib/teaching-assignments";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school } = await resolveSchoolAndAuthorize(req, schoolSlug, "read");
  const academicYearId = req.nextUrl.searchParams.get("academicYearId");
  const sectionId = req.nextUrl.searchParams.get("sectionId");

  if (!academicYearId || !sectionId) {
    throw new BadRequestError("Both academicYearId and sectionId query parameters are required");
  }

  const assignments = await getSectionTeachingAssignments(school.id, academicYearId, sectionId);

  return successResponse({ assignments });
});
