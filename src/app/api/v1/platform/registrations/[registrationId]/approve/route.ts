import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission } from "@/lib/rbac";
import { approveRegistration } from "@/lib/school-registration";
import { BadRequestError } from "@/lib/errors";

type Context = RouteContext<{ registrationId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN"]);
  requirePermission(user, "registration:manage");

  const params = await context?.params;
  const registrationId = params?.registrationId;

  if (!registrationId) {
    throw new BadRequestError("Missing registrationId parameter");
  }

  const result = await approveRegistration(registrationId, user.id);

  return successResponse({
    message: "Registration approved and school successfully provisioned",
    registration: result.registration,
    school: result.school,
    activationUrl: result.activationUrl,
  });
});
