import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { POST as submitRegistrationHandler } from "../src/app/api/v1/public/register-school/route.js";
import { GET as verifyRegistrationHandler } from "../src/app/api/v1/public/register-school/verify/route.js";
import { GET as listRegistrationsHandler } from "../src/app/api/v1/platform/registrations/route.js";
import { POST as approveRegistrationHandler } from "../src/app/api/v1/platform/registrations/[registrationId]/approve/route.js";
import { POST as rejectRegistrationHandler } from "../src/app/api/v1/platform/registrations/[registrationId]/reject/route.js";
import { submitSchoolRegistration } from "../src/lib/school-registration.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { getLatestEmailFor } from "../src/lib/email.js";

describe("Phase 5: Public School Registration for Future SaaS Customers", () => {
  let superAdminUser: { id: string; email: string | null; role: "SUPER_ADMIN" };
  let superAdminToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.invitation.deleteMany({
      where: { email: { in: ["applicant@newacademy.org", "rejected@newacademy.org"] } },
    });
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ["super@platform.local", "applicant@newacademy.org", "rejected@newacademy.org"],
        },
      },
      select: { id: true },
    });
    if (testUsers.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: testUsers.map((u) => u.id) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: testUsers.map((u) => u.id) } },
      });
    }
    await prisma.schoolRegistration.deleteMany({
      where: {
        adminEmail: { in: ["applicant@newacademy.org", "rejected@newacademy.org"] },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: ["NEW_ACAD_01", "REJ_SCH_01"] } },
    });

    const user = await prisma.user.create({
      data: {
        name: "Platform Master Admin",
        email: "super@platform.local",
        role: "SUPER_ADMIN",
        schoolId: null,
      },
    });
    superAdminUser = {
      id: user.id,
      email: user.email,
      role: "SUPER_ADMIN",
    };

    superAdminToken = await createSessionToken({
      userId: superAdminUser.id,
      schoolId: null,
      role: "SUPER_ADMIN",
      email: superAdminUser.email,
    });
  });

  it("should create unprivileged pending registration from public submission without creating operational records", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/public/register-school", {
      method: "POST",
      body: JSON.stringify({
        schoolName: "New Horizon Academy",
        schoolCode: "NEW_ACAD_01",
        desiredSlug: "new-horizon-academy",
        adminName: "Dean Thomas",
        adminEmail: "applicant@newacademy.org",
        adminPhone: "+15551234",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await submitRegistrationHandler(req);
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.registration.status, "PENDING_VERIFICATION");

    // Verify NO operational school or user exists yet
    const schoolCount = await prisma.school.count({ where: { code: "NEW_ACAD_01" } });
    assert.strictEqual(
      schoolCount,
      0,
      "No operational school must be created from unverified public submission"
    );

    const userCount = await prisma.user.count({ where: { email: "applicant@newacademy.org" } });
    assert.strictEqual(
      userCount,
      0,
      "No operational user must be created from unverified public submission"
    );

    // Verify verification email was dispatched
    const email = getLatestEmailFor("applicant@newacademy.org");
    assert.notStrictEqual(email, undefined);
    assert.strictEqual(email?.subject.includes("Verify your school registration"), true);
  });

  it("should transition from PENDING_VERIFICATION to PENDING_REVIEW upon email token verification", async () => {
    const submitResult = await submitSchoolRegistration({
      schoolName: "New Horizon Academy",
      schoolCode: "NEW_ACAD_01",
      desiredSlug: "new-horizon-academy",
      adminName: "Dean Thomas",
      adminEmail: "applicant@newacademy.org",
    });

    const rawToken = submitResult.rawVerificationToken;

    // Verify endpoint
    const verifyReq = new NextRequest(
      `http://localhost:3000/api/v1/public/register-school/verify?token=${rawToken}`
    );
    const verifyRes = await verifyRegistrationHandler(verifyReq);
    assert.strictEqual(verifyRes.status, 200);

    const updated = await prisma.schoolRegistration.findUnique({
      where: { id: submitResult.registration.id },
    });
    assert.strictEqual(updated?.status, "PENDING_REVIEW");
    assert.notStrictEqual(updated?.emailVerifiedAt, null);
  });

  it("should allow Platform Super Admin to approve registration and provision school & admin invitation", async () => {
    const submitResult = await submitSchoolRegistration({
      schoolName: "New Horizon Academy",
      schoolCode: "NEW_ACAD_01",
      desiredSlug: "new-horizon-academy",
      adminName: "Dean Thomas",
      adminEmail: "applicant@newacademy.org",
    });

    // 1. Super Admin lists registrations
    const listReq = new NextRequest("http://localhost:3000/api/v1/platform/registrations", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
    });
    const listRes = await listRegistrationsHandler(listReq);
    assert.strictEqual(listRes.status, 200);

    // 2. Super Admin approves registration
    const approveReq = new NextRequest(
      `http://localhost:3000/api/v1/platform/registrations/${submitResult.registration.id}/approve`,
      {
        method: "POST",
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      }
    );

    const approveRes = await approveRegistrationHandler(approveReq, {
      params: Promise.resolve({ registrationId: submitResult.registration.id }),
    });
    assert.strictEqual(approveRes.status, 200);
    const approveBody = await approveRes.json();
    assert.strictEqual(approveBody.data.school.code, "NEW_ACAD_01");
    assert.notStrictEqual(approveBody.data.activationUrl, undefined);

    // Verify operational school and invitation now exist in database
    const operationalSchool = await prisma.school.findUnique({
      where: { code: "NEW_ACAD_01" },
    });
    assert.notStrictEqual(operationalSchool, null);
    assert.strictEqual(operationalSchool?.status, "ACTIVE");

    const invitation = await prisma.invitation.findFirst({
      where: { schoolId: operationalSchool?.id, email: "applicant@newacademy.org" },
    });
    assert.notStrictEqual(invitation, null);
    assert.strictEqual(invitation?.role, "SCHOOL_ADMIN");
  });

  it("should allow Platform Super Admin to reject registration with a documented reason", async () => {
    const submitResult = await submitSchoolRegistration({
      schoolName: "Rejected School",
      schoolCode: "REJ_SCH_01",
      desiredSlug: "rejected-school",
      adminName: "Fake Admin",
      adminEmail: "rejected@newacademy.org",
    });

    const rejectReq = new NextRequest(
      `http://localhost:3000/api/v1/platform/registrations/${submitResult.registration.id}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "School accreditation documents could not be verified." }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
        },
      }
    );

    const rejectRes = await rejectRegistrationHandler(rejectReq, {
      params: Promise.resolve({ registrationId: submitResult.registration.id }),
    });
    assert.strictEqual(rejectRes.status, 200);

    const updated = await prisma.schoolRegistration.findUnique({
      where: { id: submitResult.registration.id },
    });
    assert.strictEqual(updated?.status, "REJECTED");
    assert.strictEqual(
      updated?.rejectionReason,
      "School accreditation documents could not be verified."
    );

    // Verify rejection email was dispatched
    const email = getLatestEmailFor("rejected@newacademy.org");
    assert.notStrictEqual(email, undefined);
    assert.strictEqual(
      email?.text.includes("School accreditation documents could not be verified."),
      true
    );
  });
});
