import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, ROLE_PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  // If user belongs to a school, include school metadata
  let school = null;
  if (user.schoolId) {
    school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        isActive: true,
      },
    });
  }

  const permissions = ROLE_PERMISSIONS[user.role] ?? [];

  return successResponse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      schoolId: user.schoolId,
      school,
    },
    permissions,
  });
});
