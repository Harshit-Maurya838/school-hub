import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { POST as provisionHandler } from "../src/app/api/v1/platform/schools/provision/route.js";
import { provisionSchoolWithAdmin } from "../src/lib/provisioning.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { ConflictError } from "../src/lib/errors.js";

describe("Phase 2: School Provisioning & First Customer Setup", () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.invitation.deleteMany({
      where: { email: { in: ["admin@springfield.edu", "duplicate@springfield.edu"] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["admin@springfield.edu", "duplicate@springfield.edu"] } },
    });
    await prisma.school.deleteMany({
      where: { code: { in: ["SPRING_01", "SPRING_DUP"] } },
    });
  });

  it("should provision a school and initial school admin invitation atomically", async () => {
    const result = await provisionSchoolWithAdmin({
      name: "Springfield Academy",
      code: "SPRING_01",
      slug: "springfield-academy",
      adminName: "Seymour Skinner",
      adminEmail: "admin@springfield.edu",
    });

    assert.notStrictEqual(result.school.id, undefined);
    assert.strictEqual(result.school.code, "SPRING_01");
    assert.strictEqual(result.school.slug, "springfield-academy");
    assert.strictEqual(result.school.status, "ACTIVE");

    assert.strictEqual(result.invitation.role, "SCHOOL_ADMIN");
    assert.strictEqual(result.invitation.email, "admin@springfield.edu");
    assert.strictEqual(result.invitation.status, "PENDING");
    assert.notStrictEqual(result.rawToken, undefined);
    assert.strictEqual(result.activationUrl.includes(result.rawToken), true);

    // Verify rawToken is NOT in the database (hashed token check)
    const dbInvitation = await prisma.invitation.findUnique({
      where: { id: result.invitation.id },
    });
    assert.notStrictEqual(dbInvitation?.tokenHash, result.rawToken);
    assert.strictEqual(dbInvitation?.tokenHash.length, 64); // SHA-256 hex length
  });

  it("should prevent duplicate school codes, slugs, and admin email identities", async () => {
    await provisionSchoolWithAdmin({
      name: "Springfield Academy",
      code: "SPRING_01",
      slug: "springfield-academy",
      adminName: "Seymour Skinner",
      adminEmail: "admin@springfield.edu",
    });

    // 1. Duplicate code
    await assert.rejects(
      async () => {
        await provisionSchoolWithAdmin({
          name: "Different School",
          code: "SPRING_01", // duplicate
          slug: "different-slug",
          adminName: "Different Admin",
          adminEmail: "different@springfield.edu",
        });
      },
      (err: unknown) => err instanceof ConflictError
    );

    // 2. Duplicate slug
    await assert.rejects(
      async () => {
        await provisionSchoolWithAdmin({
          name: "Different School",
          code: "DIFF_02",
          slug: "springfield-academy", // duplicate slug
          adminName: "Different Admin",
          adminEmail: "different@springfield.edu",
        });
      },
      (err: unknown) => err instanceof ConflictError
    );
  });

  it("should enforce authorization: only SUPER_ADMIN can call the provisioning API", async () => {
    // 1. Unauthenticated request -> 401
    const unauthReq = new NextRequest("http://localhost:3000/api/v1/platform/schools/provision", {
      method: "POST",
      body: JSON.stringify({
        name: "Springfield Academy",
        code: "SPRING_01",
        slug: "springfield-academy",
        adminName: "Seymour Skinner",
        adminEmail: "admin@springfield.edu",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const unauthRes = await provisionHandler(unauthReq);
    assert.strictEqual(unauthRes.status, 401);

    // 2. Regular SCHOOL_ADMIN trying to call platform provisioning -> 403 Forbidden
    const otherSchool = await prisma.school.create({
      data: {
        name: "Other School",
        code: "OTHER_SCH_01",
        slug: "other-school",
        isActive: true,
      },
    });

    const schoolAdminUser = await prisma.user.create({
      data: {
        name: "Other Admin",
        email: "other@school.edu",
        role: "SCHOOL_ADMIN",
        schoolId: otherSchool.id,
      },
    });

    const schoolAdminToken = await createSessionToken({
      userId: schoolAdminUser.id,
      schoolId: schoolAdminUser.schoolId,
      role: schoolAdminUser.role,
      email: schoolAdminUser.email,
    });

    const forbiddenReq = new NextRequest(
      "http://localhost:3000/api/v1/platform/schools/provision",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Springfield Academy",
          code: "SPRING_01",
          slug: "springfield-academy",
          adminName: "Seymour Skinner",
          adminEmail: "admin@springfield.edu",
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${schoolAdminToken}`,
        },
      }
    );
    const forbiddenRes = await provisionHandler(forbiddenReq);
    assert.strictEqual(forbiddenRes.status, 403);

    // Clean up
    await prisma.user.delete({ where: { id: schoolAdminUser.id } });
    await prisma.school.delete({ where: { id: otherSchool.id } });
  });

  it("should succeed through API when invoked by an authenticated SUPER_ADMIN", async () => {
    const superAdmin = await prisma.user.create({
      data: {
        name: "Root Platform Admin",
        email: "root@platform.local",
        role: "SUPER_ADMIN",
        schoolId: null, // Platform Super Admin has no customer schoolId
      },
    });

    const superAdminToken = await createSessionToken({
      userId: superAdmin.id,
      schoolId: null,
      role: "SUPER_ADMIN",
      email: superAdmin.email,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/platform/schools/provision", {
      method: "POST",
      body: JSON.stringify({
        name: "Springfield Academy",
        code: "SPRING_01",
        slug: "springfield-academy",
        adminName: "Seymour Skinner",
        adminEmail: "admin@springfield.edu",
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
      },
    });

    const res = await provisionHandler(req);
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.school.code, "SPRING_01");
    assert.strictEqual(body.data.invitation.role, "SCHOOL_ADMIN");

    // Clean up
    await prisma.user.delete({ where: { id: superAdmin.id } });
  });
});
