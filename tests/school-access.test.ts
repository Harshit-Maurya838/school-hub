import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../src/lib/errors.js";
import {
  createSessionToken,
  findSchoolBySlug,
  requireSchoolAccess,
  SESSION_COOKIE_NAME,
} from "../src/modules/auth/index.js";
import { listSchoolRegistrations } from "../src/modules/onboarding/services/school-registration.js";

const requestAs = async (user: {
  id: string;
  schoolId: string | null;
  role: "SCHOOL_ADMIN" | "TEACHER";
}) =>
  new NextRequest("http://localhost:3000/api/v1/school/x", {
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${await createSessionToken({ userId: user.id, schoolId: user.schoolId, role: user.role })}`,
    },
  });

describe("Shared school access helpers", () => {
  const ids = { schools: [] as string[], users: [] as string[] };
  let schoolA: { id: string; slug: string };
  let adminA: { id: string; schoolId: string | null; role: "SCHOOL_ADMIN" };
  let teacherA: { id: string; schoolId: string | null; role: "TEACHER" };

  before(async () => {
    await prisma.school.deleteMany({
      where: { code: { in: ["ACCESS_A", "ACCESS_B", "ACCESS_OFF"] } },
    });
    const make = (code: string, isActive = true) =>
      prisma.school.create({
        data: { name: code, code, slug: code.toLowerCase().replace("_", "-"), isActive },
      });
    schoolA = await make("ACCESS_A");
    const schoolB = await make("ACCESS_B");
    const inactive = await make("ACCESS_OFF", false);
    ids.schools.push(schoolA.id, schoolB.id, inactive.id);

    const admin = await prisma.user.create({
      data: {
        name: "Admin A",
        email: "access-admin@test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolA.id,
      },
    });
    const teacher = await prisma.user.create({
      data: {
        name: "Teacher A",
        email: "access-teacher@test.edu",
        role: "TEACHER",
        schoolId: schoolA.id,
      },
    });
    ids.users.push(admin.id, teacher.id);
    adminA = { id: admin.id, schoolId: schoolA.id, role: "SCHOOL_ADMIN" };
    teacherA = { id: teacher.id, schoolId: schoolA.id, role: "TEACHER" };
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.school.deleteMany({ where: { id: { in: ids.schools } } });
  });

  it("findSchoolBySlug: 400 for blank, 404 for unknown or (when required) inactive", async () => {
    await assert.rejects(() => findSchoolBySlug("  "), BadRequestError);
    await assert.rejects(() => findSchoolBySlug("no-such-school"), NotFoundError);
    assert.strictEqual((await findSchoolBySlug("access-off")).isActive, false);
    await assert.rejects(
      () => findSchoolBySlug("access-off", { requireActive: true }),
      NotFoundError
    );
  });

  it("requireSchoolAccess: allows own school, blocks other tenants", async () => {
    const { school, user } = await requireSchoolAccess(await requestAs(adminA), schoolA.slug);
    assert.strictEqual(school.id, schoolA.id);
    assert.strictEqual(user.id, adminA.id);
    await assert.rejects(
      async () => requireSchoolAccess(await requestAs(adminA), "access-b"),
      ForbiddenError
    );
  });

  it("requireSchoolAccess: role gate runs before the school lookup", async () => {
    // A teacher probing an unknown slug learns nothing: 403, not 404.
    await assert.rejects(
      async () =>
        requireSchoolAccess(await requestAs(teacherA), "no-such-school", {
          roles: ["SCHOOL_ADMIN"],
        }),
      ForbiddenError
    );
  });

  it("listSchoolRegistrations rejects an unknown status with 400", async () => {
    await assert.rejects(() => listSchoolRegistrations("BOGUS"), BadRequestError);
    assert.ok(Array.isArray(await listSchoolRegistrations("PENDING_REVIEW")));
  });
});
