import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import {
  POST as studentHandler,
  GET as listStudentsHandler,
} from "../src/app/api/v1/school/[schoolSlug]/students/route.js";
import { GET as getStudentHandler } from "../src/app/api/v1/school/[schoolSlug]/students/[studentId]/route.js";
import { issueInvitation, acceptInvitation } from "../src/lib/invitations.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";

describe("Phase 4: Parent & Student Onboarding and Boundary Enforcement", () => {
  let school: { id: string; slug: string; name: string };
  let adminUser: {
    id: string;
    email: string | null;
    role: "SCHOOL_ADMIN";
    schoolId: string | null;
  };
  let adminToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.invitation.deleteMany({
      where: {
        email: { in: ["parent1@test.edu", "student1@test.edu", "unlinkedparent@test.edu"] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@onboard.edu",
            "parent1@test.edu",
            "student1@test.edu",
            "unlinkedparent@test.edu",
          ],
        },
      },
    });
    await prisma.student.deleteMany({
      where: { admissionNumber: { in: ["ADM_001", "ADM_002", "ADM_UNLINKED"] } },
    });
    await prisma.guardian.deleteMany({
      where: { phone: { in: ["+15550001", "+15550002", "+15559999"] } },
    });
    await prisma.school.deleteMany({
      where: { code: "SCH_ONBOARD" },
    });

    school = await prisma.school.create({
      data: {
        name: "Onboarding Test School",
        code: "SCH_ONBOARD",
        slug: "onboard-test-school",
        isActive: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: "School Principal",
        email: "admin@onboard.edu",
        role: "SCHOOL_ADMIN",
        schoolId: school.id,
      },
    });
    adminUser = {
      id: user.id,
      email: user.email,
      role: "SCHOOL_ADMIN",
      schoolId: user.schoolId,
    };

    adminToken = await createSessionToken({
      userId: adminUser.id,
      schoolId: adminUser.schoolId,
      role: adminUser.role,
      email: adminUser.email,
    });
  });

  it("should enforce pre-requisite: school creates student & guardian records before onboarding", async () => {
    // Admin creates Child 1 with Guardian
    const req1 = new NextRequest(`http://localhost:3000/api/v1/school/${school.slug}/students`, {
      method: "POST",
      body: JSON.stringify({
        name: "Child One",
        admissionNumber: "ADM_001",
        dob: "2015-05-10",
        gender: "FEMALE",
        guardian: {
          name: "Parent One",
          phone: "+15550001",
          email: "parent1@test.edu",
          relationship: "MOTHER",
        },
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
      },
    });

    const res1 = await studentHandler(req1, {
      params: Promise.resolve({ schoolSlug: school.slug }),
    });
    assert.strictEqual(res1.status, 201);
    const body1 = await res1.json();
    assert.strictEqual(body1.data.student.name, "Child One");
    assert.strictEqual(body1.data.student.guardians.length, 1);
    assert.strictEqual(body1.data.student.guardians[0].guardian.phone, "+15550001");
  });

  it("should onboard parent, link guardian, and allow parent to view ONLY their authorized children", async () => {
    // 1. Create Child 1 & Guardian
    const student1 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM_001",
        name: "Child One",
        dob: new Date("2015-05-10"),
        gender: "FEMALE",
      },
    });

    const guardian1 = await prisma.guardian.create({
      data: {
        schoolId: school.id,
        name: "Mother Jane",
        phone: "+15550001",
        email: "parent1@test.edu",
      },
    });

    await prisma.studentGuardian.create({
      data: {
        schoolId: school.id,
        studentId: student1.id,
        guardianId: guardian1.id,
        relationship: "MOTHER",
        isPrimary: true,
      },
    });

    // 2. Create Child 2 belonging to the SAME guardian (multi-child support)
    const student2 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM_002",
        name: "Child Two (Sibling)",
        dob: new Date("2017-08-15"),
        gender: "MALE",
      },
    });

    await prisma.studentGuardian.create({
      data: {
        schoolId: school.id,
        studentId: student2.id,
        guardianId: guardian1.id,
        relationship: "MOTHER",
        isPrimary: true,
      },
    });

    // 3. Create an unlinked student belonging to a DIFFERENT family
    const unlinkedStudent = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM_UNLINKED",
        name: "Stranger Student",
        dob: new Date("2016-01-01"),
        gender: "OTHER",
      },
    });

    // 4. Issue and accept parent invitation
    const parentInvite = await issueInvitation({
      schoolId: school.id,
      email: "parent1@test.edu",
      role: "PARENT",
      guardianId: guardian1.id,
      invitedById: adminUser.id,
    });

    const acceptResult = await acceptInvitation({
      rawToken: parentInvite.rawToken,
      name: "Mother Jane User",
      password: "ParentPassword123!",
    });

    assert.strictEqual(acceptResult.user.role, "PARENT");

    // Verify guardian record now links to the new user ID
    const updatedGuardian = await prisma.guardian.findUnique({
      where: { id: guardian1.id },
    });
    assert.strictEqual(updatedGuardian?.userId, acceptResult.user.id);

    // Create session token for Parent
    const parentToken = await createSessionToken({
      userId: acceptResult.user.id,
      schoolId: school.id,
      role: "PARENT",
      email: "parent1@test.edu",
    });

    // 5. Parent queries their student directory: must see Child 1 & Child 2, but NOT unlinked student
    const listReq = new NextRequest(`http://localhost:3000/api/v1/school/${school.slug}/students`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${parentToken}` },
    });
    const listRes = await listStudentsHandler(listReq, {
      params: Promise.resolve({ schoolSlug: school.slug }),
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    const studentNames = listBody.data.students.map((s: { name: string }) => s.name);
    assert.strictEqual(studentNames.includes("Child One"), true);
    assert.strictEqual(studentNames.includes("Child Two (Sibling)"), true);
    assert.strictEqual(studentNames.includes("Stranger Student"), false);
    assert.strictEqual(listBody.data.students.length, 2);

    // 6. Parent fetches their own child by ID: succeeds (200)
    const ownChildReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${school.slug}/students/${student1.id}`,
      { headers: { Cookie: `${SESSION_COOKIE_NAME}=${parentToken}` } }
    );
    const ownChildRes = await getStudentHandler(ownChildReq, {
      params: Promise.resolve({ schoolSlug: school.slug, studentId: student1.id }),
    });
    assert.strictEqual(ownChildRes.status, 200);

    // 7. Parent attempts to fetch unlinked student by ID: blocked (403 Forbidden)
    const strangerReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${school.slug}/students/${unlinkedStudent.id}`,
      { headers: { Cookie: `${SESSION_COOKIE_NAME}=${parentToken}` } }
    );
    const strangerRes = await getStudentHandler(strangerReq, {
      params: Promise.resolve({ schoolSlug: school.slug, studentId: unlinkedStudent.id }),
    });
    assert.strictEqual(strangerRes.status, 403);
  });

  it("should onboard student, link student record, and prevent access to another student's record", async () => {
    // 1. School creates Student 1 and Student 2
    const student1 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM_001",
        name: "Student Alpha",
        dob: new Date("2010-03-12"),
        gender: "MALE",
      },
    });

    const student2 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM_002",
        name: "Student Beta",
        dob: new Date("2010-07-20"),
        gender: "FEMALE",
      },
    });

    // 2. Issue and accept invitation for Student 1
    const studentInvite = await issueInvitation({
      schoolId: school.id,
      email: "student1@test.edu",
      role: "STUDENT",
      studentId: student1.id,
      invitedById: adminUser.id,
    });

    const acceptResult = await acceptInvitation({
      rawToken: studentInvite.rawToken,
      name: "Student Alpha Account",
      password: "StudentPass123!",
    });

    assert.strictEqual(acceptResult.user.role, "STUDENT");

    // Verify student record links to user
    const updatedStudent1 = await prisma.student.findUnique({
      where: { id: student1.id },
    });
    assert.strictEqual(updatedStudent1?.userId, acceptResult.user.id);

    const studentToken = await createSessionToken({
      userId: acceptResult.user.id,
      schoolId: school.id,
      role: "STUDENT",
      email: "student1@test.edu",
    });

    // 3. Student fetches own record: succeeds (200)
    const ownReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${school.slug}/students/${student1.id}`,
      { headers: { Cookie: `${SESSION_COOKIE_NAME}=${studentToken}` } }
    );
    const ownRes = await getStudentHandler(ownReq, {
      params: Promise.resolve({ schoolSlug: school.slug, studentId: student1.id }),
    });
    assert.strictEqual(ownRes.status, 200);

    // 4. Student attempts to access another student's record: blocked (403 Forbidden)
    const otherReq = new NextRequest(
      `http://localhost:3000/api/v1/school/${school.slug}/students/${student2.id}`,
      { headers: { Cookie: `${SESSION_COOKIE_NAME}=${studentToken}` } }
    );
    const otherRes = await getStudentHandler(otherReq, {
      params: Promise.resolve({ schoolSlug: school.slug, studentId: student2.id }),
    });
    assert.strictEqual(otherRes.status, 403);
  });
});
