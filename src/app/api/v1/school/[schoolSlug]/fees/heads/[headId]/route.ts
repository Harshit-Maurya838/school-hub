import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, updateFeeHead } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string; headId: string }>;

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const headId = params?.headId;
  if (!schoolSlug || !headId) throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const updated = await updateFeeHead(school.id, user, headId, {
    name: body.name,
    code: body.code,
    description: body.description,
    isActive: body.isActive,
  });

  return successResponse(updated);
});
