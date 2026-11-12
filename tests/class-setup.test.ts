import { describe, it, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/modules/auth/services/auth.js";
import { PUT as saveStepHandler } from "../src/app/api/v1/school/[schoolSlug]/profile/master/steps/[step]/route.js";
import {
  GET as getSetupHandler,
  POST as createSetupHandler,
} from "../src/app/api/v1/school/[schoolSlug]/academics/setup/route.js";
import { POST as provisionHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/setup/provision/route.js";
import { POST as copySubjectsHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/setup/copy-subjects/route.js";
import { POST as createSectionHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/sections/route.js";
import { PATCH as updateSectionHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/sections/[sectionId]/route.js";
import {
  classesForRange,
  defaultSubjectsFor,
  nextSectionName,
} from "../src/modules/onboarding/services/class-structure-template.js";
import { currentIndianSession, provisionClassStructure } from "../src/modules/academics/index.js";

const CODES = ["CSETUP_A", "CSETUP_B", "CSETUP_C"];
const EMAILS = [
  "admin_a@csetup.test",
  "admin_b@csetup.test",
  "teacher_a@csetup.test",
  "admin_c@csetup.test",
];

function req(url: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const headers = new Headers();
  if (options.token) headers.set("Cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const api = (slug: string) => `http://localhost:3000/api/v1/school/${slug}`;
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

async function saveAcademic(slug: string, token: string, body: unknown) {
  return saveStepHandler(
    req(`${api(slug)}/profile/master/steps/academic`, { method: "PUT", token, body }),
    ctx({ schoolSlug: slug, step: "academic" })
  );
}
async function getSetup(slug: string, token?: string) {
  return getSetupHandler(req(`${api(slug)}/academics/setup`, { token }), ctx({ schoolSlug: slug }));
}
async function createWithSetup(slug: string, token: string, body: unknown) {
  return createSetupHandler(
    req(`${api(slug)}/academics/setup`, { method: "POST", token, body }),
    ctx({ schoolSlug: slug })
  );
}
async function provision(slug: string, token: string) {
  return provisionHandler(
    req(`${api(slug)}/academics/setup/provision`, { method: "POST", token }),
    ctx({ schoolSlug: slug })
  );
}
async function copySubjects(slug: string, token: string, body: unknown) {
  return copySubjectsHandler(
    req(`${api(slug)}/academics/setup/copy-subjects`, { method: "POST", token, body }),
    ctx({ schoolSlug: slug })
  );
}

const academic = (overrides: Record<string, unknown> = {}) => ({
  instructionMedium: "HINDI",
  classRange: "CLASS_1_TO_5",
  includesPrePrimary: true,
  rteApplicable: false,
  boardAffiliation: "CBSE",
  streams: [],
  ...overrides,
});

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { school: { code: { in: CODES } } } });
  await prisma.schoolProfile.deleteMany({ where: { school: { code: { in: CODES } } } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.school.deleteMany({ where: { code: { in: CODES } } });
}

describe("Class structure template", () => {
  it("lists classes for a range, with pre-primary only when the range starts at Class 1", () => {
    assert.deepStrictEqual(
      classesForRange("CLASS_1_TO_5", true).map((c) => c.name),
      ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]
    );
    assert.deepStrictEqual(
      classesForRange("CLASS_6_TO_8", true).map((c) => c.name),
      ["Class 6", "Class 7", "Class 8"]
    );
    assert.deepStrictEqual(classesForRange("NOT_A_RANGE", true), []);
  });

  it("gives senior-secondary subjects for the chosen streams", () => {
    const subjects = defaultSubjectsFor(11, ["SCIENCE", "COMMERCE"]);
    assert.ok(subjects.includes("Physics"));
    assert.ok(subjects.includes("Accountancy"));
    assert.ok(!subjects.includes("History"));
    assert.strictEqual(subjects[0], "English Core");
  });

  it("works out the next free section letter", () => {
    assert.strictEqual(nextSectionName([]), "A");
    assert.strictEqual(nextSectionName(["A", "b"]), "C");
    assert.strictEqual(nextSectionName(["A", "C"]), "B");
  });

  it("names the April–March session", () => {
    assert.deepStrictEqual(currentIndianSession(new Date("2026-11-08")), {
      name: "2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    });
    assert.strictEqual(currentIndianSession(new Date("2027-02-10")).name, "2026-27");
  });
});

describe("Classes & subjects: provisioning from the school profile and setup APIs", () => {
  let schoolA: { id: string; slug: string };
  let schoolB: { id: string; slug: string };
  let schoolC: { id: string; slug: string };
  let tokenAdminA: string;
  let tokenAdminB: string;
  let tokenTeacherA: string;
  let class1Id: string;

  after(cleanup);

  it("sets up isolated schools and users", async () => {
    await cleanup();
    schoolA = await prisma.school.create({
      data: { name: "Setup School Alpha", code: CODES[0], slug: "csetup-alpha" },
    });
    schoolB = await prisma.school.create({
      data: { name: "Setup School Beta", code: CODES[1], slug: "csetup-beta" },
    });
    schoolC = await prisma.school.create({
      data: { name: "Setup School Gamma", code: CODES[2], slug: "csetup-gamma" },
    });
    const users = await Promise.all([
      prisma.user.create({
        data: { name: "Admin A", email: EMAILS[0], role: "SCHOOL_ADMIN", schoolId: schoolA.id },
      }),
      prisma.user.create({
        data: { name: "Admin B", email: EMAILS[1], role: "SCHOOL_ADMIN", schoolId: schoolB.id },
      }),
      prisma.user.create({
        data: { name: "Teacher A", email: EMAILS[2], role: "TEACHER", schoolId: schoolA.id },
      }),
      prisma.user.create({
        data: { name: "Admin C", email: EMAILS[3], role: "SCHOOL_ADMIN", schoolId: schoolC.id },
      }),
    ]);
    const token = (i: number, schoolId: string, role: "SCHOOL_ADMIN" | "TEACHER") =>
      createSessionToken({ userId: users[i].id, schoolId, role, email: EMAILS[i] });
    tokenAdminA = await token(0, schoolA.id, "SCHOOL_ADMIN");
    tokenAdminB = await token(1, schoolB.id, "SCHOOL_ADMIN");
    tokenTeacherA = await token(2, schoolA.id, "TEACHER");
  });

  it("creates the session, classes, sections and default subjects when the academic step is saved", async () => {
    const res = await saveAcademic(schoolA.slug, tokenAdminA, academic());
    assert.strictEqual(res.status, 200);
    const { provisioning } = (await res.json()).data;

    assert.strictEqual(provisioning.skippedReason, null);
    assert.strictEqual(provisioning.createdSession, currentIndianSession().name);
    assert.deepStrictEqual(
      provisioning.createdClasses,
      classesForRange("CLASS_1_TO_5", true).map((c) => c.name)
    );
    assert.strictEqual(provisioning.createdSections, 8);
    // 3 pre-primary × 5 + Class 1–2 × 4 + Class 3–5 × 5
    assert.strictEqual(provisioning.createdSubjects, 38);

    const year = await prisma.academicYear.findFirst({ where: { schoolId: schoolA.id } });
    assert.ok(year?.isCurrent);
    const sections = await prisma.section.findMany({ where: { schoolId: schoolA.id } });
    assert.strictEqual(sections.length, 8);
    assert.ok(sections.every((s) => s.name === "A" && s.medium === "HINDI"));

    const audit = await prisma.auditLog.findFirst({
      where: { schoolId: schoolA.id, action: "CLASS_STRUCTURE_PROVISIONED" },
    });
    assert.ok(audit);
  });

  it("is safe to save again: nothing is duplicated", async () => {
    const res = await saveAcademic(schoolA.slug, tokenAdminA, academic());
    const { provisioning } = (await res.json()).data;
    assert.deepStrictEqual(provisioning.createdClasses, []);
    assert.strictEqual(provisioning.createdSections, 0);
    assert.strictEqual(provisioning.createdSubjects, 0);
    assert.strictEqual(provisioning.createdSession, null);
    assert.strictEqual(await prisma.class.count({ where: { schoolId: schoolA.id } }), 8);
  });

  it("adds classes for a wider range, keeps classes outside it and leaves curated subjects alone", async () => {
    const class1 = await prisma.class.findFirstOrThrow({
      where: { schoolId: schoolA.id, name: "Class 1" },
      include: { subjects: true },
    });
    class1Id = class1.id;
    await prisma.subject.delete({ where: { id: class1.subjects[0].id } });

    const res = await saveAcademic(
      schoolA.slug,
      tokenAdminA,
      academic({ classRange: "CLASS_1_TO_8", includesPrePrimary: false })
    );
    const { provisioning } = (await res.json()).data;
    assert.deepStrictEqual(provisioning.createdClasses, ["Class 6", "Class 7", "Class 8"]);
    assert.deepStrictEqual(provisioning.outsideRange.sort(), ["LKG", "Nursery", "UKG"]);
    assert.strictEqual(await prisma.class.count({ where: { schoolId: schoolA.id } }), 11);
    // Class 1 still has its reduced list: provisioning only fills classes with no subjects.
    assert.strictEqual(await prisma.subject.count({ where: { classId: class1Id } }), 3);
  });

  it("returns the setup overview to admins and teachers of the school", async () => {
    for (const token of [tokenAdminA, tokenTeacherA]) {
      const res = await getSetup(schoolA.slug, token);
      assert.strictEqual(res.status, 200);
      const { overview } = (await res.json()).data;
      assert.strictEqual(overview.rows.length, 11);
      assert.strictEqual(overview.defaultMedium, "HINDI");
      assert.deepStrictEqual(overview.profile.missingClasses, []);
      const class6 = overview.rows.find((r: { name: string }) => r.name === "Class 6");
      // Fees count only for roles that can see them; teachers get no fee data at all.
      if (token === tokenAdminA) {
        assert.strictEqual(overview.includesFees, true);
        assert.deepStrictEqual(class6.missing, ["fees"]);
      } else {
        assert.strictEqual(overview.includesFees, false);
        assert.strictEqual(class6.fees, null);
        assert.deepStrictEqual(class6.missing, []);
      }
      assert.strictEqual(class6.sections[0].studentCount, 0);
    }
  });

  it("rejects unauthenticated, teacher and cross-tenant access", async () => {
    assert.strictEqual((await getSetup(schoolA.slug)).status, 401);
    assert.strictEqual((await getSetup(schoolA.slug, tokenAdminB)).status, 403);
    assert.strictEqual(
      (await createWithSetup(schoolA.slug, tokenTeacherA, { name: "Class 9" })).status,
      403
    );
    assert.strictEqual((await provision(schoolA.slug, tokenTeacherA)).status, 403);
    assert.strictEqual(
      (await createWithSetup(schoolA.slug, tokenAdminB, { name: "Class 9" })).status,
      403
    );
  });

  it("creates a class with sections in one medium and default subjects", async () => {
    const res = await createWithSetup(schoolA.slug, tokenAdminA, {
      name: "Class 9",
      sections: ["A", "b"],
      medium: "ENGLISH",
    });
    assert.strictEqual(res.status, 201);
    const data = (await res.json()).data;
    assert.strictEqual(data.sectionsCreated, 2);
    assert.strictEqual(data.subjectsCreated, defaultSubjectsFor(9).length);
    const sections = await prisma.section.findMany({
      where: { classId: data.class.id },
      orderBy: { name: "asc" },
    });
    assert.deepStrictEqual(
      sections.map((s) => [s.name, s.medium]),
      [
        ["A", "ENGLISH"],
        ["B", "ENGLISH"],
      ]
    );
  });

  it("rejects duplicate and invalid classes", async () => {
    assert.strictEqual(
      (await createWithSetup(schoolA.slug, tokenAdminA, { name: "Class 9" })).status,
      409
    );
    // Schema violations are validation errors (422), as everywhere in this API.
    assert.strictEqual(
      (await createWithSetup(schoolA.slug, tokenAdminA, { name: "" })).status,
      422
    );
    assert.strictEqual(
      (await createWithSetup(schoolA.slug, tokenAdminA, { name: "Class 10", medium: "KLINGON" }))
        .status,
      422
    );
  });

  it("copies subjects to other classes without duplicating, within the school only", async () => {
    const class9 = await prisma.class.findFirstOrThrow({
      where: { schoolId: schoolA.id, name: "Class 9" },
    });
    const res = await copySubjects(schoolA.slug, tokenAdminA, {
      fromClassId: class9.id,
      toClassIds: [class1Id],
    });
    assert.strictEqual(res.status, 200);
    const { copied } = (await res.json()).data;
    const names = (await prisma.subject.findMany({ where: { classId: class1Id } })).map(
      (s) => s.name
    );
    assert.strictEqual(new Set(names).size, names.length);
    assert.ok(copied > 0 && names.includes("Social Science"));

    const foreign = await prisma.class.create({ data: { schoolId: schoolB.id, name: "Class 1" } });
    const cross = await copySubjects(schoolA.slug, tokenAdminA, {
      fromClassId: class9.id,
      toClassIds: [foreign.id],
    });
    assert.strictEqual(cross.status, 404);
    assert.strictEqual(await prisma.subject.count({ where: { classId: foreign.id } }), 0);
  });

  it("stores a medium on sections created and updated through the sections API", async () => {
    const created = await createSectionHandler(
      req(`${api(schoolA.slug)}/academics/sections`, {
        method: "POST",
        token: tokenAdminA,
        body: { classId: class1Id, name: "B", medium: "URDU" },
      }),
      ctx({ schoolSlug: schoolA.slug })
    );
    assert.strictEqual(created.status, 201);
    const section = (await created.json()).data.section;
    assert.strictEqual(section.medium, "URDU");

    const updated = await updateSectionHandler(
      req(`${api(schoolA.slug)}/academics/sections/${section.id}`, {
        method: "PATCH",
        token: tokenAdminA,
        body: { medium: null },
      }),
      ctx({ schoolSlug: schoolA.slug, sectionId: section.id })
    );
    assert.strictEqual(updated.status, 200);
    const stored = await prisma.section.findUniqueOrThrow({ where: { id: section.id } });
    assert.strictEqual(stored.medium, null);
  });

  it("refuses to provision before the profile's academic step is saved", async () => {
    const res = await provision(schoolB.slug, tokenAdminB);
    assert.strictEqual(res.status, 400);
  });

  it("skips (without failing) when sessions exist but none is active", async () => {
    await prisma.academicYear.create({
      data: {
        schoolId: schoolC.id,
        name: "2025-26",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: false,
      },
    });
    const result = await provisionClassStructure({
      schoolId: schoolC.id,
      classRange: "CLASS_1_TO_5",
      includesPrePrimary: false,
      medium: "ENGLISH",
    });
    assert.ok(result.skippedReason);
    assert.strictEqual(await prisma.class.count({ where: { schoolId: schoolC.id } }), 0);
  });
});
