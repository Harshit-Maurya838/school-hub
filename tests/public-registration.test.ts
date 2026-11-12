import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { POST as requestOtpHandler } from "../src/app/api/v1/public/register-school/route.js";
import { POST as verifyOtpHandler } from "../src/app/api/v1/public/register-school/verify/route.js";
import {
  requestSchoolRegistrationOtp,
  verifySchoolRegistrationOtp,
  REGISTRATION_OTP_MAX_ATTEMPTS,
} from "../src/modules/onboarding/services/school-registration.js";
import { verifyPassword } from "../src/modules/auth/services/password.js";
import { SESSION_COOKIE_NAME } from "../src/modules/auth/services/auth.js";
import { clearSentEmails, getLatestEmailFor } from "../src/lib/email.js";
import { BadRequestError, ConflictError, ValidationError } from "../src/lib/errors.js";

const EMAIL = "applicant@newacademy.org";
const OTHER_EMAIL = "second@newacademy.org";
const UDISE = "09123456789";
const UDISE_2 = "09123456700";

const validForm = (overrides: Record<string, unknown> = {}) => ({
  adminName: "Dean Thomas",
  schoolName: "New Horizon Academy",
  udiseCode: UDISE,
  classRange: "CLASS_1_TO_8",
  hasPrePrimary: true,
  hasPlayGroup: false,
  medium: "BILINGUAL",
  principalName: "Dr. Minerva Rao",
  mobile: "9876543210",
  email: EMAIL,
  password: "Secure123",
  confirmPassword: "Secure123",
  acceptTerms: true,
  ...overrides,
});

