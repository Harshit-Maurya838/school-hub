import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission } from "@/modules/auth";
import { listSchoolRegistrations } from "@/modules/onboarding";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN"]);
  requirePermission(user, "registration:view");

  const registrations = await listSchoolRegistrations(req.nextUrl.searchParams.get("status"));
  return successResponse({ registrations });
});
