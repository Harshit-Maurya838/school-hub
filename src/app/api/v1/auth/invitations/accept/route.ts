import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { acceptInvitation } from "@/lib/invitations";
import { createSessionToken, setSessionCookieOnResponse } from "@/lib/auth";

const acceptSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const validated = acceptSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await acceptInvitation({
    rawToken: validated.token,
    name: validated.name,
    password: validated.password,
    ipAddress,
    userAgent,
  });

  // Automatically sign in the user by issuing an authenticated session cookie
  const sessionToken = await createSessionToken({
    userId: result.user.id,
    schoolId: result.user.schoolId,
    role: result.user.role,
    email: result.user.email,
  });

  const redirectUrl =
    result.user.role === "SUPER_ADMIN"
      ? "/platform"
      : result.user.schoolSlug
        ? `/school/${result.user.schoolSlug}`
        : "/school";

  const response = successResponse({
    user: result.user,
    redirectUrl,
    message: "Account setup complete. Welcome!",
  });

  setSessionCookieOnResponse(response, sessionToken);

  return response;
});
