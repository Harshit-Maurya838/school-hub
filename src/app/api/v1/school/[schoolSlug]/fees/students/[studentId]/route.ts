import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, getStudentFeeAccount } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string; studentId: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const studentId = params?.studentId;
  if (!schoolSlug || !studentId) throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const account = await getStudentFeeAccount(school.id, user, studentId);
  return successResponse(account);
});
