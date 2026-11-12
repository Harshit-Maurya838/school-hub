import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requestPasswordReset } from "@/modules/auth";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Invalid email address") });

export const POST = apiHandler(async (req: NextRequest) => {
  const { email } = schema.parse(await req.json().catch(() => ({})));

  await requestPasswordReset({
    email,
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  // Same response whether or not the account exists, to avoid account enumeration.
  return successResponse({
    message: "If an account exists for that email, a password reset link is on its way.",
  });
});
