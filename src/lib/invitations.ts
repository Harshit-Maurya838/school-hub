import crypto from "crypto";
import { prisma } from "./prisma";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "./password";
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from "./errors";
import { logAuditEvent } from "./audit";
import { sendEmail } from "./email";
import { logger } from "./logger";

export const INVITATION_EXPIRY_HOURS = 48;

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export interface IssueInvitationParams {
  schoolId: string;
  email: string;
  role: Role;
  invitedById?: string | null;
  guardianId?: string | null;
  studentId?: string | null;
  metadata?: Record<string, unknown> | null;
  expiryHours?: number;
  baseUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Issues an invitation to join a school tenant.
 * - Stores ONLY the SHA-256 hash of the token in the database.
 * - Dispatches the raw token securely via the email transport.
 */
export async function issueInvitation(params: IssueInvitationParams) {
  const normalizedEmail = params.email.toLowerCase().trim();

  // Validate that no active platform Super Admin or customer user already claims this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, isActive: true, deletedAt: true },
  });

  if (existingUser && existingUser.isActive && existingUser.deletedAt === null) {
    throw new ConflictError("An active user account already exists with this email address");
  }

  // Ensure target school exists and is active
  const school = await prisma.school.findUnique({
    where: { id: params.schoolId },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!school || !school.isActive) {
    throw new BadRequestError("Target school does not exist or is inactive");
  }

  // If guardianId is provided, verify it belongs to this school
  if (params.guardianId) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: params.guardianId, schoolId: params.schoolId },
      select: { id: true },
    });
    if (!guardian) {
      throw new BadRequestError("Associated guardian record does not exist in this school");
    }
  }

  // If studentId is provided, verify it belongs to this school
  if (params.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: params.studentId, schoolId: params.schoolId },
      select: { id: true },
    });
    if (!student) {
      throw new BadRequestError("Associated student record does not exist in this school");
    }
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const hours = params.expiryHours ?? INVITATION_EXPIRY_HOURS;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  // Revoke any previous pending invitations for this email in this school
  await prisma.invitation.updateMany({
    where: {
      schoolId: params.schoolId,
      email: normalizedEmail,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  const invitation = await prisma.invitation.create({
    data: {
      schoolId: params.schoolId,
      email: normalizedEmail,
      role: params.role,
      tokenHash,
      status: "PENDING",
      invitedById: params.invitedById ?? null,
      guardianId: params.guardianId ?? null,
      studentId: params.studentId ?? null,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      school: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  await logAuditEvent({
    action: "INVITATION_CREATED",
    entityType: "Invitation",
    entityId: invitation.id,
    schoolId: params.schoolId,
    userId: params.invitedById,
    details: {
      email: normalizedEmail,
      role: params.role,
      expiresAt: expiresAt.toISOString(),
      guardianId: params.guardianId,
      studentId: params.studentId,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  // Construct activation URL
  const base = params.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const actionUrl = `${base}/accept-invitation?token=${rawToken}`;

  // Send invitation email
  await sendEmail({
    to: normalizedEmail,
    subject: `Invitation to join ${school.name}`,
    text: `You have been invited to join ${school.name} as a ${params.role}. Complete your account setup here: ${actionUrl}`,
    html: `<p>You have been invited to join <strong>${school.name}</strong> as a <strong>${params.role}</strong>.</p><p><a href="${actionUrl}">Click here to accept your invitation and set your password</a></p><p>This link will expire in ${hours} hours.</p>`,
    actionUrl,
    metadata: { invitationId: invitation.id, schoolId: params.schoolId, role: params.role },
  });

  return {
    invitation,
    rawToken, // Provided to caller (e.g. for provisioning response or test validation)
    actionUrl,
  };
}

/**
 * Validates an invitation raw token.
 * Throws appropriate error if missing, expired, revoked, or already accepted.
 */
export async function verifyInvitation(rawToken: string) {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim() === "") {
    throw new BadRequestError("Invitation token is required");
  }

  const tokenHash = hashToken(rawToken);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          slug: true,
          code: true,
          isActive: true,
          status: true,
        },
      },
      guardian: {
        select: { id: true, name: true, phone: true },
      },
      student: {
        select: { id: true, name: true, admissionNumber: true },
      },
    },
  });

  if (!invitation) {
    throw new NotFoundError("Invalid invitation token");
  }

  if (invitation.status === "REVOKED" || invitation.revokedAt !== null) {
    throw new BadRequestError("This invitation has been revoked");
  }

  if (invitation.status === "ACCEPTED" || invitation.acceptedAt !== null) {
    throw new BadRequestError("This invitation has already been used");
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as EXPIRED if not already marked
    if (invitation.status !== "EXPIRED") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    throw new BadRequestError("This invitation has expired. Please request a new invitation.");
  }

  if (!invitation.school.isActive || invitation.school.status !== "ACTIVE") {
    throw new ForbiddenError("The associated school is inactive or suspended");
  }

  return {
    id: invitation.id,
    schoolId: invitation.schoolId,
    schoolName: invitation.school.name,
    schoolSlug: invitation.school.slug,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    guardian: invitation.guardian,
    student: invitation.student,
  };
}

export interface AcceptInvitationParams {
  rawToken: string;
  name: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Accepts an invitation, sets the password, creates the User record,
 * and links parent/student identities atomically.
 */
export async function acceptInvitation(params: AcceptInvitationParams) {
  if (!params.password || params.password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters long");
  }

  if (!params.name || params.name.trim().length < 2) {
    throw new BadRequestError("Full name is required");
  }

  const tokenHash = hashToken(params.rawToken);

  return await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
      include: {
        school: true,
        guardian: true,
        student: true,
      },
    });

    if (!invitation) {
      throw new NotFoundError("Invalid invitation token");
    }

    if (
      invitation.status !== "PENDING" ||
      invitation.acceptedAt !== null ||
      invitation.revokedAt !== null
    ) {
      throw new BadRequestError("This invitation is no longer valid or has already been accepted");
    }

    if (invitation.expiresAt < new Date()) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestError("This invitation has expired");
    }

    if (!invitation.school.isActive || invitation.school.status !== "ACTIVE") {
      throw new ForbiddenError("The associated school is inactive or suspended");
    }

    // Check if user already exists
    const existingUser = await tx.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser && existingUser.isActive && existingUser.deletedAt === null) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(params.password);

    // Create the authenticated user record
    const user = await tx.user.create({
      data: {
        name: params.name.trim(),
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        schoolId: invitation.schoolId,
        isActive: true,
      },
    });

    // If PARENT role with guardianId, link guardian record
    if (invitation.role === "PARENT" && invitation.guardianId) {
      await tx.guardian.update({
        where: { id: invitation.guardianId },
        data: { userId: user.id },
      });
    }

    // If STUDENT role with studentId, link student record
    if (invitation.role === "STUDENT" && invitation.studentId) {
      await tx.student.update({
        where: { id: invitation.studentId },
        data: { userId: user.id },
      });
    }

    // Mark invitation accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolSlug: invitation.school.slug,
      },
      invitationId: invitation.id,
      guardianId: invitation.guardianId,
      studentId: invitation.studentId,
    };
  });

  // Log audit events after transaction commits successfully
  if (result.user.role === "PARENT" && result.guardianId) {
    await logAuditEvent({
      action: "PARENT_ONBOARDED",
      entityType: "Guardian",
      entityId: result.guardianId,
      schoolId: result.user.schoolId,
      userId: result.user.id,
      details: { email: result.user.email, guardianId: result.guardianId },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  if (result.user.role === "STUDENT" && result.studentId) {
    await logAuditEvent({
      action: "STUDENT_ONBOARDED",
      entityType: "Student",
      entityId: result.studentId,
      schoolId: result.user.schoolId,
      userId: result.user.id,
      details: { email: result.user.email, studentId: result.studentId },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  await logAuditEvent({
    action: "INVITATION_ACCEPTED",
    entityType: "Invitation",
    entityId: result.invitationId,
    schoolId: result.user.schoolId,
    userId: result.user.id,
    details: { email: result.user.email, role: result.user.role },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  logger.info(
    { userId: result.user.id, schoolId: result.user.schoolId, role: result.user.role },
    "User successfully onboarded via invitation acceptance"
  );

  return { user: result.user };
}
