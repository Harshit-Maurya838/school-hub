import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BadRequestError, ConflictError, ValidationError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { sendRegistrationOtpEmail, sendRegistrationSuccessEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { hashPassword, passwordSchema } from "@/modules/auth";
import { normalizeCode, normalizeSlug } from "./provisioning";
import { hashToken } from "./invitations";
import { CLASS_RANGES, sectionsForRange } from "./school-profile-rules";

export const REGISTRATION_OTP_EXPIRY_MINUTES = 10;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;

/** Mediums offered on the public form; "Both" maps to BILINGUAL. */
export const REGISTRATION_MEDIUMS = ["ENGLISH", "HINDI", "BILINGUAL"] as const;

/** New schools pick from the current ranges only; legacy ranges are kept for existing profiles. */
const classRangeValues = CLASS_RANGES.filter((r) => !r.legacy).map((r) => r.value) as [
  (typeof CLASS_RANGES)[number]["value"],
  ...(typeof CLASS_RANGES)[number]["value"][],
];

export const schoolRegistrationSchema = z
  .object({
    adminName: z.string().trim().min(2, "Admin name must be at least 2 characters"),
    schoolName: z.string().trim().min(2, "School name must be at least 2 characters"),
    udiseCode: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "U-DISE+ code must be exactly 11 digits"),
    classRange: z.enum(classRangeValues, { error: "Select a class range" }),
    hasPrePrimary: z.boolean().default(false),
    hasPlayGroup: z.boolean().default(false),
    medium: z.enum(REGISTRATION_MEDIUMS, { error: "Select a medium" }),
    principalName: z.string().trim().min(2, "Principal name must be at least 2 characters"),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
    email: z
      .string()
      .transform((val) => val.trim().toLowerCase())
      .pipe(z.string().email("Invalid email address")),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "You must accept the Terms & Conditions" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  // The range decides the preschool sections it can have; store what it allows.
  .transform((d) => {
    const sections = sectionsForRange(d.classRange, {
      prePrimary: d.hasPrePrimary,
      playGroup: d.hasPlayGroup,
    });
    return { ...d, hasPrePrimary: sections.prePrimary, hasPlayGroup: sections.playGroup };
  });

const verifyOtpSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Invalid email address")),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

type RegistrationDetails = Pick<
  z.infer<typeof schoolRegistrationSchema>,
  "classRange" | "hasPrePrimary" | "hasPlayGroup" | "medium" | "principalName"
>;

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function isSlugTaken(slug: string): Promise<boolean> {
  const [school, registration] = await Promise.all([
    prisma.school.findUnique({ where: { slug }, select: { id: true } }),
    prisma.schoolRegistration.findUnique({ where: { desiredSlug: slug }, select: { id: true } }),
  ]);
  return Boolean(school || registration);
}

/**
 * Step 1 of public self-registration: validates the form, stores it as a pending
 * registration (password already hashed) and emails a 6-digit OTP to the admin.
 * Calling it again for the same email replaces the pending one and sends a fresh OTP.
 */
export async function requestSchoolRegistrationOtp(input: unknown, meta: RequestMeta = {}) {
  const parsed = schoolRegistrationSchema.safeParse(input);
  if (!parsed.success)
    throw new ValidationError(parsed.error.issues[0]?.message, parsed.error.issues);
  const data = parsed.data;
  const schoolCode = normalizeCode(data.udiseCode);

  const [existingSchool, existingUdise, existingUser] = await Promise.all([
    prisma.school.findUnique({ where: { code: schoolCode }, select: { id: true } }),
    prisma.schoolProfile.findUnique({ where: { udiseCode: data.udiseCode }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }),
  ]);
  if (existingSchool || existingUdise) {
    throw new ConflictError(`A school with U-DISE+ code '${data.udiseCode}' is already registered`);
  }
  if (existingUser) {
    throw new ConflictError(`An account with email '${data.email}' already exists`);
  }

  // Drop this applicant's earlier attempt and any abandoned attempts whose OTP window has passed.
  const staleBefore = new Date(Date.now() - REGISTRATION_OTP_EXPIRY_MINUTES * 60 * 1000);
  await prisma.schoolRegistration.deleteMany({
    where: {
      status: { not: "APPROVED" },
      OR: [{ adminEmail: data.email }, { updatedAt: { lt: staleBefore } }],
    },
  });

  const pendingForCode = await prisma.schoolRegistration.findUnique({
    where: { schoolCode },
    select: { id: true },
  });
  if (pendingForCode) {
    throw new ConflictError(
      `A registration for U-DISE+ code '${data.udiseCode}' is already in progress. Try again in ${REGISTRATION_OTP_EXPIRY_MINUTES} minutes.`
    );
  }

  const baseSlug = normalizeSlug(data.schoolName) || "school";
  let desiredSlug = baseSlug;
  if (await isSlugTaken(desiredSlug)) desiredSlug = `${baseSlug}-${data.udiseCode.slice(-4)}`;
  if (await isSlugTaken(desiredSlug)) desiredSlug = `${baseSlug}-${data.udiseCode}`;

  const rawOtp = generateOtp();
  const details: RegistrationDetails = {
    classRange: data.classRange,
    hasPrePrimary: data.hasPrePrimary,
    hasPlayGroup: data.hasPlayGroup,
    medium: data.medium,
    principalName: data.principalName,
  };

  const registration = await prisma.schoolRegistration.create({
    data: {
      schoolName: data.schoolName,
      schoolCode,
      desiredSlug,
      adminName: data.adminName,
      adminEmail: data.email,
      adminPhone: data.mobile,
      status: "PENDING_VERIFICATION",
      passwordHash: await hashPassword(data.password),
      otpHash: hashToken(rawOtp),
      otpExpiresAt: new Date(Date.now() + REGISTRATION_OTP_EXPIRY_MINUTES * 60 * 1000),
      details,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    },
    select: { id: true, schoolName: true, adminEmail: true, status: true },
  });

  await logAuditEvent({
    action: "REGISTRATION_SUBMITTED",
    entityType: "SchoolRegistration",
    entityId: registration.id,
    details: { schoolName: data.schoolName, schoolCode, adminEmail: data.email },
    ...meta,
  });

  await sendRegistrationOtpEmail({
    to: data.email,
    otp: rawOtp,
    schoolName: data.schoolName,
    recipientName: data.adminName,
    expiresInMinutes: REGISTRATION_OTP_EXPIRY_MINUTES,
  });

  logger.info({ registrationId: registration.id, schoolCode }, "Registration OTP issued");

  return {
    registration,
    expiresInMinutes: REGISTRATION_OTP_EXPIRY_MINUTES,
    /** Returned for tests only; route handlers must never send it to the client. */
    rawOtp,
  };
}

/**
 * Step 2 of public self-registration: checks the OTP and, when it matches, creates the
 * school, its profile and the active SCHOOL_ADMIN account in one transaction.
 */
export async function verifySchoolRegistrationOtp(input: unknown, meta: RequestMeta = {}) {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success)
    throw new ValidationError(parsed.error.issues[0]?.message, parsed.error.issues);
  const { email, otp } = parsed.data;

  const registration = await prisma.schoolRegistration.findUnique({
    where: { adminEmail: email },
  });
  if (
    !registration ||
    registration.status !== "PENDING_VERIFICATION" ||
    !registration.otpHash ||
    !registration.passwordHash
  ) {
    throw new BadRequestError("No pending registration for this email. Please request a new OTP.");
  }
  if (!registration.otpExpiresAt || registration.otpExpiresAt < new Date()) {
    throw new BadRequestError("This OTP has expired. Please request a new one.");
  }
  if (registration.otpAttempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
    throw new BadRequestError("Too many incorrect attempts. Please request a new OTP.");
  }

  const matches = crypto.timingSafeEqual(
    Buffer.from(hashToken(otp), "hex"),
    Buffer.from(registration.otpHash, "hex")
  );
  if (!matches) {
    await prisma.schoolRegistration.update({
      where: { id: registration.id },
      data: { otpAttempts: { increment: 1 } },
    });
    throw new BadRequestError("Incorrect OTP. Please check the code sent to your email.");
  }

  const details = registration.details as unknown as RegistrationDetails;
  const passwordHash = registration.passwordHash;

  const { school, user } = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: registration.schoolName,
        code: registration.schoolCode,
        slug: registration.desiredSlug,
        profile: {
          create: {
            udiseCode: registration.schoolCode,
            officialEmail: registration.adminEmail,
            contactMobile: registration.adminPhone,
            instructionMedium: details.medium,
            classRange: details.classRange,
            includesPrePrimary: details.hasPrePrimary,
            includesPlayGroup: details.hasPlayGroup,
            hosName: details.principalName,
          },
        },
      },
      select: { id: true, name: true, code: true, slug: true },
    });

    const user = await tx.user.create({
      data: {
        schoolId: school.id,
        name: registration.adminName,
        email: registration.adminEmail,
        phone: registration.adminPhone,
        passwordHash,
        role: "SCHOOL_ADMIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        sessionVersion: true,
      },
    });

    // Clear the stored secrets once they have served their purpose.
    await tx.schoolRegistration.update({
      where: { id: registration.id },
      data: {
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        schoolId: school.id,
        otpHash: null,
        passwordHash: null,
      },
    });

    return { school, user };
  });

  await logAuditEvent({
    action: "SCHOOL_PROVISIONED",
    entityType: "School",
    entityId: school.id,
    schoolId: school.id,
    userId: user.id,
    details: { schoolCode: school.code, schoolSlug: school.slug, selfRegistered: true },
    ...meta,
  });
  await logAuditEvent({
    action: "STAFF_MEMBER_CREATED",
    entityType: "User",
    entityId: user.id,
    schoolId: school.id,
    userId: user.id,
    details: { role: "SCHOOL_ADMIN", email: user.email, selfRegistered: true },
    ...meta,
  });

  await sendRegistrationSuccessEmail({
    to: registration.adminEmail,
    schoolName: school.name,
    recipientName: registration.adminName,
    loginUrl: `${env.APP_URL.replace(/\/+$/, "")}/auth`,
  });

  logger.info({ schoolId: school.id, userId: user.id }, "School self-registration completed");

  return { school, user };
}
