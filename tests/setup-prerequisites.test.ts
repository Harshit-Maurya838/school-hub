import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { POST as createYearHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/years/route.js";
import { POST as setCurrentYearHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/years/[yearId]/set-current/route.js";
import {
  POST as createClassHandler,
  GET as listClassesHandler,
} from "../src/app/api/v1/school/[schoolSlug]/academics/classes/route.js";
import { POST as createSectionHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/sections/route.js";
import { POST as createSubjectHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/subjects/route.js";
import { PATCH as updateProfileHandler } from "../src/app/api/v1/school/[schoolSlug]/profile/route.js";
import {
  getAcademicSetupReadiness,
  getSchoolDetailsReadiness,
} from "../src/lib/school-readiness.js";

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

describe("Setup Prerequisites: Dependency-Aware Academic Workflow Tests", () => {
  // Test fixture identifiers
  const READY_CODE = "PREREQ_READY";
  const READY_SLUG = "prereq-ready-school";
  const INCOMPLETE_CODE = "PREREQ_INC";
  const INCOMPLETE_SLUG = "prereq-incomplete-school";
  const FOREIGN_CODE = "PREREQ_FOREIGN";
  const FOREIGN_SLUG = "prereq-foreign-school";

  let readySchool: { id: string; slug: string; name: string };
  let incompleteSchool: { id: string; slug: string; name: string };
  let foreignSchool: { id: string; slug: string; name: string };

  let readyAdmin: { id: string };
  let incompleteAdmin: { id: string };
  let foreignAdmin: { id: string };
  let readyTeacher: { id: string };

  let tokenReadyAdmin: string;
  let tokenIncompleteAdmin: string;
  let tokenForeignAdmin: string;
  let tokenReadyTeacher: string;

  before(async () => {
    // Clean up past runs
    await prisma.subject.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@prereq-ready.edu",
            "admin@prereq-incomplete.edu",
            "admin@prereq-foreign.edu",
            "teacher@prereq-ready.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } },
    });

    // 1. Create Incomplete School (status: PENDING, missing details / unapproved)
    incompleteSchool = await prisma.school.create({
      data: {
        name: "I", // Invalid name (< 2 chars)
        code: INCOMPLETE_CODE,
        slug: INCOMPLETE_SLUG,
        status: "PENDING",
        isActive: false,
      },
    });

    incompleteAdmin = await prisma.user.create({
      data: {
        name: "Incomplete Admin",
        email: "admin@prereq-incomplete.edu",
        role: "SCHOOL_ADMIN",
        schoolId: incompleteSchool.id,
        isActive: true,
      },
    });

    // 2. Create Ready School
    readySchool = await prisma.school.create({
      data: {
        name: "Prerequisite Ready Academy",
        code: READY_CODE,
        slug: READY_SLUG,
        status: "ACTIVE",
        isActive: true,
      },
    });

    readyAdmin = await prisma.user.create({
      data: {
        name: "Ready Admin",
        email: "admin@prereq-ready.edu",
        role: "SCHOOL_ADMIN",
        schoolId: readySchool.id,
        isActive: true,
      },
    });

    readyTeacher = await prisma.user.create({
      data: {
        name: "Ready Teacher",
        email: "teacher@prereq-ready.edu",
        role: "TEACHER",
        schoolId: readySchool.id,
        isActive: true,
      },
    });

    // 3. Create Foreign School
    foreignSchool = await prisma.school.create({
      data: {
        name: "Foreign Institution",
        code: FOREIGN_CODE,
        slug: FOREIGN_SLUG,
        status: "ACTIVE",
        isActive: true,
      },
    });

    foreignAdmin = await prisma.user.create({
      data: {
        name: "Foreign Admin",
        email: "admin@prereq-foreign.edu",
        role: "SCHOOL_ADMIN",
        schoolId: foreignSchool.id,
        isActive: true,
      },
    });

    // Generate auth tokens
    tokenReadyAdmin = await createSessionToken({
      userId: readyAdmin.id,
      schoolId: readySchool.id,
      role: "SCHOOL_ADMIN",
      email: "admin@prereq-ready.edu",
    });

    tokenIncompleteAdmin = await createSessionToken({
      userId: incompleteAdmin.id,
      schoolId: incompleteSchool.id,
      role: "SCHOOL_ADMIN",
      email: "admin@prereq-incomplete.edu",
    });

    tokenForeignAdmin = await createSessionToken({
      userId: foreignAdmin.id,
      schoolId: foreignSchool.id,
      role: "SCHOOL_ADMIN",
      email: "admin@prereq-foreign.edu",
    });

    tokenReadyTeacher = await createSessionToken({
      userId: readyTeacher.id,
      schoolId: readySchool.id,
      role: "TEACHER",
      email: "teacher@prereq-ready.edu",
    });
  });

  after(async () => {
    // Cleanup
    await prisma.subject.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@prereq-ready.edu",
            "admin@prereq-incomplete.edu",
            "admin@prereq-foreign.edu",
            "teacher@prereq-ready.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [READY_CODE, INCOMPLETE_CODE, FOREIGN_CODE] } },
    });
  });

  // ==========================================================================
  // Rule A: School Details Completeness
  // ==========================================================================
  describe("Rule A: School Details and Readiness Assessment", () => {
    it("1. should reject academic-year creation when school details are incomplete or inactive", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${incompleteSchool.slug}/academics/years`,
        {
          method: "POST",
          token: tokenIncompleteAdmin,
          body: {
            name: "2026-2027",
            startDate: "2026-06-01T00:00:00.000Z",
            endDate: "2027-05-31T00:00:00.000Z",
            isCurrent: true,
          },
        }
      );

      const res = await createYearHandler(req, {
        params: Promise.resolve({ schoolSlug: incompleteSchool.slug }),
      });

      assert.strictEqual(res.status, 400, "Should reject with HTTP 400 Precondition/Bad Request");
      const json = await res.json();
      assert.strictEqual(json.error.code, "SETUP_PREREQUISITE_REQUIRED");
      assert.match(json.error.message, /Complete your school profile|School lifecycle status/i);
    });

    it("13. should update school details through profile flow and satisfy readiness without manual DB edits", async () => {
      // Check incomplete readiness initially
      const initialReadiness = await getSchoolDetailsReadiness(incompleteSchool.id);
      assert.strictEqual(initialReadiness.isReady, false);

      // School Admin updates school name to a valid name (>= 2 chars)
      const patchReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${incompleteSchool.slug}/profile`,
        {
          method: "PATCH",
          token: tokenIncompleteAdmin,
          body: {
            name: "Prerequisite Fixed Academy",
          },
        }
      );

      const patchRes = await updateProfileHandler(patchReq, {
        params: Promise.resolve({ schoolSlug: incompleteSchool.slug }),
      });
      assert.strictEqual(patchRes.status, 200);

      // Now activate school status
      await prisma.school.update({
        where: { id: incompleteSchool.id },
        data: { status: "ACTIVE", isActive: true },
      });

      // Verify readiness is now complete
      const updatedReadiness = await getSchoolDetailsReadiness(incompleteSchool.id);
      assert.strictEqual(updatedReadiness.isReady, true);
      assert.strictEqual(updatedReadiness.name, "Prerequisite Fixed Academy");
    });

    it("2. should allow academic-year creation once school profile is ready", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/years`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Session 2026-2027",
            startDate: "2026-06-01T00:00:00.000Z",
            endDate: "2027-05-31T00:00:00.000Z",
            isCurrent: false, // Intentionally create as non-current to test Class gate
          },
        }
      );

      const res = await createYearHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.academicYear.name, "Session 2026-2027");
      assert.strictEqual(json.data.academicYear.isCurrent, false);
    });
  });

  // ==========================================================================
  // Rule B & C: Academic Year & Class Dependencies
  // ==========================================================================
  describe("Rule B & C: Class Creation Prerequisites", () => {
    it("3. should reject class creation when no academic year exists (in foreign school)", async () => {
      // foreignSchool has no academic years configured at all
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${foreignSchool.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenForeignAdmin,
          body: {
            name: "Class 1",
            numericOrder: 1,
          },
        }
      );

      const res = await createClassHandler(req, {
        params: Promise.resolve({ schoolSlug: foreignSchool.slug }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, "SETUP_PREREQUISITE_REQUIRED");
      assert.match(
        json.error.message,
        /Set up and activate an academic year before creating classes/i
      );
    });

    it("4. should reject class creation when academic year exists but NO year is set as CURRENT", async () => {
      // readySchool has 'Session 2026-2027' but isCurrent = false
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Class 1",
            numericOrder: 1,
          },
        }
      );

      const res = await createClassHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, "SETUP_PREREQUISITE_REQUIRED");
      assert.match(
        json.error.message,
        /Set up and activate an academic year before creating classes/i
      );
    });

    it("5. should allow class creation when an academic year is designated as CURRENT", async () => {
      // Designate the academic year as current
      const year = await prisma.academicYear.findFirst({
        where: { schoolId: readySchool.id },
      });
      assert.ok(year);

      const setCurrReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/years/${year.id}/set-current`,
        {
          method: "POST",
          token: tokenReadyAdmin,
        }
      );

      const setCurrRes = await setCurrentYearHandler(setCurrReq, {
        params: Promise.resolve({ schoolSlug: readySchool.slug, yearId: year.id }),
      });
      assert.strictEqual(setCurrRes.status, 200);

      // Now class creation should succeed
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Class 10",
            numericOrder: 10,
          },
        }
      );

      const res = await createClassHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.class.name, "Class 10");
      assert.strictEqual(json.data.class.numericOrder, 10);
    });
  });

  // ==========================================================================
  // Rule D: Section Prerequisites
  // ==========================================================================
  describe("Rule D: Section Prerequisites and Parent Class Verification", () => {
    let validClassId: string;
    let foreignClassId: string;

    before(async () => {
      const cls = await prisma.class.findFirst({
        where: { schoolId: readySchool.id, name: "Class 10" },
      });
      assert.ok(cls);
      validClassId = cls.id;

      // Create a foreign class in foreignSchool (which now has an academic year for isolation test)
      await prisma.academicYear.create({
        data: {
          schoolId: foreignSchool.id,
          name: "Foreign 2026",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          isCurrent: true,
        },
      });
      const fCls = await prisma.class.create({
        data: {
          schoolId: foreignSchool.id,
          name: "Foreign Grade 9",
          numericOrder: 9,
        },
      });
      foreignClassId = fCls.id;
    });

    it("6. should reject section creation when parent class does not exist", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            classId: "non_existent_class_id",
            name: "Section A",
            capacity: 40,
          },
        }
      );

      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, "SETUP_PREREQUISITE_REQUIRED");
      assert.match(json.error.message, /Parent class does not exist/i);
    });

    it("7. should reject section creation when parent class belongs to another school (cross-tenant)", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            classId: foreignClassId, // Belongs to foreignSchool!
            name: "Section Cross",
            capacity: 35,
          },
        }
      );

      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, "SETUP_PREREQUISITE_REQUIRED");
      assert.match(json.error.message, /Parent class does not belong to this school|Cross-tenant/i);
    });

    it("should allow section creation when all prerequisites and parent class match", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/sections`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            classId: validClassId,
            name: "Section A",
            capacity: 40,
          },
        }
      );

      const res = await createSectionHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.section.name, "Section A");
      assert.strictEqual(json.data.section.classId, validClassId);
    });
  });

  // ==========================================================================
  // Rule E: Subject Prerequisites
  // ==========================================================================
  describe("Rule E: Subject Prerequisites and Class Scope", () => {
    let validClassId: string;
    let foreignClassId: string;

    before(async () => {
      const cls = await prisma.class.findFirst({
        where: { schoolId: readySchool.id, name: "Class 10" },
      });
      assert.ok(cls);
      validClassId = cls.id;

      const fCls = await prisma.class.findFirst({
        where: { schoolId: foreignSchool.id },
      });
      assert.ok(fCls);
      foreignClassId = fCls.id;
    });

    it("8. should reject class-specific subject creation for invalid or cross-tenant classes", async () => {
      // 8a. Non-existent class
      const reqInvalid = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Advanced Physics",
            classId: "non_existent_class_id",
          },
        }
      );
      const resInvalid = await createSubjectHandler(reqInvalid, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });
      assert.strictEqual(resInvalid.status, 400);
      const jsonInvalid = await resInvalid.json();
      assert.strictEqual(jsonInvalid.error.code, "SETUP_PREREQUISITE_REQUIRED");

      // 8b. Cross-tenant class
      const reqCross = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Cross Chemistry",
            classId: foreignClassId, // foreign school class!
          },
        }
      );
      const resCross = await createSubjectHandler(reqCross, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });
      assert.strictEqual(resCross.status, 400);
      const jsonCross = await resCross.json();
      assert.strictEqual(jsonCross.error.code, "SETUP_PREREQUISITE_REQUIRED");
      assert.match(
        jsonCross.error.message,
        /Selected class does not belong to this school|Cross-tenant/i
      );
    });

    it("9. should allow school-wide subject creation without requiring a class selection", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Physical Education",
            code: "PE-101",
            classId: null, // School-wide subject
          },
        }
      );

      const res = await createSubjectHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.subject.name, "Physical Education");
      assert.strictEqual(json.data.subject.classId, null);
    });

    it("should allow class-specific subject creation when parent class belongs to same school", async () => {
      const req = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/subjects`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Class 10 Mathematics",
            code: "MTH-10",
            classId: validClassId,
          },
        }
      );

      const res = await createSubjectHandler(req, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.subject.name, "Class 10 Mathematics");
      assert.strictEqual(json.data.subject.classId, validClassId);
    });
  });

  // ==========================================================================
  // Security & Bypass Resistance
  // ==========================================================================
  describe("Security: Direct API Bypass Resistance & Authorization", () => {
    it("10. direct API requests cannot bypass prerequisite rules (attempting class creation without active year)", async () => {
      // Temporarily unset isCurrent in readySchool to test direct API bypass attempt
      await prisma.academicYear.updateMany({
        where: { schoolId: readySchool.id },
        data: { isCurrent: false },
      });

      const directBypassReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenReadyAdmin,
          body: {
            name: "Hacked Class Bypassing UI",
            numericOrder: 99,
          },
        }
      );

      const res = await createClassHandler(directBypassReq, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, "SETUP_PREREQUISITE_REQUIRED");

      // Restore active year for remaining tests
      const year = await prisma.academicYear.findFirst({ where: { schoolId: readySchool.id } });
      if (year) {
        await prisma.academicYear.update({ where: { id: year.id }, data: { isCurrent: true } });
      }
    });

    it("11. unauthorized users cannot mutate academic setup (TEACHER and foreign admin rejected)", async () => {
      // 11a. Teacher attempt to mutate class
      const teacherReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenReadyTeacher,
          body: { name: "Teacher Unauthorized Class" },
        }
      );
      const teacherRes = await createClassHandler(teacherReq, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });
      assert.strictEqual(teacherRes.status, 403, "Teacher must be denied write access");

      // 11b. Foreign Admin attempt on readySchool
      const foreignAdminReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/classes`,
        {
          method: "POST",
          token: tokenForeignAdmin,
          body: { name: "Cross Tenant Attack Class" },
        }
      );
      const foreignRes = await createClassHandler(foreignAdminReq, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });
      assert.strictEqual(foreignRes.status, 403, "Cross-tenant write attempt must be forbidden");
    });

    it("12. readiness API returns consistent setup checklist and step progression", async () => {
      const overview = await getAcademicSetupReadiness(readySchool.id, readySchool.slug);

      assert.strictEqual(overview.schoolDetails.isReady, true);
      assert.strictEqual(overview.steps.schoolDetails.status, "COMPLETE");
      assert.strictEqual(overview.steps.academicYear.status, "COMPLETE");
      assert.strictEqual(overview.steps.classes.status, "COMPLETE");
      assert.strictEqual(overview.steps.sections.status, "COMPLETE");
      assert.strictEqual(overview.steps.subjects.status, "COMPLETE");

      assert.strictEqual(overview.summary.canConfigureAcademicYears, true);
      assert.strictEqual(overview.summary.canCreateClasses, true);
      assert.strictEqual(overview.summary.canCreateSections, true);
      assert.strictEqual(overview.summary.canCreateSubjects, true);
    });

    it("14. existing records remain accessible for read operations under RBAC", async () => {
      // TEACHER can read classes
      const readReq = createAuthRequest(
        `http://localhost:3000/api/v1/school/${readySchool.slug}/academics/classes`,
        {
          method: "GET",
          token: tokenReadyTeacher,
        }
      );

      const readRes = await listClassesHandler(readReq, {
        params: Promise.resolve({ schoolSlug: readySchool.slug }),
      });

      assert.strictEqual(readRes.status, 200);
      const json = await readRes.json();
      assert.ok(Array.isArray(json.data.classes));
      assert.ok(json.data.classes.length > 0);
    });
  });
});
