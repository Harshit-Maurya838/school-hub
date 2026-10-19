import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission } from "@/lib/rbac";
import { rejectRegistration } from "@/lib/school-registration";
import { BadRequestError } from "@/lib/errors";

const rejectSchema = z.object({
  reason: z.string().optional(),
});

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

  const body = await req.json().catch(() => ({}));
  const validated = rejectSchema.parse(body);

  const result = await rejectRegistration(registrationId, user.id, validated.reason);

  return successResponse({
    message: "Registration application rejected",
    registration: result.registration,
  });
});
