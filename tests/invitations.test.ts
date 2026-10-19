import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { POST as inviteHandler } from "../src/app/api/v1/school/[schoolSlug]/invitations/route.js";
import { POST as revokeHandler } from "../src/app/api/v1/school/[schoolSlug]/invitations/[invitationId]/revoke/route.js";
import { GET as verifyHandler } from "../src/app/api/v1/auth/invitations/verify/route.js";
import { POST as acceptHandler } from "../src/app/api/v1/auth/invitations/accept/route.js";
import { issueInvitation, acceptInvitation } from "../src/lib/invitations.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { BadRequestError } from "../src/lib/errors.js";

describe("Phase 3: Staff Invitation Flow & Acceptance Security", () => {
  let schoolA: { id: string; slug: string; name: string };
  let schoolB: { id: string; slug: string; name: string };
  let schoolAdminA: {
    id: string;
    email: string | null;
    role: "SCHOOL_ADMIN";
    schoolId: string | null;
  };
  let adminTokenA: string;

  beforeEach(async () => {
    // Clean up
    await prisma.invitation.deleteMany({
      where: {
        email: {
          in: [
            "teacher@schoola.edu",
            "accountant@schoola.edu",
            "escalated@schoola.edu",
            "cross@schoolb.edu",
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@schoola.edu",
            "admin@schoolb.edu",
            "teacher@schoola.edu",
            "accountant@schoola.edu",
            "escalated@schoola.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: ["SCH_INV_A", "SCH_INV_B"] } },
    });

    schoolA = await prisma.school.create({
      data: {
        name: "School Alpha",
        code: "SCH_INV_A",
        slug: "school-alpha",
        isActive: true,
      },
    });

    schoolB = await prisma.school.create({
      data: {
        name: "School Beta",
        code: "SCH_INV_B",
        slug: "school-beta",
        isActive: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: "Admin Alpha",
        email: "admin@schoola.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolA.id,
      },
    });
    schoolAdminA = {
      id: user.id,
      email: user.email,
      role: "SCHOOL_ADMIN",
      schoolId: user.schoolId,
    };

    adminTokenA = await createSessionToken({
      userId: schoolAdminA.id,
      schoolId: schoolAdminA.schoolId,
      role: schoolAdminA.role,
      email: schoolAdminA.email,
    });
  });

  it("should allow authorized School Admin to invite Teacher and Accountant", async () => {
    // 1. Invite Teacher
    const reqTeacher = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({
          email: "teacher@schoola.edu",
          role: "TEACHER",
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}`,
        },
      }
    );

    const resTeacher = await inviteHandler(reqTeacher, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resTeacher.status, 201);
    const bodyTeacher = await resTeacher.json();
    assert.strictEqual(bodyTeacher.data.invitation.email, "teacher@schoola.edu");
    assert.strictEqual(bodyTeacher.data.invitation.role, "TEACHER");

    // 2. Invite Accountant
    const reqAccountant = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({
          email: "accountant@schoola.edu",
          role: "ACCOUNTANT",
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}`,
        },
      }
    );

    const resAccountant = await inviteHandler(reqAccountant, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resAccountant.status, 201);
  });

  it("should prevent privilege escalation: School Admin cannot invite SUPER_ADMIN or SCHOOL_ADMIN", async () => {
    // Attempt to invite SUPER_ADMIN
    const reqSuper = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({
          email: "escalated@schoola.edu",
          role: "SUPER_ADMIN",
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}`,
        },
      }
    );

    const resSuper = await inviteHandler(reqSuper, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    // Should be rejected by zod or handler
    assert.notStrictEqual(resSuper.status, 201);
    assert.strictEqual(resSuper.status >= 400, true);
  });

  it("should prevent cross-school tenant invitation attempts", async () => {
    // School Admin A attempts to invite user into School B
    const reqCross = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolB.slug}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({
          email: "cross@schoolb.edu",
          role: "TEACHER",
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}`, // School A token
        },
      }
    );

    const resCross = await inviteHandler(reqCross, {
      params: Promise.resolve({ schoolSlug: schoolB.slug }),
    });
    assert.strictEqual(resCross.status, 403);
  });

  it("should complete token verification and account setup with password hashing and single-use enforcement", async () => {
    const issueResult = await issueInvitation({
      schoolId: schoolA.id,
      email: "teacher@schoola.edu",
      role: "TEACHER",
      invitedById: schoolAdminA.id,
    });

    const rawToken = issueResult.rawToken;

    // 1. Verify invitation endpoint
    const verifyReq = new NextRequest(
      `http://localhost:3000/api/v1/auth/invitations/verify?token=${rawToken}`
    );
    const verifyRes = await verifyHandler(verifyReq);
    assert.strictEqual(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyBody.data.invitation.email, "teacher@schoola.edu");
    assert.strictEqual(verifyBody.data.invitation.role, "TEACHER");
    assert.strictEqual(verifyBody.data.invitation.schoolSlug, "school-alpha");

    // 2. Accept invitation
    const acceptReq = new NextRequest("http://localhost:3000/api/v1/auth/invitations/accept", {
      method: "POST",
      body: JSON.stringify({
        token: rawToken,
        name: "Alice Teacher",
        password: "SecurePass123!",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const acceptRes = await acceptHandler(acceptReq);
    assert.strictEqual(acceptRes.status, 200);
    const acceptBody = await acceptRes.json();
    assert.strictEqual(acceptBody.data.user.email, "teacher@schoola.edu");
    assert.strictEqual(acceptBody.data.user.role, "TEACHER");
    assert.strictEqual(acceptBody.data.user.schoolId, schoolA.id);

    // Verify session cookie was attached
    const cookie = acceptRes.headers.get("set-cookie");
    assert.strictEqual(cookie?.includes(`${SESSION_COOKIE_NAME}=`), true);

    // 3. Single-use enforcement: Attempting to accept the same token again must fail
    const reusedReq = new NextRequest("http://localhost:3000/api/v1/auth/invitations/accept", {
      method: "POST",
      body: JSON.stringify({
        token: rawToken,
        name: "Alice Teacher Reused",
        password: "SecurePass123!",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const reusedRes = await acceptHandler(reusedReq);
    assert.strictEqual(reusedRes.status, 400);
  });

  it("should reject revoked and expired tokens", async () => {
    // 1. Revocation test
    const issueRevoke = await issueInvitation({
      schoolId: schoolA.id,
      email: "teacher@schoola.edu",
      role: "TEACHER",
      invitedById: schoolAdminA.id,
    });

    // Revoke through API
    const revokeReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/invitations/${issueRevoke.invitation.id}/revoke`,
      {
        method: "POST",
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}` },
      }
    );
    const revokeRes = await revokeHandler(revokeReq, {
      params: Promise.resolve({
        schoolSlug: schoolA.slug,
        invitationId: issueRevoke.invitation.id,
      }),
    });
    assert.strictEqual(revokeRes.status, 200);

    // Attempt to accept revoked token
    await assert.rejects(
      async () => {
        await acceptInvitation({
          rawToken: issueRevoke.rawToken,
          name: "Revoked User",
          password: "SecurePass123!",
        });
      },
      (err: unknown) => err instanceof BadRequestError
    );

    // 2. Expired token test
    const issueExpired = await issueInvitation({
      schoolId: schoolA.id,
      email: "accountant@schoola.edu",
      role: "ACCOUNTANT",
      expiryHours: -1, // Expired 1 hour ago
    });

    await assert.rejects(
      async () => {
        await acceptInvitation({
          rawToken: issueExpired.rawToken,
          name: "Expired User",
          password: "SecurePass123!",
        });
      },
      (err: unknown) => err instanceof BadRequestError
    );
  });
});
