import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookieOnResponse } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const loginSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Invalid email address")),
  password: z.string().min(1, "Password is required"),
});

// A dummy bcrypt hash for timing attack mitigation when user is not found
const DUMMY_HASH = "$2a$12$e8Y6/m5L4jU5k7a0qO9b4O3gZfJ3X7P6H6n2E7N7I6O8r6G8J9L1K";

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const parseResult = loginSchema.safeParse(body);

  if (!parseResult.success) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { email, password } = parseResult.data;
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      passwordHash: true,
      role: true,
      schoolId: true,
      isActive: true,
      deletedAt: true,
      school: {
        select: {
          id: true,
          slug: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  // Account does not exist
  if (!user || !user.passwordHash) {
    // Run dummy verify to maintain constant time against timing attacks
    await verifyPassword(password, DUMMY_HASH);
    await logAuditEvent({
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      details: { email, reason: "Account not found or missing credentials" },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedError("Invalid email or password");
  }

  // Account is deactivated or deleted
  if (!user.isActive || user.deletedAt !== null) {
    await verifyPassword(password, user.passwordHash);
    await logAuditEvent({
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      userId: user.id,
      schoolId: user.schoolId,
      details: { email, reason: "Account deactivated or soft-deleted" },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedError("Invalid email or password");
  }

  // School is deactivated for school-scoped users
  if (user.schoolId && user.school && !user.school.isActive) {
    await verifyPassword(password, user.passwordHash);
    await logAuditEvent({
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      userId: user.id,
      schoolId: user.schoolId,
      details: { email, reason: "Associated school is inactive" },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedError("Invalid email or password");
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    await logAuditEvent({
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      userId: user.id,
      schoolId: user.schoolId,
      details: { email, reason: "Invalid password" },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedError("Invalid email or password");
  }

  // Successful login
  const token = await createSessionToken({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
    email: user.email,
    phone: user.phone,
  });

  await logAuditEvent({
    action: "AUTH_LOGIN_SUCCESS",
    entityType: "User",
    userId: user.id,
    schoolId: user.schoolId,
    details: { email: user.email, role: user.role },
    ipAddress,
    userAgent,
  });

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
