import { prisma } from "@/lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { normalizeCode, normalizeSlug, provisionSchoolWithAdmin } from "./provisioning";
import { generateRawToken, hashToken } from "./invitations";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export interface SubmitRegistrationInput {
  schoolName: string;
  schoolCode: string;
  desiredSlug: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  baseUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Submits a public application to register a new school on the SaaS platform.
 * Creates an unprivileged SchoolRegistration record with PENDING_VERIFICATION status.
 */
export async function submitSchoolRegistration(input: SubmitRegistrationInput) {
  const schoolName = input.schoolName.trim();
  const schoolCode = normalizeCode(input.schoolCode);
  const desiredSlug = normalizeSlug(input.desiredSlug);
  const adminEmail = input.adminEmail.toLowerCase().trim();
  const adminName = input.adminName.trim();

  if (schoolName.length < 2) {
    throw new BadRequestError("School name must be at least 2 characters long");
  }
  if (schoolCode.length < 2) {
    throw new BadRequestError("School code must be at least 2 characters long");
  }
  if (desiredSlug.length < 2) {
    throw new BadRequestError("Desired slug must be at least 2 characters long");
  }
  if (adminName.length < 2) {
    throw new BadRequestError("Contact name must be at least 2 characters long");
  }

  // 1. Check existing provisioned schools
  const existingSchoolCode = await prisma.school.findUnique({
    where: { code: schoolCode },
    select: { id: true },
  });
  if (existingSchoolCode) {
    throw new ConflictError(`School code '${schoolCode}' is already taken`);
  }

  const existingSchoolSlug = await prisma.school.findUnique({
    where: { slug: desiredSlug },
    select: { id: true },
  });
  if (existingSchoolSlug) {
    throw new ConflictError(`School URL slug '${desiredSlug}' is already taken`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, isActive: true, deletedAt: true },
  });
  if (existingUser && existingUser.isActive && existingUser.deletedAt === null) {
    throw new ConflictError(`An active account with email '${adminEmail}' already exists`);
  }

  // 2. Check pending applications in SchoolRegistration
  const existingPending = await prisma.schoolRegistration.findFirst({
    where: {
      OR: [{ schoolCode }, { desiredSlug }, { adminEmail }],
      status: { in: ["PENDING_VERIFICATION", "PENDING_REVIEW"] },
    },
  });

  if (existingPending) {
    if (existingPending.schoolCode === schoolCode) {
      throw new ConflictError(
        `A pending application already exists for school code '${schoolCode}'`
      );
    }
    if (existingPending.desiredSlug === desiredSlug) {
      throw new ConflictError(`A pending application already exists for slug '${desiredSlug}'`);
    }
    if (existingPending.adminEmail === adminEmail) {
      throw new ConflictError(
        `A pending application is already registered for email '${adminEmail}'`
      );
    }
  }

  const rawVerificationToken = generateRawToken();
  const verificationTokenHash = hashToken(rawVerificationToken);

  const registration = await prisma.schoolRegistration.create({
    data: {
      schoolName,
      schoolCode,
      desiredSlug,
      adminName,
      adminEmail,
      adminPhone: input.adminPhone?.trim() || null,
      status: "PENDING_VERIFICATION",
      verificationTokenHash,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
    select: {
      id: true,
      schoolName: true,
      schoolCode: true,
      desiredSlug: true,
      adminName: true,
      adminEmail: true,
      status: true,
      createdAt: true,
    },
  });

  await logAuditEvent({
    action: "REGISTRATION_SUBMITTED",
    entityType: "SchoolRegistration",
    entityId: registration.id,
    details: {
      schoolName,
      schoolCode,
      desiredSlug,
      adminEmail,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  // Construct verification URL
  const base = process.env.NEXT_APP_URL || "http://localhost:3000";
  const verificationUrl = `${base}/register-school/verify?token=${rawVerificationToken}`;

  await sendEmail({
    to: adminEmail,
    subject: `Verify your school registration for ${schoolName}`,
    text: `Thank you for registering ${schoolName}. Please verify your email: ${verificationUrl}`,
    html: `<p>Thank you for submitting a registration request for <strong>${schoolName}</strong>.</p><p><a href="${verificationUrl}">Click here to verify your contact email address</a></p>`,
    actionUrl: verificationUrl,
    metadata: { registrationId: registration.id },
  });

  logger.info(
    { registrationId: registration.id, adminEmail, schoolCode },
    "School registration application submitted"
  );

  return {
    registration,
    rawVerificationToken,
    verificationUrl,
  };
}

/**
 * Verifies applicant's email address using the one-time verification token.
 * Transitions application from PENDING_VERIFICATION to PENDING_REVIEW.
 */
export async function verifyRegistrationEmail(rawToken: string) {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim() === "") {
    throw new BadRequestError("Verification token is required");
  }

  const verificationTokenHash = hashToken(rawToken);

  const registration = await prisma.schoolRegistration.findUnique({
    where: { verificationTokenHash },
  });

  if (!registration) {
    throw new NotFoundError("Invalid or expired registration verification token");
  }

  if (registration.status === "PENDING_REVIEW") {
    return {
      registration,
      message: "Email address was already verified. Your application is under review.",
    };
  }

  if (registration.status !== "PENDING_VERIFICATION") {
    throw new BadRequestError(
      `Application is in status '${registration.status}' and cannot be verified`
    );
  }

  const updated = await prisma.schoolRegistration.update({
    where: { id: registration.id },
    data: {
      status: "PENDING_REVIEW",
      emailVerifiedAt: new Date(),
    },
  });

  await logAuditEvent({
    action: "REGISTRATION_VERIFIED",
    entityType: "SchoolRegistration",
    entityId: registration.id,
    details: {
      schoolCode: registration.schoolCode,
      adminEmail: registration.adminEmail,
    },
  });

  return {
    registration: updated,
    message:
      "Email verified successfully. Your application is now queued for Platform Administrator review.",
  };
}

/**
 * Super Admin review action: Approves a pending school application.
 * Atomically provisions the operational School tenant and initial School Admin invitation.
 */
export async function approveRegistration(registrationId: string, reviewedByUserId: string) {
  const registration = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
  });

  if (!registration) {
    throw new NotFoundError("Registration application not found");
  }

  if (registration.status === "APPROVED") {
    throw new BadRequestError("This application has already been approved");
  }

  if (registration.status === "REJECTED") {
    throw new BadRequestError("Cannot approve a rejected application");
  }

  // Provision school and first admin invitation
  const provisionResult = await provisionSchoolWithAdmin({
    name: registration.schoolName,
    code: registration.schoolCode,
    slug: registration.desiredSlug,
    adminName: registration.adminName,
    adminEmail: registration.adminEmail,
    adminPhone: registration.adminPhone ?? undefined,
    provisionedById: reviewedByUserId,
  });

  // Link registration to the newly provisioned school
  const updatedRegistration = await prisma.schoolRegistration.update({
    where: { id: registration.id },
    data: {
      status: "APPROVED",
      reviewedById: reviewedByUserId,
      reviewedAt: new Date(),
      schoolId: provisionResult.school.id,
    },
  });

  await logAuditEvent({
    action: "REGISTRATION_APPROVED",
    entityType: "SchoolRegistration",
    entityId: registration.id,
    schoolId: provisionResult.school.id,
    userId: reviewedByUserId,
    details: {
      schoolCode: registration.schoolCode,
      schoolId: provisionResult.school.id,
      adminEmail: registration.adminEmail,
    },
  });

  return {
    registration: updatedRegistration,
    school: provisionResult.school,
    activationUrl: provisionResult.activationUrl,
  };
}

/**
 * Super Admin review action: Rejects a pending school application with an optional reason.
 */
export async function rejectRegistration(
  registrationId: string,
  reviewedByUserId: string,
  reason?: string
) {
  const registration = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
  });

  if (!registration) {
    throw new NotFoundError("Registration application not found");
  }

  if (registration.status === "APPROVED") {
    throw new BadRequestError("Cannot reject an application that has already been approved");
  }

  const updatedRegistration = await prisma.schoolRegistration.update({
    where: { id: registration.id },
    data: {
      status: "REJECTED",
      reviewedById: reviewedByUserId,
      reviewedAt: new Date(),
      rejectionReason: reason?.trim() || "Application does not meet platform requirements.",
    },
  });

  await logAuditEvent({
    action: "REGISTRATION_REJECTED",
    entityType: "SchoolRegistration",
    entityId: registration.id,
    userId: reviewedByUserId,
    details: {
      schoolCode: registration.schoolCode,
      reason: updatedRegistration.rejectionReason,
    },
  });

  // Dispatch rejection notification email
  await sendEmail({
    to: registration.adminEmail,
    subject: `Update regarding your school registration for ${registration.schoolName}`,
    text: `Your application to register ${registration.schoolName} could not be approved at this time. Reason: ${updatedRegistration.rejectionReason}`,
    html: `<p>Your application to register <strong>${registration.schoolName}</strong> could not be approved at this time.</p><p><strong>Reason:</strong> ${updatedRegistration.rejectionReason}</p>`,
  });

  return { registration: updatedRegistration };
}
