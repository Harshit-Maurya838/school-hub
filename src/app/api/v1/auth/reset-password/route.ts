import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { passwordSchema, resetPassword } from "@/modules/auth";

const schema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

export const POST = apiHandler(async (req: NextRequest) => {
  const { token, password } = schema.parse(await req.json().catch(() => ({})));

  await resetPassword({
    token,
    password,
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return successResponse({ message: "Your password has been reset. Please sign in." });
});
