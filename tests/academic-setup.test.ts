import { describe, it } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { POST as createYearHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/years/route.js";
import { DELETE as deleteYearHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/years/[yearId]/route.js";
import { POST as setCurrentYearHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/years/[yearId]/set-current/route.js";
import {
  POST as createClassHandler,
  GET as listClassesHandler,
} from "../src/app/api/v1/school/[schoolSlug]/academics/classes/route.js";
import {
  PATCH as updateClassHandler,
  DELETE as deleteClassHandler,
} from "../src/app/api/v1/school/[schoolSlug]/academics/classes/[classId]/route.js";
import { POST as createSectionHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/sections/route.js";
import { DELETE as deleteSectionHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/sections/[sectionId]/route.js";
import { POST as createSubjectHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/subjects/route.js";
import {
  PATCH as updateSubjectHandler,
  DELETE as deleteSubjectHandler,
} from "../src/app/api/v1/school/[schoolSlug]/academics/subjects/[subjectId]/route.js";
import { GET as overviewHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/overview/route.js";

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

describe("Academic Setup Module: End-to-End & Security Tests", () => {
  // Test schools and users
  let schoolA: { id: string; slug: string; name: string };
  let schoolB: { id: string; slug: string; name: string };
  let adminA: { id: string; schoolId: string | null };
  let adminB: { id: string; schoolId: string | null };
  let teacherA: { id: string; schoolId: string | null };
  let superAdmin: { id: string };

  let tokenAdminA: string;
  let tokenAdminB: string;
  let tokenTeacherA: string;
  let tokenSuperAdmin: string;

  it("should setup isolated test tenant schools and credentials", async () => {
    // Clean up past test fixtures if present
    await prisma.enrollment.deleteMany({
      where: { school: { code: { in: ["ACAD_TEST_A", "ACAD_TEST_B"] } } },
    });
    await prisma.subject.deleteMany({
      where: { school: { code: { in: ["ACAD_TEST_A", "ACAD_TEST_B"] } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: ["ACAD_TEST_A", "ACAD_TEST_B"] } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: ["ACAD_TEST_A", "ACAD_TEST_B"] } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: ["ACAD_TEST_A", "ACAD_TEST_B"] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "adminA_acad@test.edu",
            "adminB_acad@test.edu",
            "teacherA_acad@test.edu",
            "super_acad@test.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: ["ACAD_TEST_A", "ACAD_TEST_B"] } },
    });

    // Create Schools
    schoolA = await prisma.school.create({
      data: {
        name: "Academic Academy Alpha",
        code: "ACAD_TEST_A",
        slug: "acad-academy-alpha",
        isActive: true,
      },
    });

    schoolB = await prisma.school.create({
      data: {
        name: "Academic Academy Beta",
        code: "ACAD_TEST_B",
        slug: "acad-academy-beta",
        isActive: true,
      },
    });

    // Create Users
    adminA = await prisma.user.create({
      data: {
        name: "Admin Alpha",
        email: "adminA_acad@test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolA.id,
      },
    });

    adminB = await prisma.user.create({
      data: {
        name: "Admin Beta",
        email: "adminB_acad@test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolB.id,
      },
    });

    teacherA = await prisma.user.create({
      data: {
        name: "Teacher Alpha",
        email: "teacherA_acad@test.edu",
        role: "TEACHER",
        schoolId: schoolA.id,
      },
    });

    superAdmin = await prisma.user.create({
      data: {
        name: "Platform Super Admin",
        email: "super_acad@test.edu",
        role: "SUPER_ADMIN",
        schoolId: null,
      },
    });

    tokenAdminA = await createSessionToken({
      userId: adminA.id,
      schoolId: schoolA.id,
      role: "SCHOOL_ADMIN",
      email: "adminA_acad@test.edu",
    });

    tokenAdminB = await createSessionToken({
      userId: adminB.id,
      schoolId: schoolB.id,
      role: "SCHOOL_ADMIN",
      email: "adminB_acad@test.edu",
    });

    tokenTeacherA = await createSessionToken({
      userId: teacherA.id,
      schoolId: schoolA.id,
      role: "TEACHER",
      email: "teacherA_acad@test.edu",
    });

    tokenSuperAdmin = await createSessionToken({
      userId: superAdmin.id,
      schoolId: null,
      role: "SUPER_ADMIN",
      email: "super_acad@test.edu",
    });

    assert.ok(tokenAdminA);
    assert.ok(tokenAdminB);
  });

  // ==========================================================================
  // Phase B: Academic Year Tests
  // ==========================================================================
  describe("Phase B: Academic Year Management", () => {
    let year1Id: string;
    let year2Id: string;

    it("should validate and reject academic year with invalid dates (endDate <= startDate)", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "2026-2027",
            startDate: "2026-12-31T00:00:00.000Z",
            endDate: "2026-01-01T00:00:00.000Z", // Invalid: endDate before startDate
            isCurrent: true,
          },
        }
      );

      const res = await createYearHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 422, "Should return 422 validation error for inverted dates");
    });

    it("should create valid academic year with isCurrent = true", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "2026-2027",
            startDate: "2026-06-01T00:00:00.000Z",
            endDate: "2027-05-31T00:00:00.000Z",
            isCurrent: true,
          },
        }
      );

      const res = await createYearHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.academicYear.name, "2026-2027");
      assert.strictEqual(json.data.academicYear.isCurrent, true);
      assert.strictEqual(json.data.academicYear.schoolId, schoolA.id);
      year1Id = json.data.academicYear.id;
    });

    it("should reject duplicate academic year name within the same school", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "2026-2027", // Duplicate name
            startDate: "2026-07-01T00:00:00.000Z",
            endDate: "2027-06-30T00:00:00.000Z",
          },
        }
      );

      const res = await createYearHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(
        res.status,
        409,
        "Must return 409 Conflict for duplicate academic year name"
      );
    });

    it("should allow same academic year name in a different school (tenant isolation)", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolB.slug}/academics/years`,
        {
          method: "POST",
          token: tokenAdminB,
          body: {
            name: "2026-2027", // Same name as School A, but for School B
            startDate: "2026-06-01T00:00:00.000Z",
            endDate: "2027-05-31T00:00:00.000Z",
            isCurrent: true,
          },
        }
      );

      const res = await createYearHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolB.slug }),
      });
      assert.strictEqual(
        res.status,
        201,
        "Different school should be able to create year with same name"
      );
    });

    it("should create a second academic year and atomically switch current year", async () => {
      // Create second year without isCurrent
      const createReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "2027-2028",
            startDate: "2027-06-01T00:00:00.000Z",
            endDate: "2028-05-31T00:00:00.000Z",
            isCurrent: false,
          },
        }
      );

      const createRes = await createYearHandler(createReq, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(createRes.status, 201);
      const createJson = await createRes.json();
      year2Id = createJson.data.academicYear.id;
      assert.strictEqual(createJson.data.academicYear.isCurrent, false);

      // Now atomically switch current year to year2
      const setReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years/${year2Id}/set-current`,
        {
          method: "POST",
          token: tokenAdminA,
        }
      );
      const setRes = await setCurrentYearHandler(setReq, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, yearId: year2Id }),
      });
      assert.strictEqual(setRes.status, 200);

      // Verify that year2 is current and year1 is NOT current
      const dbYear1 = await prisma.academicYear.findUnique({ where: { id: year1Id } });
      const dbYear2 = await prisma.academicYear.findUnique({ where: { id: year2Id } });

      assert.strictEqual(dbYear1?.isCurrent, false, "Year 1 must no longer be current");
      assert.strictEqual(dbYear2?.isCurrent, true, "Year 2 must now be current");

      // Verify at the database level that exactly ONE current year exists for School A
      const currentCount = await prisma.academicYear.count({
        where: { schoolId: schoolA.id, isCurrent: true },
      });
      assert.strictEqual(currentCount, 1, "Exactly one current year must exist per school");
    });

    it("should enforce database constraint preventing concurrent duplicate current years", async () => {
      // Attempt to directly set multiple current years in raw prisma to test the database partial unique index
      await assert.rejects(
        async () => {
          await prisma.academicYear.update({
            where: { id: year1Id },
            data: { isCurrent: true }, // year2Id is already isCurrent: true
          });
        },
        /Unique constraint failed|academic_years_schoolId_isCurrent_key/i,
        "Database partial unique index must block concurrent/multiple isCurrent=true in same school"
      );
    });

    it("should prevent deletion of currently active academic year", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years/${year2Id}`,
        {
          method: "DELETE",
          token: tokenAdminA,
        }
      );
      const res = await deleteYearHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, yearId: year2Id }),
      });
      assert.strictEqual(res.status, 409, "Active academic year deletion must be blocked");
    });

    it("should safely allow deletion of inactive academic year without enrollments", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/years/${year1Id}`,
        {
          method: "DELETE",
          token: tokenAdminA,
        }
      );
      const res = await deleteYearHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, yearId: year1Id }),
      });
      assert.strictEqual(res.status, 200);

      const deleted = await prisma.academicYear.findUnique({ where: { id: year1Id } });
      assert.strictEqual(deleted, null);
    });
  });

  // ==========================================================================
  // Phase C: Class Management Tests
  // ==========================================================================
  describe("Phase C: Class Management", () => {
    let class1Id: string;
    let class2Id: string;

    it("should create classes supporting standard naming (Nursery, LKG, Class 10)", async () => {
      // Class 1: Nursery
      const req1 = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Nursery",
            numericOrder: 0,
          },
        }
      );
      const res1 = await createClassHandler(req1, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res1.status, 201);
      const json1 = await res1.json();
      assert.strictEqual(json1.data.class.name, "Nursery");
      assert.strictEqual(json1.data.class.numericOrder, 0);
      class1Id = json1.data.class.id;

      // Class 2: Class 10
      const req2 = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Class 10",
            numericOrder: 10,
          },
        }
      );
      const res2 = await createClassHandler(req2, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res2.status, 201);
      const json2 = await res2.json();
      assert.strictEqual(json2.data.class.name, "Class 10");
      class2Id = json2.data.class.id;
      assert.ok(class2Id);
    });

    it("should prevent duplicate class names within the same school", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Nursery", // Duplicate in School A
            numericOrder: 1,
          },
        }
      );
      const res = await createClassHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 409, "Must return 409 Conflict for duplicate class name");
    });

    it("should list and search classes by query", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes?search=Nurs`,
        {
          token: tokenAdminA,
        }
      );
      const res = await listClassesHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.classes.length, 1);
      assert.strictEqual(json.data.classes[0].name, "Nursery");
    });

    it("should update class name and numeric order", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes/${class1Id}`,
        {
          method: "PATCH",
          token: tokenAdminA,
          body: {
            name: "Pre-Nursery",
            numericOrder: -1, // Updated order
          },
        }
      );
      const res = await updateClassHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, classId: class1Id }),
      });
      // Pre-Nursery with -1 should fail numericOrder min: 0
      assert.strictEqual(res.status, 422, "Negative order must fail validation");

      const reqValid = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes/${class1Id}`,
        {
          method: "PATCH",
          token: tokenAdminA,
          body: {
            name: "Pre-Nursery",
            numericOrder: 0,
          },
        }
      );
      const resValid = await updateClassHandler(reqValid, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, classId: class1Id }),
      });
      assert.strictEqual(resValid.status, 200);
      const json = await resValid.json();
      assert.strictEqual(json.data.class.name, "Pre-Nursery");
    });
  });

  // ==========================================================================
  // Phase D: Section Management Tests
  // ==========================================================================
  describe("Phase D: Section Management", () => {
    let testClassId: string;
    let section1Id: string;

    it("should create a section under a valid class with capacity", async () => {
      const testClass = await prisma.class.findFirstOrThrow({
        where: { schoolId: schoolA.id },
      });
      testClassId = testClass.id;

      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            classId: testClassId,
            name: "Section A",
            capacity: 40,
          },
        }
      );
      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.section.name, "Section A");
      assert.strictEqual(json.data.section.capacity, 40);
      section1Id = json.data.section.id;
    });

    it("should reject capacity when provided as <= 0", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            classId: testClassId,
            name: "Section B",
            capacity: 0, // Invalid: must be positive
          },
        }
      );
      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 422, "Non-positive capacity must fail validation");
    });

    it("should reject duplicate section name within the same class", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            classId: testClassId,
            name: "Section A", // Duplicate in testClass
            capacity: 35,
          },
        }
      );
      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(
        res.status,
        409,
        "Must return 409 Conflict for duplicate section in same class"
      );
    });

    it("should block section creation pointing to a class of another school (Cross-School Class Reference)", async () => {
      // Create a class in School B
      const classB = await prisma.class.create({
        data: {
          name: "School B Standard",
          schoolId: schoolB.id,
        },
      });

      // Admin A attempts to create section under School B's class
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            classId: classB.id, // Foreign class!
            name: "Malicious Section",
          },
        }
      );
      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(
        res.status,
        400,
        "Must reject foreign class references that belong to another tenant"
      );
    });

    it("should prevent unsafe deletion of a class that has existing sections", async () => {
      // testClass has section1Id
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes/${testClassId}`,
        {
          method: "DELETE",
          token: tokenAdminA,
        }
      );
      const res = await deleteClassHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, classId: testClassId }),
      });
      assert.strictEqual(
        res.status,
        409,
        "Cannot delete class with existing sections: safe deletion protection"
      );
    });

    it("should safely delete an empty section", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/sections/${section1Id}`,
        {
          method: "DELETE",
          token: tokenAdminA,
        }
      );
      const res = await deleteSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, sectionId: section1Id }),
      });
      assert.strictEqual(res.status, 200);

      const deleted = await prisma.section.findUnique({ where: { id: section1Id } });
      assert.strictEqual(deleted, null);
    });
  });

  // ==========================================================================
  // Phase E: Subject Management Tests
  // ==========================================================================
  describe("Phase E: Subject Management", () => {
    let testClassId: string;
    let schoolWideSubId: string;
    let classSubId: string;

    it("should create school-wide subject (classId = null)", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Physical Education",
            code: "PE101",
            classId: null,
          },
        }
      );
      const res = await createSubjectHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.subject.name, "Physical Education");
      assert.strictEqual(json.data.subject.classId, null);
      assert.strictEqual(json.data.subject.code, "PE101");
      schoolWideSubId = json.data.subject.id;
    });

    it("should create class-specific subject (classId provided)", async () => {
      const testClass = await prisma.class.findFirstOrThrow({
        where: { schoolId: schoolA.id },
      });
      testClassId = testClass.id;

      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Advanced Physics",
            code: "PHY401",
            classId: testClassId,
          },
        }
      );
      const res = await createSubjectHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.subject.name, "Advanced Physics");
      assert.strictEqual(json.data.subject.classId, testClassId);
      classSubId = json.data.subject.id;
      assert.ok(classSubId);
    });

    it("should reject duplicate subject name within the same scope", async () => {
      // Duplicate school-wide
      const req1 = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Physical Education",
            classId: null,
          },
        }
      );
      const res1 = await createSubjectHandler(req1, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res1.status, 409, "Duplicate school-wide subject name must fail with 409");

      // Duplicate class-specific
      const req2 = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Advanced Physics",
            classId: testClassId,
          },
        }
      );
      const res2 = await createSubjectHandler(req2, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(
        res2.status,
        409,
        "Duplicate class-specific subject name must fail with 409"
      );
    });

    it("should reject subject referencing a class belonging to another school", async () => {
      const classB = await prisma.class.findFirstOrThrow({
        where: { schoolId: schoolB.id },
      });

      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenAdminA,
          body: {
            name: "Unauthorized Subject",
            classId: classB.id, // Class of School B!
          },
        }
      );
      const res = await createSubjectHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(
        res.status,
        400,
        "Cannot associate subject with a class belonging to another school"
      );
    });

    it("should safely update and delete subjects", async () => {
      const updateReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects/${schoolWideSubId}`,
        {
          method: "PATCH",
          token: tokenAdminA,
          body: {
            name: "Health & Physical Education",
            code: "HPE101",
          },
        }
      );
      const updateRes = await updateSubjectHandler(updateReq, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, subjectId: schoolWideSubId }),
      });
      assert.strictEqual(updateRes.status, 200);

      const deleteReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/subjects/${schoolWideSubId}`,
        {
          method: "DELETE",
          token: tokenAdminA,
        }
      );
      const deleteRes = await deleteSubjectHandler(deleteReq, {
        params: Promise.resolve({ schoolSlug: schoolA.slug, subjectId: schoolWideSubId }),
      });
      assert.strictEqual(deleteRes.status, 200);
    });
  });

  // ==========================================================================
  // Authorization & Multi-Tenant Boundaries
  // ==========================================================================
  describe("Authorization & Multi-Tenant Boundary Enforcement", () => {
    it("should reject unauthenticated requests with 401 Unauthorized", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`
      );
      const res = await listClassesHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 401, "Unauthenticated request must yield 401");
    });

    it("should prevent TEACHER role from modifying academic configuration", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenTeacherA,
          body: {
            name: "Teacher Created Class",
          },
        }
      );
      const res = await createClassHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 403, "TEACHER role must be denied academic mutations");
    });

    it("should prevent SUPER_ADMIN from mutating tenant-scoped academic endpoints directly", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenSuperAdmin,
          body: {
            name: "Super Admin Class",
          },
        }
      );
      const res = await createClassHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(
        res.status,
        403,
        "SUPER_ADMIN must not accidentally mutate tenant academic config through tenant endpoint"
      );
    });

    it("should prevent cross-school access: Admin of School B cannot access or mutate School A", async () => {
      // School B admin attempting to list School A's classes
      const readReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          token: tokenAdminB,
        }
      );
      const readRes = await listClassesHandler(readReq, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(readRes.status, 403, "Cross-school read must be denied with 403");

      // School B admin attempting to create a class in School A
      const writeReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenAdminB,
          body: {
            name: "Infiltrator Class",
          },
        }
      );
      const writeRes = await createClassHandler(writeReq, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(writeRes.status, 403, "Cross-school mutation must be denied with 403");
    });

    it("should return academic overview with stats and current year", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${schoolA.slug}/academics/overview`,
        {
          token: tokenAdminA,
        }
      );
      const res = await overviewHandler(req, {
        params: Promise.resolve({ schoolSlug: schoolA.slug }),
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.stats);
      assert.strictEqual(typeof json.data.stats.classesCount, "number");
      assert.strictEqual(typeof json.data.stats.yearsCount, "number");
    });
  });

  // Cleanup after tests
  it("should clean up test data", async () => {
    await prisma.subject.deleteMany({
      where: { schoolId: { in: [schoolA.id, schoolB.id] } },
    });
    await prisma.section.deleteMany({
      where: { schoolId: { in: [schoolA.id, schoolB.id] } },
    });
    await prisma.class.deleteMany({
      where: { schoolId: { in: [schoolA.id, schoolB.id] } },
    });
    await prisma.academicYear.deleteMany({
      where: { schoolId: { in: [schoolA.id, schoolB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminA.id, adminB.id, teacherA.id, superAdmin.id] } },
    });
    await prisma.school.deleteMany({
      where: { id: { in: [schoolA.id, schoolB.id] } },
    });
  });
});
