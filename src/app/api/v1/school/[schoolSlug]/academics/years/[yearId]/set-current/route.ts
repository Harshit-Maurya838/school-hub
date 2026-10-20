import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize, setCurrentAcademicYear } from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ schoolSlug: string; yearId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const yearId = params?.yearId;

  if (!schoolSlug || !yearId) {
    throw new BadRequestError("Missing schoolSlug or yearId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const academicYear = await setCurrentAcademicYear(school.id, yearId, user.id);

  return successResponse({ academicYear });
});
