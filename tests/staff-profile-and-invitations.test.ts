import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import {
  POST as createStaffHandler,
  GET as listStaffHandler,
} from "../src/app/api/v1/school/[schoolSlug]/staff/route.js";
import { POST as bulkStaffHandler } from "../src/app/api/v1/school/[schoolSlug]/staff/bulk/route.js";
import { POST as staffInviteHandler } from "../src/app/api/v1/school/[schoolSlug]/staff/[staffId]/invite/route.js";
import { POST as resendInviteHandler } from "../src/app/api/v1/school/[schoolSlug]/invitations/[invitationId]/resend/route.js";
import { acceptInvitation } from "../src/lib/invitations.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";

describe("Staff Profile Creation, Bulk Addition & Re-invitation Workflow", () => {
  let schoolA: { id: string; slug: string; name: string };
  let schoolB: { id: string; slug: string; name: string };
  let adminA: { id: string; email: string | null; role: "SCHOOL_ADMIN"; schoolId: string | null };
  let adminB: { id: string; email: string | null; role: "SCHOOL_ADMIN"; schoolId: string | null };
  let adminTokenA: string;
  let adminTokenB: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.invitation.deleteMany({
      where: {
        email: {
          in: [
            "staff.solo@schoola.edu",
            "bulk.teacher1@schoola.edu",
            "bulk.teacher2@schoola.edu",
            "bulk.acct@schoola.edu",
            "resend.teacher@schoola.edu",
            "expired.teacher@schoola.edu",
          ],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin.staff.a@schoola.edu",
            "admin.staff.b@schoolb.edu",
            "staff.solo@schoola.edu",
            "bulk.teacher1@schoola.edu",
            "bulk.teacher2@schoola.edu",
            "bulk.acct@schoola.edu",
            "resend.teacher@schoola.edu",
            "expired.teacher@schoola.edu",
          ],
        },
      },
    });

    await prisma.school.deleteMany({
      where: { code: { in: ["SCH_STAFF_A", "SCH_STAFF_B"] } },
    });

    schoolA = await prisma.school.create({
      data: {
        name: "School Staff A",
        code: "SCH_STAFF_A",
        slug: "school-staff-a",
        isActive: true,
      },
    });

    schoolB = await prisma.school.create({
      data: {
        name: "School Staff B",
        code: "SCH_STAFF_B",
        slug: "school-staff-b",
        isActive: true,
      },
    });

    const userA = await prisma.user.create({
      data: {
        name: "Admin Staff Alpha",
        email: "admin.staff.a@schoola.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolA.id,
      },
    });
    adminA = { id: userA.id, email: userA.email, role: "SCHOOL_ADMIN", schoolId: userA.schoolId };

    const userB = await prisma.user.create({
      data: {
        name: "Admin Staff Beta",
        email: "admin.staff.b@schoolb.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolB.id,
      },
    });
    adminB = { id: userB.id, email: userB.email, role: "SCHOOL_ADMIN", schoolId: userB.schoolId };

    adminTokenA = await createSessionToken({
      userId: adminA.id,
      schoolId: adminA.schoolId,
      role: adminA.role,
      email: adminA.email,
    });

    adminTokenB = await createSessionToken({
      userId: adminB.id,
      schoolId: adminB.schoolId,
      role: adminB.role,
      email: adminB.email,
    });
  });

  it("should allow an admin to create a staff profile first without sending an invitation immediately", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/staff`, {
      method: "POST",
      body: JSON.stringify({
        name: "Dr. Arthur Pendelton",
        email: "staff.solo@schoola.edu",
        phone: "+1 555-0123",
        role: "TEACHER",
        employeeId: "EMP-SOLO-01",
        designation: "Head of Chemistry",
        department: "Science",
        qualification: "Ph.D. Chemistry",
        specialization: "Organic Chemistry",
        joiningDate: "2024-09-01",
        sendInvite: false,
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}`,
      },
    });

    const res = await createStaffHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.user.name, "Dr. Arthur Pendelton");
    assert.strictEqual(body.data.user.email, "staff.solo@schoola.edu");
    assert.strictEqual(body.data.user.role, "TEACHER");
    assert.strictEqual(body.data.invitation, null);
    assert.strictEqual(body.data.actionUrl, null);

    // Verify in database that passwordHash is null and TeacherProfile is linked
    const createdInDb = await prisma.user.findUnique({
      where: { email: "staff.solo@schoola.edu" },
      include: { teacherProfile: true },
    });
    assert.ok(createdInDb);
    assert.strictEqual(createdInDb.passwordHash, null);
    assert.strictEqual(createdInDb.teacherProfile?.employeeId, "EMP-SOLO-01");
    assert.strictEqual(createdInDb.teacherProfile?.designation, "Head of Chemistry");

    // Fetch staff directory and verify status is NOT_INVITED
    const listReq = new NextRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/staff`, {
      method: "GET",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}` },
    });
    const listRes = await listStaffHandler(listReq, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    const soloMember = listBody.data.staff.find(
      (s: { email: string }) => s.email === "staff.solo@schoola.edu"
    );
    assert.ok(soloMember);
    assert.strictEqual(soloMember.invitationStatus, "NOT_INVITED");
    assert.strictEqual(soloMember.hasActiveAccount, false);
  });

  it("should bulk add multiple staff members with employee IDs and validate rows", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/staff/bulk`, {
      method: "POST",
      body: JSON.stringify({
        members: [
          {
            name: "Teacher One",
            email: "bulk.teacher1@schoola.edu",
            role: "TEACHER",
            employeeId: "EMP-B-101",
            designation: "Math Instructor",
            department: "Mathematics",
          },
          {
            name: "Teacher Two",
            email: "bulk.teacher2@schoola.edu",
            role: "TEACHER",
            employeeId: "EMP-B-102",
            designation: "English Lead",
            department: "Languages",
          },
          {
            name: "School Accountant",
            email: "bulk.acct@schoola.edu",
            role: "ACCOUNTANT",
          },
        ],
        sendInvitesImmediately: false,
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}`,
      },
    });

    const res = await bulkStaffHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.totalSubmitted, 3);
    assert.strictEqual(body.data.totalCreated, 3);
    assert.strictEqual(body.data.errors.length, 0);

    // Verify all 3 exist in DB
    const count = await prisma.user.count({
      where: {
        email: {
          in: ["bulk.teacher1@schoola.edu", "bulk.teacher2@schoola.edu", "bulk.acct@schoola.edu"],
        },
        schoolId: schoolA.id,
      },
    });
    assert.strictEqual(count, 3);
  });

  it("should allow inviting a pre-created staff member via dedicated invite endpoint", async () => {
    // 1. Create staff profile without invite
    const staffUser = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        name: "Resend Teacher",
        email: "resend.teacher@schoola.edu",
        role: "TEACHER",
        passwordHash: null,
      },
    });
    await prisma.teacherProfile.create({
      data: {
        schoolId: schoolA.id,
        userId: staffUser.id,
        employeeId: "EMP-RESEND-1",
      },
    });

    // 2. Call invite endpoint
    const inviteReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/staff/${staffUser.id}/invite`,
      {
        method: "POST",
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}` },
      }
    );

    const inviteRes = await staffInviteHandler(inviteReq, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, staffId: staffUser.id }),
    });

    assert.strictEqual(inviteRes.status, 200);
    const inviteBody = await inviteRes.json();
    assert.ok(inviteBody.data.actionUrl.includes("token="));
    assert.strictEqual(inviteBody.data.invitation.email, "resend.teacher@schoola.edu");
    assert.strictEqual(inviteBody.data.invitation.status, "PENDING");

    // 3. Verify invitation exists in DB and is linked
    const invInDb = await prisma.invitation.findFirst({
      where: { email: "resend.teacher@schoola.edu", schoolId: schoolA.id },
    });
    assert.ok(invInDb);
    assert.strictEqual(invInDb.status, "PENDING");
  });

  it("should allow resending an expired invitation to issue a new valid activation token", async () => {
    // 1. Create an expired invitation
    const rawToken = "initial-expired-token-32-chars-long-1234567";
    const crypto = await import("crypto");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiredInv = await prisma.invitation.create({
      data: {
        schoolId: schoolA.id,
        email: "expired.teacher@schoola.edu",
        role: "TEACHER",
        tokenHash,
        status: "EXPIRED",
        expiresAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hr ago
      },
    });

    // 2. Call resend endpoint
    const resendReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/invitations/${expiredInv.id}/resend`,
      {
        method: "POST",
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminTokenA}` },
      }
    );

    const resendRes = await resendInviteHandler(resendReq, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, invitationId: expiredInv.id }),
    });

    assert.strictEqual(resendRes.status, 200);
    const resendBody = await resendRes.json();
    assert.ok(resendBody.data.actionUrl);
    assert.strictEqual(resendBody.data.invitation.status, "PENDING");
    assert.strictEqual(resendBody.data.invitation.email, "expired.teacher@schoola.edu");

    // Verify old was revoked/replaced and new is active with future expiry
    const newExpiresAt = new Date(resendBody.data.invitation.expiresAt);
    assert.ok(newExpiresAt > new Date());

    // 3. Accept the newly issued token
    const acceptResult = await acceptInvitation({
      rawToken: resendBody.data.rawToken,
      name: "Expired Now Active Teacher",
      password: "StrongPassword123!",
    });
    assert.strictEqual(acceptResult.user.email, "expired.teacher@schoola.edu");
    assert.strictEqual(acceptResult.user.role, "TEACHER");

    // Verify user record has passwordHash now set
    const userInDb = await prisma.user.findUnique({
      where: { email: "expired.teacher@schoola.edu" },
    });
    assert.ok(userInDb?.passwordHash !== null);
  });

  it("should enforce tenant isolation preventing School B admin from managing School A staff", async () => {
    // School B admin tries to add staff to School A
    const req = new NextRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/staff`, {
      method: "POST",
      body: JSON.stringify({
        name: "Cross Tenant Intruder",
        email: "intruder@schoolb.edu",
        role: "TEACHER",
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${adminTokenB}`,
      },
    });

    const res = await createStaffHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });

    // Must be Forbidden (403)
    assert.strictEqual(res.status, 403);
  });
});
