import { prisma } from "./prisma";
import { logger } from "./logger";

export type AuditLogAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGOUT"
  | "AUTH_UNAUTHORIZED_ACCESS"
  | "ROLE_CHANGED"
  | "USER_DEACTIVATED"
  | "TENANT_VIOLATION_ATTEMPT"
  | "SCHOOL_CREATED"
  | "SCHOOL_UPDATED"
  | "SCHOOL_PROVISIONED"
  | "INVITATION_CREATED"
  | "INVITATION_ACCEPTED"
  | "INVITATION_REVOKED"
  | "INVITATION_RESENT"
  | "REGISTRATION_SUBMITTED"
  | "REGISTRATION_VERIFIED"
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_REJECTED"
  | "PARENT_ONBOARDED"
  | "STUDENT_ONBOARDED";

export interface CreateAuditLogParams {
  action: AuditLogAction;
  entityType: string;
  schoolId?: string | null;
  userId?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function sanitizeAuditDetails(
  details?: Record<string, unknown> | null
): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    "password",
    "passwordHash",
    "token",
    "secret",
    "otp",
    "aadhaar",
    "apaarId",
    "sessionToken",
    "tokenHash",
    "verificationTokenHash",
  ]);

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  const sanitizedDetails = sanitizeAuditDetails(params.details);

  // The database constraint audit_logs_context_check requires (schoolId IS NOT NULL OR userId IS NOT NULL).
  // For pre-provisioning public actions (such as registration submission or verification), log to structured audit logger.
  if (!params.schoolId && !params.userId) {
    logger.info(
      {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
      `Public audit event recorded: ${params.action}`
    );
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        schoolId: params.schoolId ?? null,
        userId: params.userId ?? null,
        details: sanitizedDetails ? JSON.parse(JSON.stringify(sanitizedDetails)) : undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    logger.info(
      {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        schoolId: params.schoolId,
        userId: params.userId,
      },
      `Audit event recorded: ${params.action}`
    );
  } catch (error) {
    logger.error(
      { error, params: { ...params, details: sanitizedDetails } },
      "Failed to persist audit log"
    );
  }
}
