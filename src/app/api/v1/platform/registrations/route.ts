import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/generated/prisma/enums";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN"]);
  requirePermission(user, "registration:view");

  const statusParam = req.nextUrl.searchParams.get("status") as RegistrationStatus | null;

  const whereClause = statusParam ? { status: statusParam } : {};

  const registrations = await prisma.schoolRegistration.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
      school: {
        select: { id: true, name: true, slug: true, code: true },
      },
    },
  });

  return successResponse({ registrations });
});
