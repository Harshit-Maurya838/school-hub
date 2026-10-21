import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { getHistoricalRegisters, resolveSchoolAndAuthorizeAttendance } from "@/lib/attendance";
import { RegisterStatus } from "@/generated/prisma/enums";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId") || undefined;
  const classId = searchParams.get("classId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const statusParam = searchParams.get("status");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  let status: RegisterStatus | undefined;
  if (statusParam === "DRAFT" || statusParam === "SUBMITTED") {
    status = statusParam as RegisterStatus;
  }

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

  const { school, user } = await resolveSchoolAndAuthorizeAttendance(req, schoolSlug, "view");
  const result = await getHistoricalRegisters(school.id, user, {
    sectionId,
    classId,
    startDate,
    endDate,
    status,
    limit,
    offset,
  });

  return successResponse(result);
});
