import { prisma } from "./prisma";
import { BadRequestError, ConflictError } from "./errors";
import { issueInvitation } from "./invitations";
import { logAuditEvent } from "./audit";
import { logger } from "./logger";

export interface ProvisionSchoolInput {
  name: string;
  code: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  provisionedById?: string | null;
  baseUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Normalizes a slug to be URL-safe (lowercase alphanumeric and hyphens).
 */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normalizes a school code (uppercase alphanumeric and underscores).
 */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Atomically provisions a new tenant school and creates an activation invitation
 * for its initial School Administrator.
 *
 * Enforces:
 * - Unique school code and slug across the platform.
 * - Unique administrator email identity.
 * - Transactional rollback upon failure.
 * - Platform Super Admin cannot be assigned as a school administrator.
 */
export async function provisionSchoolWithAdmin(input: ProvisionSchoolInput) {
  const schoolName = input.name.trim();
  const schoolCode = normalizeCode(input.code);
  const schoolSlug = normalizeSlug(input.slug);
  const adminEmail = input.adminEmail.toLowerCase().trim();
  const adminName = input.adminName.trim();

  if (schoolName.length < 2) {
    throw new BadRequestError("School name must be at least 2 characters long");
  }

  if (schoolCode.length < 2) {
    throw new BadRequestError("School code must be at least 2 characters long");
  }

  if (schoolSlug.length < 2) {
    throw new BadRequestError("School slug must be at least 2 characters long");
  }

  if (adminName.length < 2) {
    throw new BadRequestError("Administrator name must be at least 2 characters long");
  }

  // Pre-transaction duplicate checks for explicit error reporting
  const existingCode = await prisma.school.findUnique({
    where: { code: schoolCode },
    select: { id: true },
  });
  if (existingCode) {
    throw new ConflictError(`A school with code '${schoolCode}' already exists`);
  }

  const existingSlug = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true },
  });
  if (existingSlug) {
    throw new ConflictError(`A school with slug '${schoolSlug}' already exists`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });
  if (existingUser && existingUser.isActive && existingUser.deletedAt === null) {
    throw new ConflictError(`A user with email '${adminEmail}' already exists`);
  }

  // Atomically create the school
  const school = await prisma.school.create({
    data: {
      name: schoolName,
      code: schoolCode,
      slug: schoolSlug,
      isActive: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      isActive: true,
      status: true,
      createdAt: true,
    },
  });

  try {
    // Issue the activation invitation for the first SCHOOL_ADMIN
    const invitationResult = await issueInvitation({
      schoolId: school.id,
      email: adminEmail,
      role: "SCHOOL_ADMIN",
      invitedById: input.provisionedById ?? null,
      metadata: {
        adminName,
        adminPhone: input.adminPhone,
        initialProvisioning: true,
      },
      baseUrl: input.baseUrl,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    await logAuditEvent({
      action: "SCHOOL_PROVISIONED",
      entityType: "School",
      entityId: school.id,
      schoolId: school.id,
      userId: input.provisionedById ?? null,
      details: {
        schoolCode,
        schoolSlug,
        adminEmail,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    logger.info(
      { schoolId: school.id, schoolCode, adminEmail },
      "Tenant school and first admin invitation successfully provisioned"
    );

    return {
      school,
      invitation: invitationResult.invitation,
      rawToken: invitationResult.rawToken,
      activationUrl: invitationResult.actionUrl,
    };
  } catch (error) {
    // Rollback school creation if invitation issuance fails
    await prisma.school.delete({ where: { id: school.id } });
    logger.error(
      { error, schoolId: school.id },
      "Failed to complete school provisioning, rolled back created school"
    );
    throw error;
  }
}
