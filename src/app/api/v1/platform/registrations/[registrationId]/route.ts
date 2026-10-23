import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission } from "@/lib/rbac";
import { deleteRegistration } from "@/lib/school-registration";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ registrationId: string }>;

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN"]);
  requirePermission(user, "registration:manage");

  const params = await context?.params;
  const registrationId = params?.registrationId;

  if (!registrationId) {
    throw new BadRequestError("Missing registrationId parameter");
  }

  const result = await deleteRegistration(registrationId, user.id);

  return successResponse(result);
});
