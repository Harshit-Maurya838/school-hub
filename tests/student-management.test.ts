import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import {
  POST as createStudentHandler,
  GET as listStudentsHandler,
} from "../src/app/api/v1/school/[schoolSlug]/students/route.js";
import {
  GET as getStudentHandler,
  PATCH as updateStudentHandler,
  DELETE as archiveStudentHandler,
} from "../src/app/api/v1/school/[schoolSlug]/students/[studentId]/route.js";
import { POST as restoreStudentHandler } from "../src/app/api/v1/school/[schoolSlug]/students/[studentId]/restore/route.js";
import { POST as createEnrollmentHandler } from "../src/app/api/v1/school/[schoolSlug]/students/[studentId]/enrollments/route.js";
import { POST as addGuardianHandler } from "../src/app/api/v1/school/[schoolSlug]/students/[studentId]/guardians/route.js";

function createAuthRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
) {
  const headers = new Headers();
  if (options.token) {
    headers.set("Cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
  }
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Module 4: Student Management Administrative MVP Tests", () => {
  // Test Fixture Identifiers
  const SCH_A_CODE = "TEST_SCH_STU_A";
  const SCH_A_SLUG = "test-sch-stu-a";
  const SCH_B_CODE = "TEST_SCH_STU_B";
  const SCH_B_SLUG = "test-sch-stu-b";
  const SCH_NO_YEAR_CODE = "TEST_SCH_STU_NY";
  const SCH_NO_YEAR_SLUG = "test-sch-stu-ny";

  let schoolA: { id: string; slug: string; name: string };
  let schoolB: { id: string; slug: string; name: string };
  let schoolNoYear: { id: string; slug: string; name: string };

  let tokenAdminA: string;
  let tokenTeacherA: string;
  let tokenAdminB: string;
  let tokenAdminNoYear: string;

  let yearA: { id: string; name: string };
  let class1A: { id: string; name: string };
  let class2A: { id: string; name: string };
  let section1A: { id: string; name: string; capacity: number | null };
  let section1B: { id: string; name: string; capacity: number | null };
  let section2A: { id: string; name: string; capacity: number | null };

  let class1B: { id: string; name: string };
  let section1B_schB: { id: string; name: string };

  before(async () => {
    // 0. Clean up any previous test data
    await prisma.enrollment.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.studentGuardian.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.student.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.guardian.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.section.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.class.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.academicYear.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin-a@stu-test.edu",
            "teacher-a@stu-test.edu",
            "admin-b@stu-test.edu",
            "admin-ny@stu-test.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
    });

    // 1. Setup School A (Fully configured)
    schoolA = await prisma.school.create({
      data: {
        name: "Student Test School A",
        code: SCH_A_CODE,
        slug: SCH_A_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    const userAdminA = await prisma.user.create({
      data: {
        name: "Admin Alice",
        email: "admin-a@stu-test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolA.id,
        isActive: true,
      },
    });
    tokenAdminA = await createSessionToken({
      userId: userAdminA.id,
      schoolId: schoolA.id,
      role: "SCHOOL_ADMIN",
      email: userAdminA.email,
    });

    const userTeacherA = await prisma.user.create({
      data: {
        name: "Teacher Tom",
        email: "teacher-a@stu-test.edu",
        role: "TEACHER",
        schoolId: schoolA.id,
        isActive: true,
      },
    });
    tokenTeacherA = await createSessionToken({
      userId: userTeacherA.id,
      schoolId: schoolA.id,
      role: "TEACHER",
      email: userTeacherA.email,
    });

    yearA = await prisma.academicYear.create({
      data: {
        schoolId: schoolA.id,
        name: "2026-2027",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    class1A = await prisma.class.create({
      data: {
        schoolId: schoolA.id,
        name: "Grade 1",
        numericOrder: 1,
      },
    });

    class2A = await prisma.class.create({
      data: {
        schoolId: schoolA.id,
        name: "Grade 2",
        numericOrder: 2,
      },
    });

    // Section 1A with tight capacity of 2 for capacity tests
    section1A = await prisma.section.create({
      data: {
        schoolId: schoolA.id,
        classId: class1A.id,
        name: "Section 1A",
        capacity: 2,
      },
    });

    // Section 1B with unlimited capacity
    section1B = await prisma.section.create({
      data: {
        schoolId: schoolA.id,
        classId: class1A.id,
        name: "Section 1B",
        capacity: null,
      },
    });

    // Section 2A under Class 2
    section2A = await prisma.section.create({
      data: {
        schoolId: schoolA.id,
        classId: class2A.id,
        name: "Section 2A",
        capacity: 30,
      },
    });

    // 2. Setup School B (Foreign school for isolation testing)
    schoolB = await prisma.school.create({
      data: {
        name: "Student Test School B",
        code: SCH_B_CODE,
        slug: SCH_B_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    const userAdminB = await prisma.user.create({
      data: {
        name: "Admin Bob",
        email: "admin-b@stu-test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolB.id,
        isActive: true,
      },
    });
    tokenAdminB = await createSessionToken({
      userId: userAdminB.id,
      schoolId: schoolB.id,
      role: "SCHOOL_ADMIN",
      email: userAdminB.email,
    });

    await prisma.academicYear.create({
      data: {
        schoolId: schoolB.id,
        name: "2026-2027",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    class1B = await prisma.class.create({
      data: {
        schoolId: schoolB.id,
        name: "Grade 1 (School B)",
        numericOrder: 1,
      },
    });

    section1B_schB = await prisma.section.create({
      data: {
        schoolId: schoolB.id,
        classId: class1B.id,
        name: "Section B-1",
        capacity: 25,
      },
    });

    // 3. Setup School with No Academic Year
    schoolNoYear = await prisma.school.create({
      data: {
        name: "School No Academic Year",
        code: SCH_NO_YEAR_CODE,
        slug: SCH_NO_YEAR_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    const userAdminNY = await prisma.user.create({
      data: {
        name: "Admin NoYear",
        email: "admin-ny@stu-test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolNoYear.id,
        isActive: true,
      },
    });
    tokenAdminNoYear = await createSessionToken({
      userId: userAdminNY.id,
      schoolId: schoolNoYear.id,
      role: "SCHOOL_ADMIN",
      email: userAdminNY.email,
    });
  });

  after(async () => {
    // Cleanup fixtures
    await prisma.enrollment.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.studentGuardian.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.student.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.guardian.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.section.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.class.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.academicYear.deleteMany({
      where: {
        school: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin-a@stu-test.edu",
            "teacher-a@stu-test.edu",
            "admin-b@stu-test.edu",
            "admin-ny@stu-test.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCH_A_CODE, SCH_B_CODE, SCH_NO_YEAR_CODE] } },
    });
  });

  // 1. Successful student admission
  it("1. should successfully admit a student with guardians and active enrollment atomically", async () => {
    const req = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Aarav Sharma",
        admissionNumber: "ADM-2026-001",
        dob: "2018-05-15",
        gender: "MALE",
        apaarId: "APAAR-1234-5678",
        guardians: [
          {
            name: "Rajesh Sharma",
            phone: "+919876543210",
            email: "rajesh@example.com",
            relationship: "FATHER",
            isPrimary: true,
          },
          {
            name: "Sunita Sharma",
            phone: "+919876543211",
            relationship: "MOTHER",
            isPrimary: false,
          },
        ],
        enrollment: {
          classId: class1A.id,
          sectionId: section1A.id,
          rollNumber: "101",
        },
      },
    });

    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    const student = json.data.student;

    assert.strictEqual(student.name, "Aarav Sharma");
    assert.strictEqual(student.admissionNumber, "ADM-2026-001");
    assert.strictEqual(student.apaarId, "APAAR-1234-5678");
    assert.strictEqual(student.guardians.length, 2);
    assert.strictEqual(student.guardians[0].isPrimary, true);
    assert.strictEqual(student.enrollments.length, 1);
    assert.strictEqual(student.enrollments[0].rollNumber, "101");
    assert.strictEqual(student.enrollments[0].section.name, "Section 1A");
    assert.strictEqual(student.enrollments[0].academicYear.name, "2026-2027");

    // Database check
    const dbStudent = await prisma.student.findUnique({
      where: { id: student.id },
      include: { enrollments: true, guardians: true },
    });
    assert.ok(dbStudent);
    assert.strictEqual(dbStudent.enrollments.length, 1);
    assert.strictEqual(dbStudent.guardians.length, 2);

    // Verify audit log recorded
    const audit = await prisma.auditLog.findFirst({
      where: { schoolId: schoolA.id, action: "STUDENT_ADMITTED", entityId: student.id },
    });
    assert.ok(audit, "Audit log for STUDENT_ADMITTED must exist");
  });

  // 2. Required-field validation
  it("2. should reject student admission on invalid or missing required fields", async () => {
    // A. Name too short (< 2 characters)
    const req1 = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "A",
        admissionNumber: "ADM-FAIL-1",
        dob: "2018-05-15",
        gender: "MALE",
      },
    });
    const res1 = await createStudentHandler(req1, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res1.status, 422);

    // B. Missing admissionNumber
    const req2 = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Valid Name",
        admissionNumber: "",
        dob: "2018-05-15",
        gender: "MALE",
      },
    });
    const res2 = await createStudentHandler(req2, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res2.status, 422);

    // C. Invalid Date of Birth
    const req3 = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Valid Name",
        admissionNumber: "ADM-FAIL-3",
        dob: "not-a-valid-date",
        gender: "MALE",
      },
    });
    const res3 = await createStudentHandler(req3, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res3.status, 422);

    // D. Invalid Gender
    const req4 = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Valid Name",
        admissionNumber: "ADM-FAIL-4",
        dob: "2018-05-15",
        gender: "INVALID_GENDER",
      },
    });
    const res4 = await createStudentHandler(req4, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res4.status, 422);
  });

  // 3. Duplicate student identifiers under intended uniqueness rule
  it("3. should enforce uniqueness of admissionNumber per school, but allow same ID across different schools", async () => {
    const duplicateId = "ADM-SHARED-999";

    // First admission in School A succeeds
    const reqA1 = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          name: "School A Student",
          admissionNumber: duplicateId,
          dob: "2018-01-01",
          gender: "FEMALE",
        },
      }
    );
    const resA1 = await createStudentHandler(reqA1, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resA1.status, 201);

    // Second admission with SAME identifier in School A must fail with 409 Conflict
    const reqA2 = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          name: "School A Student Duplicate",
          admissionNumber: duplicateId,
          dob: "2018-02-02",
          gender: "MALE",
        },
      }
    );
    const resA2 = await createStudentHandler(reqA2, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resA2.status, 409);
    const bodyA2 = await resA2.json();
    assert.strictEqual(bodyA2.error.code, "DUPLICATE_ADMISSION_NUMBER");

    // Admission with SAME identifier in School B must succeed (per-school tenant isolation)
    const reqB = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolB.slug}/students`, {
      method: "POST",
      token: tokenAdminB,
      body: {
        name: "School B Student",
        admissionNumber: duplicateId,
        dob: "2018-03-03",
        gender: "OTHER",
      },
    });
    const resB = await createStudentHandler(reqB, {
      params: Promise.resolve({ schoolSlug: schoolB.slug }),
    });
    assert.strictEqual(resB.status, 201);
  });

  // 4. Duplicate enrollment prevention
  it("4. should prevent duplicate enrollment of the same student in the same academic year", async () => {
    // Admit student enrolled into Section 1B
    const req = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Student Single Enrollment",
        admissionNumber: "ADM-DUP-ENROLL",
        dob: "2018-06-01",
        gender: "MALE",
        enrollment: {
          classId: class1A.id,
          sectionId: section1B.id,
        },
      },
    });
    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res.status, 201);
    const student = (await res.json()).data.student;

    // Attempt second enrollment for the SAME student in the SAME academic year
    const reqEnrollAgain = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students/${student.id}/enrollments`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          classId: class1A.id,
          sectionId: section1B.id,
          academicYearId: yearA.id,
        },
      }
    );
    const resEnrollAgain = await createEnrollmentHandler(reqEnrollAgain, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, studentId: student.id }),
    });
    assert.strictEqual(resEnrollAgain.status, 409);
    const jsonAgain = await resEnrollAgain.json();
    assert.strictEqual(jsonAgain.error.code, "DUPLICATE_ENROLLMENT");
  });

  // 5. Rejection when no current academic year exists
  it("5. should reject student admission and enrollment when no current academic year exists", async () => {
    // School with no academic session configured
    const req = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolNoYear.slug}/students`,
      {
        method: "POST",
        token: tokenAdminNoYear,
        body: {
          name: "Student No Year",
          admissionNumber: "ADM-NO-YEAR",
          dob: "2018-07-01",
          gender: "FEMALE",
          enrollment: {
            classId: "dummy-class",
            sectionId: "dummy-section",
          },
        },
      }
    );
    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolNoYear.slug }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "SETUP_PREREQUISITE_REQUIRED");
    assert.match(body.error.message, /current academic year is required/i);
  });

  // 6. Rejection of a class from another school
  it("6. should reject cross-tenant class assignment when class belongs to another school", async () => {
    const req = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Cross Class Student",
        admissionNumber: "ADM-CROSS-CLASS",
        dob: "2018-08-01",
        gender: "MALE",
        enrollment: {
          classId: class1B.id, // Class belonging to School B!
          sectionId: section1A.id,
        },
      },
    });
    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "SETUP_PREREQUISITE_REQUIRED");
    assert.match(body.error.message, /cross-tenant class assignment rejected/i);
  });

  // 7. Rejection of a section from another school
  it("7. should reject cross-tenant section assignment when section belongs to another school", async () => {
    const req = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Cross Section Student",
        admissionNumber: "ADM-CROSS-SECTION",
        dob: "2018-09-01",
        gender: "FEMALE",
        enrollment: {
          classId: class1A.id,
          sectionId: section1B_schB.id, // Section belonging to School B!
        },
      },
    });
    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "SETUP_PREREQUISITE_REQUIRED");
    assert.match(body.error.message, /cross-tenant section assignment rejected/i);
  });

  // 8. Rejection when section does not belong to the selected class
  it("8. should reject when section does not belong to the selected class", async () => {
    // Pass class1A (Grade 1), but section2A (which belongs to Grade 2!)
    const req = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Mismatch Student",
        admissionNumber: "ADM-MISMATCH-SEC",
        dob: "2018-10-01",
        gender: "MALE",
        enrollment: {
          classId: class1A.id,
          sectionId: section2A.id,
        },
      },
    });
    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "SETUP_PREREQUISITE_REQUIRED");
    assert.match(body.error.message, /does not belong to class/i);
  });

  // 9. Guardian linking and relationship validation
  it("9. should support multiple guardians and deduplicate guardian records by phone per school", async () => {
    const sharedPhone = "+919999900001";

    // 1. Admit Student 1 with Guardian having sharedPhone
    const req1 = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Sibling One",
        admissionNumber: "ADM-SIB-1",
        dob: "2017-01-01",
        gender: "FEMALE",
        guardians: [
          {
            name: "Vikas Verma",
            phone: sharedPhone,
            relationship: "FATHER",
            isPrimary: true,
          },
        ],
      },
    });
    const res1 = await createStudentHandler(req1, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res1.status, 201);
    const stu1 = (await res1.json()).data.student;
    const guardianId = stu1.guardians[0].guardian.id;

    // 2. Admit Student 2 (Sibling) in the same school with the same guardian phone
    const req2 = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Sibling Two",
        admissionNumber: "ADM-SIB-2",
        dob: "2019-02-02",
        gender: "MALE",
        guardians: [
          {
            name: "Vikas Verma",
            phone: sharedPhone,
            relationship: "FATHER",
            isPrimary: true,
          },
        ],
      },
    });
    const res2 = await createStudentHandler(req2, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res2.status, 201);
    const stu2 = (await res2.json()).data.student;

    // Both students must be linked to the EXACT same Guardian entity!
    assert.strictEqual(stu2.guardians[0].guardian.id, guardianId);

    // Verify in database: exactly ONE guardian record exists with sharedPhone
    const guardianCount = await prisma.guardian.count({
      where: { schoolId: schoolA.id, phone: sharedPhone },
    });
    assert.strictEqual(
      guardianCount,
      1,
      "Must not create duplicate Guardian records for same phone"
    );

    // 3. Link an additional guardian to stu1 using addGuardianHandler
    const reqAddGuardian = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students/${stu1.id}/guardians`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          name: "Anita Verma",
          phone: "+919999900002",
          relationship: "MOTHER",
          isPrimary: false,
        },
      }
    );
    const resAddGuardian = await addGuardianHandler(reqAddGuardian, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, studentId: stu1.id }),
    });
    assert.strictEqual(resAddGuardian.status, 201);
  });

  // 10. Atomic creation of student, guardian links, and enrollment
  it("10. should ensure atomic rollback if enrollment fails during admission", async () => {
    // Provide an invalid section ID that will fail during transaction
    const doomedAdmissionNumber = "ADM-DOOMED-ATOMIC";
    const req = createAuthRequest(`http://localhost:3000/api/v1/school/${schoolA.slug}/students`, {
      method: "POST",
      token: tokenAdminA,
      body: {
        name: "Doomed Student",
        admissionNumber: doomedAdmissionNumber,
        dob: "2018-11-11",
        gender: "MALE",
        guardians: [
          {
            name: "Parent Doomed",
            phone: "+919876599999",
            relationship: "FATHER",
          },
        ],
        enrollment: {
          classId: class1A.id,
          sectionId: "non-existent-section-id",
        },
      },
    });

    const res = await createStudentHandler(req, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.ok(res.status >= 400);

    // Verify database: Student must NOT exist
    const orphanStudent = await prisma.student.findUnique({
      where: {
        schoolId_admissionNumber: {
          schoolId: schoolA.id,
          admissionNumber: doomedAdmissionNumber,
        },
      },
    });
    assert.strictEqual(orphanStudent, null, "Atomic transaction must roll back student creation");
  });

  // 11. Concurrent enrollment and capacity enforcement
  it("11. should strictly enforce section capacity limits", async () => {
    // section1A has capacity = 2. Student Aarav Sharma (test 1) already occupies 1 seat.
    // 1. Admit second student into Section 1A (seat 2/2) -> Should succeed
    const reqSeat2 = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          name: "Seat Two Student",
          admissionNumber: "ADM-CAP-SEAT-2",
          dob: "2018-05-10",
          gender: "FEMALE",
          enrollment: {
            classId: class1A.id,
            sectionId: section1A.id,
          },
        },
      }
    );
    const resSeat2 = await createStudentHandler(reqSeat2, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resSeat2.status, 201);

    // 2. Admit third student into Section 1A (seat 3/2) -> Must be rejected with 409 SECTION_CAPACITY_EXCEEDED
    const reqSeat3 = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          name: "Seat Three Overfill",
          admissionNumber: "ADM-CAP-SEAT-3",
          dob: "2018-05-12",
          gender: "MALE",
          enrollment: {
            classId: class1A.id,
            sectionId: section1A.id,
          },
        },
      }
    );
    const resSeat3 = await createStudentHandler(reqSeat3, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resSeat3.status, 409);
    const bodySeat3 = await resSeat3.json();
    assert.strictEqual(bodySeat3.error.code, "SECTION_CAPACITY_EXCEEDED");
    assert.match(bodySeat3.error.message, /maximum capacity of 2/i);
  });

  // 12. Unauthorized access and cross-tenant isolation
  it("12. should reject unauthorized roles and cross-tenant student access", async () => {
    // A. Teacher cannot perform admissions (only SCHOOL_ADMIN / SUPER_ADMIN)
    const reqTeacher = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "POST",
        token: tokenTeacherA,
        body: {
          name: "Teacher Created Student",
          admissionNumber: "ADM-TEACH-FAIL",
          dob: "2018-01-01",
          gender: "FEMALE",
        },
      }
    );
    const resTeacher = await createStudentHandler(reqTeacher, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resTeacher.status, 403);

    // B. Admin B (School B) cannot view or update School A's student directory
    const reqCrossList = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "GET",
        token: tokenAdminB,
      }
    );
    const resCrossList = await listStudentsHandler(reqCrossList, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resCrossList.status, 403);

    // C. Admin B cannot fetch School A's student profile by ID
    const studentA = await prisma.student.findFirst({
      where: { schoolId: schoolA.id },
    });
    assert.ok(studentA);

    const reqCrossDetail = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolB.slug}/students/${studentA.id}`,
      {
        method: "GET",
        token: tokenAdminB,
      }
    );
    const resCrossDetail = await getStudentHandler(reqCrossDetail, {
      params: Promise.resolve({ schoolSlug: schoolB.slug, studentId: studentA.id }),
    });
    assert.strictEqual(resCrossDetail.status, 404);
  });

  // 13. Safe archival and preservation of historical records
  it("13. should safely archive student without destroying historical enrollment records and allow restoration", async () => {
    // Admit student with enrollment
    const reqCreate = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students`,
      {
        method: "POST",
        token: tokenAdminA,
        body: {
          name: "Archive Test Student",
          admissionNumber: "ADM-ARCHIVE-01",
          dob: "2018-03-15",
          gender: "MALE",
          enrollment: {
            classId: class1A.id,
            sectionId: section1B.id,
          },
        },
      }
    );
    const resCreate = await createStudentHandler(reqCreate, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resCreate.status, 201);
    const student = (await resCreate.json()).data.student;

    // 1. Archive student via DELETE
    const reqArchive = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students/${student.id}`,
      {
        method: "DELETE",
        token: tokenAdminA,
        body: { reason: "Family relocated" },
      }
    );
    const resArchive = await archiveStudentHandler(reqArchive, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, studentId: student.id }),
    });
    assert.strictEqual(resArchive.status, 200);

    // Database verification: Student is soft-deleted, historical enrollment is preserved!
    const dbStudentArchived = await prisma.student.findUnique({
      where: { id: student.id },
      include: { enrollments: true },
    });
    assert.ok(dbStudentArchived);
    assert.strictEqual(dbStudentArchived.isActive, false);
    assert.ok(dbStudentArchived.deletedAt !== null);
    assert.strictEqual(
      dbStudentArchived.enrollments.length,
      1,
      "Historical enrollment record must NOT be deleted upon archival"
    );

    // 2. Restore student via restore route
    const reqRestore = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students/${student.id}/restore`,
      {
        method: "POST",
        token: tokenAdminA,
      }
    );
    const resRestore = await restoreStudentHandler(reqRestore, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, studentId: student.id }),
    });
    assert.strictEqual(resRestore.status, 200);

    const dbStudentRestored = await prisma.student.findUnique({
      where: { id: student.id },
    });
    assert.ok(dbStudentRestored);
    assert.strictEqual(dbStudentRestored.isActive, true);
    assert.strictEqual(dbStudentRestored.deletedAt, null);
  });

  // 14. Pagination, search, and filtering
  it("14. should support database-level search, filtering by class/section/status, and pagination", async () => {
    // 1. Search by name
    const reqSearchName = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students?search=Aarav`,
      {
        method: "GET",
        token: tokenAdminA,
      }
    );
    const resSearchName = await listStudentsHandler(reqSearchName, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resSearchName.status, 200);
    const jsonSearchName = await resSearchName.json();
    assert.ok(jsonSearchName.data.students.length > 0);
    assert.ok(
      jsonSearchName.data.students.every((s: { name: string }) =>
        s.name.toLowerCase().includes("aarav")
      )
    );

    // 2. Search by admission number
    const reqSearchId = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students?search=ADM-2026-001`,
      {
        method: "GET",
        token: tokenAdminA,
      }
    );
    const resSearchId = await listStudentsHandler(reqSearchId, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resSearchId.status, 200);
    const jsonSearchId = await resSearchId.json();
    assert.strictEqual(jsonSearchId.data.students.length, 1);
    assert.strictEqual(jsonSearchId.data.students[0].admissionNumber, "ADM-2026-001");

    // 3. Filter by Class
    const reqFilterClass = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students?classId=${class1A.id}`,
      {
        method: "GET",
        token: tokenAdminA,
      }
    );
    const resFilterClass = await listStudentsHandler(reqFilterClass, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resFilterClass.status, 200);
    const jsonFilterClass = await resFilterClass.json();
    assert.ok(jsonFilterClass.data.students.length > 0);

    // 4. Pagination
    const reqPage = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students?page=1&limit=2`,
      {
        method: "GET",
        token: tokenAdminA,
      }
    );
    const resPage = await listStudentsHandler(reqPage, {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(resPage.status, 200);
    const jsonPage = await resPage.json();
    assert.strictEqual(jsonPage.data.pagination.page, 1);
    assert.strictEqual(jsonPage.data.pagination.limit, 2);
    assert.ok(jsonPage.data.pagination.total >= 2);
    assert.strictEqual(jsonPage.data.students.length, 2);
  });

  // 15. Student profile editing
  it("15. should allow administrator to update permitted student profile details", async () => {
    const student = await prisma.student.findFirst({
      where: { schoolId: schoolA.id, admissionNumber: "ADM-2026-001" },
    });
    assert.ok(student);

    const reqUpdate = createAuthRequest(
      `http://localhost:3000/api/v1/school/${schoolA.slug}/students/${student.id}`,
      {
        method: "PATCH",
        token: tokenAdminA,
        body: {
          name: "Aarav S. Sharma",
          gender: "MALE",
          apaarId: "APAAR-UPDATED-9999",
        },
      }
    );
    const resUpdate = await updateStudentHandler(reqUpdate, {
      params: Promise.resolve({ schoolSlug: schoolA.slug, studentId: student.id }),
    });
    assert.strictEqual(resUpdate.status, 200);
    const updated = (await resUpdate.json()).data.student;
    assert.strictEqual(updated.name, "Aarav S. Sharma");
    assert.strictEqual(updated.apaarId, "APAAR-UPDATED-9999");
  });
});
