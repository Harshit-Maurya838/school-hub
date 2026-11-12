import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { TooManyRequestsError, UnauthorizedError } from "@/lib/errors";
import { verifyPassword } from "./password";
import { createSessionToken, isLoginLocked } from "./auth";

// A dummy bcrypt hash for timing attack mitigation when user is not found
const DUMMY_HASH = "$2a$12$e8Y6/m5L4jU5k7a0qO9b4O3gZfJ3X7P6H6n2E7N7I6O8r6G8J9L1K";

/**
 * Verifies email/password credentials and issues a session token. Every failure surfaces as the
 * same 401 (with a bcrypt comparison either way, against timing attacks) except a locked account,
 * which gets 429. Each attempt is audited.
 */
export async function loginWithPassword(params: {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
}) {
  const { email, password, ipAddress, userAgent } = params;

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
      sessionVersion: true,
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

  // Checked before the password so a locked account cannot be probed further.
  if (await isLoginLocked(user.id)) {
    await logAuditEvent({
      action: "AUTH_LOGIN_LOCKED",
      entityType: "User",
      userId: user.id,
      schoolId: user.schoolId,
      details: { email },
      ipAddress,
      userAgent,
    });
    throw new TooManyRequestsError(
      "Too many failed sign-in attempts. Please wait 15 minutes or reset your password."
    );
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
    sessionVersion: user.sessionVersion,
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

  return { user, token };
}
