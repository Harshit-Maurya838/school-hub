import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "@/lib/password";
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { sendInvitationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

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
    select: { id: true, isActive: true, deletedAt: true, passwordHash: true, schoolId: true },
  });

  if (existingUser && existingUser.isActive && existingUser.deletedAt === null) {
    if (existingUser.passwordHash !== null) {
      throw new ConflictError("An active user account already exists with this email address");
    }
    if (existingUser.schoolId && existingUser.schoolId !== params.schoolId) {
      throw new ConflictError("An account with this email already exists in another school");
    }
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
  const baseUrl = (params.baseUrl || env.APP_URL).replace(/\/+$/, "");
  const actionUrl = `${baseUrl}/accept-invitation?token=${rawToken}`;

  // Send invitation email
  await sendInvitationEmail({
    to: normalizedEmail,
    invitationUrl: actionUrl,
    schoolName: school.name,
    role: params.role,
    expiresInHours: hours,
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

  const result = await prisma.$transaction(async (tx) => {
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

    if (
      existingUser &&
      existingUser.isActive &&
      existingUser.deletedAt === null &&
      existingUser.passwordHash !== null
    ) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(params.password);

    // Create or update the authenticated user record
    let user;
    if (existingUser) {
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: params.name.trim(),
          passwordHash,
          role: invitation.role,
          schoolId: invitation.schoolId,
          isActive: true,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          name: params.name.trim(),
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          schoolId: invitation.schoolId,
          isActive: true,
        },
      });
    }

    // If TEACHER role, ensure teacher profile exists
    if (invitation.role === "TEACHER") {
      const existingProfile = await tx.teacherProfile.findUnique({
        where: { userId: user.id },
      });
      if (!existingProfile) {
        await tx.teacherProfile.create({
          data: {
            schoolId: invitation.schoolId,
            userId: user.id,
            designation: "Instructor",
            department: "General Academics",
            status: "ACTIVE",
          },
        });
      }
    }

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

export interface ResendInvitationParams {
  schoolId: string;
  invitationId?: string;
  email?: string;
  invitedById?: string | null;
  expiryHours?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Resends an existing or expired invitation.
 * Invalidates any old pending tokens, creates a new token valid for 48 hours,
 * dispatches the invitation email, and returns the new invitation & link.
 */
export async function resendInvitation(params: ResendInvitationParams) {
  let targetEmail = params.email?.toLowerCase().trim();
  let targetRole: Role = "TEACHER";
  let guardianId: string | null = null;
  let studentId: string | null = null;
  let metadata: Record<string, unknown> | null = null;

  if (params.invitationId) {
    const existing = await prisma.invitation.findFirst({
      where: { id: params.invitationId, schoolId: params.schoolId },
    });
    if (!existing) {
      throw new NotFoundError("Invitation not found in this school");
    }
    if (existing.status === "ACCEPTED") {
      throw new BadRequestError("This invitation has already been accepted");
    }
    targetEmail = existing.email;
    targetRole = existing.role;
    guardianId = existing.guardianId;
    studentId = existing.studentId;
    metadata = existing.metadata as Record<string, unknown> | null;
  } else if (targetEmail) {
    const existing = await prisma.invitation.findFirst({
      where: { email: targetEmail, schoolId: params.schoolId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new BadRequestError("This invitation has already been accepted");
      }
      targetRole = existing.role;
      guardianId = existing.guardianId;
      studentId = existing.studentId;
      metadata = existing.metadata as Record<string, unknown> | null;
    } else {
      const user = await prisma.user.findFirst({
        where: { email: targetEmail, schoolId: params.schoolId },
      });
      if (user) {
        targetRole = user.role;
      }
    }
  } else {
    throw new BadRequestError(
      "Either invitationId or email must be provided to resend an invitation"
    );
  }

  if (!targetEmail) {
    throw new BadRequestError("Target email is required to resend invitation");
  }

  return await issueInvitation({
    schoolId: params.schoolId,
    email: targetEmail,
    role: targetRole,
    invitedById: params.invitedById,
    guardianId,
    studentId,
    metadata,
    expiryHours: params.expiryHours,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}
