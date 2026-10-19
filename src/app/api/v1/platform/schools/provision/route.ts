import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, requireRole, requirePermission } from "@/lib/rbac";
import { provisionSchoolWithAdmin } from "@/lib/provisioning";

const provisionSchoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  code: z.string().min(2, "School code must be at least 2 characters"),
  slug: z.string().min(2, "School slug must be at least 2 characters"),
  adminName: z.string().min(2, "Administrator name must be at least 2 characters"),
  adminEmail: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Invalid administrator email address")),
  adminPhone: z.string().optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  requireRole(user, ["SUPER_ADMIN"]);
  requirePermission(user, "school:create");

  const body = await req.json().catch(() => ({}));
  const validated = provisionSchoolSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await provisionSchoolWithAdmin({
    name: validated.name,
    code: validated.code,
    slug: validated.slug,
    adminName: validated.adminName,
    adminEmail: validated.adminEmail,
    adminPhone: validated.adminPhone,
    provisionedById: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse(
    {
      school: result.school,
      invitation: result.invitation,
      activationUrl: result.activationUrl,
    },
    undefined,
    201
  );
});