const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost:3000${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

async function cleanup() {
  const emails = [EMAIL, OTHER_EMAIL];
  const schools = await prisma.school.findMany({
    where: { code: { in: [UDISE, UDISE_2] } },
    select: { id: true },
  });
  const schoolIds = schools.map((s) => s.id);
  await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.schoolRegistration.deleteMany({ where: { adminEmail: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
}

describe("Public school self-registration with email OTP", () => {
  beforeEach(async () => {
    clearSentEmails();
    await cleanup();
  });
  after(cleanup);

  it("emails an OTP without creating a school or user, and never returns the OTP", async () => {
    const res = await requestOtpHandler(post("/api/v1/public/register-school", validForm()));
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.email, EMAIL);
    assert.strictEqual(JSON.stringify(body).match(/\b\d{6}\b/), null, "OTP must not leak");

    assert.strictEqual(await prisma.school.count({ where: { code: UDISE } }), 0);
    assert.strictEqual(await prisma.user.count({ where: { email: EMAIL } }), 0);

    const email = getLatestEmailFor(EMAIL);
    assert.ok(email?.subject.includes("verification code"));
    assert.match(email!.text, /\b\d{6}\b/);

    const pending = await prisma.schoolRegistration.findUnique({ where: { adminEmail: EMAIL } });
    assert.strictEqual(pending?.status, "PENDING_VERIFICATION");
    assert.notStrictEqual(pending?.passwordHash, "Secure123", "password must be hashed");
  });

  it("rejects invalid payloads", async () => {
    const cases = [
      { confirmPassword: "Different123" },
      { password: "weak", confirmPassword: "weak" },
      { udiseCode: "123" },
      { mobile: "12345" },
      { acceptTerms: false },
      { classRange: "CLASS_1_TO_99" },
    ];
    for (const overrides of cases) {
      const res = await requestOtpHandler(
        post("/api/v1/public/register-school", validForm(overrides))
      );
      assert.strictEqual(res.status, 422, `expected 422 for ${JSON.stringify(overrides)}`);
    }
    assert.strictEqual(getLatestEmailFor(EMAIL), undefined);
  });

  it("creates the school, profile and active admin on a correct OTP, sends success mail and signs in", async () => {
    const { rawOtp } = await requestSchoolRegistrationOtp(validForm());

    const res = await verifyOtpHandler(
      post("/api/v1/public/register-school/verify", { email: EMAIL, otp: rawOtp })
    );
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.school.code, UDISE);
    assert.strictEqual(body.data.user.role, "SCHOOL_ADMIN");
    assert.strictEqual(body.data.user.sessionVersion, undefined);
    assert.ok(res.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));

    const school = await prisma.school.findUnique({
      where: { code: UDISE },
      include: { profile: true },
    });
    assert.strictEqual(school?.status, "ACTIVE");
    assert.ok(school?.slug.startsWith("new-horizon-academy"));
    assert.strictEqual(school?.profile?.udiseCode, UDISE);
    assert.strictEqual(school?.profile?.classRange, "CLASS_1_TO_8");
    assert.strictEqual(school?.profile?.instructionMedium, "BILINGUAL");
    assert.strictEqual(school?.profile?.includesPrePrimary, true);
    assert.strictEqual(school?.profile?.includesPlayGroup, false);
    assert.strictEqual(school?.profile?.hosName, "Dr. Minerva Rao");

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    assert.strictEqual(user?.schoolId, school?.id);
    assert.strictEqual(user?.isActive, true);
    assert.ok(await verifyPassword("Secure123", user!.passwordHash!));

    const registration = await prisma.schoolRegistration.findUnique({
      where: { adminEmail: EMAIL },
    });
    assert.strictEqual(registration?.status, "APPROVED");
    assert.strictEqual(registration?.otpHash, null);
    assert.strictEqual(registration?.passwordHash, null);

    assert.ok(getLatestEmailFor(EMAIL)?.subject.includes("is registered"));
    assert.strictEqual(await prisma.invitation.count({ where: { email: EMAIL } }), 0);

    // The same OTP cannot be replayed.
    await assert.rejects(
      () => verifySchoolRegistrationOtp({ email: EMAIL, otp: rawOtp }),
      BadRequestError
    );
  });

  it("rejects a wrong OTP and locks after too many attempts", async () => {
    const { rawOtp } = await requestSchoolRegistrationOtp(validForm());
    const wrong = rawOtp === "000000" ? "111111" : "000000";

    for (let i = 0; i < REGISTRATION_OTP_MAX_ATTEMPTS; i++) {
      await assert.rejects(
        () => verifySchoolRegistrationOtp({ email: EMAIL, otp: wrong }),
        BadRequestError
      );
    }
    await assert.rejects(
      () => verifySchoolRegistrationOtp({ email: EMAIL, otp: rawOtp }),
      /Too many incorrect attempts/
    );
    assert.strictEqual(await prisma.school.count({ where: { code: UDISE } }), 0);
  });

  it("rejects an expired OTP", async () => {
    const { rawOtp, registration } = await requestSchoolRegistrationOtp(validForm());
    await prisma.schoolRegistration.update({
      where: { id: registration.id },
      data: { otpExpiresAt: new Date(Date.now() - 1000) },
    });
    await assert.rejects(
      () => verifySchoolRegistrationOtp({ email: EMAIL, otp: rawOtp }),
      /expired/
    );
  });

  it("resending replaces the previous OTP", async () => {
    const first = await requestSchoolRegistrationOtp(validForm());
    const second = await requestSchoolRegistrationOtp(validForm());
    if (first.rawOtp !== second.rawOtp) {
      await assert.rejects(
        () => verifySchoolRegistrationOtp({ email: EMAIL, otp: first.rawOtp }),
        BadRequestError
      );
    }
    const { school } = await verifySchoolRegistrationOtp({ email: EMAIL, otp: second.rawOtp });
    assert.strictEqual(school.code, UDISE);
  });

  it("blocks duplicate U-DISE codes and existing account emails", async () => {
    const { rawOtp } = await requestSchoolRegistrationOtp(validForm());
    await verifySchoolRegistrationOtp({ email: EMAIL, otp: rawOtp });

    await assert.rejects(
      () => requestSchoolRegistrationOtp(validForm({ email: OTHER_EMAIL })),
      ConflictError
    );
    await assert.rejects(
      () => requestSchoolRegistrationOtp(validForm({ udiseCode: UDISE_2 })),
      ConflictError
    );
  });

  it("rejects malformed verify payloads", async () => {
    await assert.rejects(
      () => verifySchoolRegistrationOtp({ email: EMAIL, otp: "12" }),
      ValidationError
    );
  });
});
