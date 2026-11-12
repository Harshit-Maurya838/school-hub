import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { getCurrentUserProfile, requireAuth, ROLE_PERMISSIONS } from "@/modules/auth";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  return successResponse({
    user: await getCurrentUserProfile(user),
    permissions: ROLE_PERMISSIONS[user.role] ?? [],
  });
});
