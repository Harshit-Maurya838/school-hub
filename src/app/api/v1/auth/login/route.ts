import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, requestMeta } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { UnauthorizedError } from "@/lib/errors";
import { loginWithPassword, setSessionCookieOnResponse } from "@/modules/auth";

const loginSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Invalid email address")),
  password: z.string().min(1, "Password is required"),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const parseResult = loginSchema.safeParse(await req.json().catch(() => ({})));
  // Malformed input gets the same answer as wrong credentials.
  if (!parseResult.success) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { user, token } = await loginWithPassword({ ...parseResult.data, ...requestMeta(req) });

  const response = successResponse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      schoolSlug: user.school?.slug ?? null,
    },
  });

  setSessionCookieOnResponse(response, token);
  return response;
});
