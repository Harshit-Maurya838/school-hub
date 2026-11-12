import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logAuditEvent } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
import { BadRequestError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashPassword } from "./password";

export const PASSWORD_RESET_TTL_MINUTES = 60;
// One reset email per account per window, so the endpoint cannot be used to flood an inbox.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash("sha256").update(token.trim()).digest("hex");

type RequestMeta = { ipAddress?: string | null; userAgent?: string | null };

/**
 * Emails a single-use reset link when the address belongs to an active, activated account.
 * Returns nothing either way, so callers cannot reveal whether an account exists.
 */
export async function requestPasswordReset(params: { email: string } & RequestMeta) {
  const email = params.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      schoolId: true,
      isActive: true,
      deletedAt: true,
      passwordHash: true,
      school: { select: { isActive: true } },
    },
  });

  // Accounts that never accepted their invitation have no password to reset.
  if (
    !user?.email ||
    !user.passwordHash ||
    !user.isActive ||
    user.deletedAt !== null ||
    (user.school && !user.school.isActive)
  ) {
    return;
  }

  const recent = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recent) {
    logger.warn({ userId: user.id }, "Password reset requested again within cooldown; skipped");
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
    },
  });

  await logAuditEvent({
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "User",
    entityId: user.id,
    userId: user.id,
    schoolId: user.schoolId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  const baseUrl = env.APP_URL.replace(/\/+$/, "");
  await sendPasswordResetEmail({
    to: user.email,
    resetUrl: `${baseUrl}/reset-password?token=${rawToken}`,
    recipientName: user.name,
    expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
  });
}

/**
 * Sets a new password from a valid reset token, consumes every outstanding token for the
 * account, and bumps sessionVersion so all existing sessions are signed out.
 */
export async function resetPassword(params: { token: string; password: string } & RequestMeta) {
  const invalid = new BadRequestError("This reset link is invalid or has expired.");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(params.token) },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { schoolId: true, isActive: true, deletedAt: true } },
    },
  });

  if (
    !record ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    !record.user.isActive ||
    record.user.deletedAt !== null
  ) {
    throw invalid;
  }

  const passwordHash = await hashPassword(params.password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Claim the token atomically so two concurrent submissions cannot both succeed.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw invalid;

    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  });

  await logAuditEvent({
    action: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: record.userId,
    userId: record.userId,
    schoolId: record.user.schoolId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}
