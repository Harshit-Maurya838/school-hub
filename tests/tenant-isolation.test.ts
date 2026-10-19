import { describe, it } from "node:test";
import assert from "node:assert";
import { createTenantPrisma, verifyEntitiesBelongToTenant } from "../src/lib/tenant-prisma.js";
import { ForbiddenError } from "../src/lib/errors.js";
import { prisma } from "../src/lib/prisma.js";

describe("Multi-Tenant Isolation", () => {
  it("should reject creation of tenant client without a valid schoolId", () => {
    assert.throws(
      () => createTenantPrisma(""),
      (err: unknown) => err instanceof ForbiddenError
    );
    assert.throws(
      () => createTenantPrisma("   "),
      (err: unknown) => err instanceof ForbiddenError
    );
  });

  it("should prevent connecting related entities that belong to different schools", () => {
    const schoolA = "school_A_id";
    const entityFromSchoolA = { id: "class_1", schoolId: "school_A_id" };
    const entityFromSchoolB = { id: "subject_2", schoolId: "school_B_id" };

    // Same tenant: valid
    assert.doesNotThrow(() => verifyEntitiesBelongToTenant(schoolA, [entityFromSchoolA]));

    // Cross-tenant: throws ForbiddenError
    assert.throws(
      () => verifyEntitiesBelongToTenant(schoolA, [entityFromSchoolA, entityFromSchoolB]),
      (err: unknown) => err instanceof ForbiddenError
    );
  });

  it("should enforce tenant isolation in database operations", async () => {
    // Clean up test schools if any exist from previous runs
    await prisma.user.deleteMany({
      where: { email: { in: ["adminA@test.edu", "adminB@test.edu"] } },
    });
    await prisma.school.deleteMany({
      where: { code: { in: ["TEST_SCH_A", "TEST_SCH_B"] } },
    });

    // Create two separate tenant schools
    const schoolA = await prisma.school.create({
      data: {
        name: "Test School A",
        code: "TEST_SCH_A",
        slug: "test-school-a",
        isActive: true,
      },
    });

    const schoolB = await prisma.school.create({
      data: {
        name: "Test School B",
        code: "TEST_SCH_B",
        slug: "test-school-b",
        isActive: true,
      },
    });

    // Create users under each school
    const userA = await prisma.user.create({
      data: {
        name: "User School A",
        email: "adminA@test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolA.id,
      },
    });

    const userB = await prisma.user.create({
      data: {
        name: "User School B",
        email: "adminB@test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: schoolB.id,
      },
    });

    // Instantiate tenant-scoped clients
    const tenantClientA = createTenantPrisma(schoolA.id);
    const tenantClientB = createTenantPrisma(schoolB.id);

    // 1. School A tenant query should only return School A users
    const usersInTenantA = await tenantClientA.user.findMany();
    const foundUserAInA = usersInTenantA.some((u) => u.id === userA.id);
    const foundUserBInA = usersInTenantA.some((u) => u.id === userB.id);

    assert.strictEqual(foundUserAInA, true);
    assert.strictEqual(foundUserBInA, false, "School A client MUST NOT see School B users");

    // 2. School B tenant query should only return School B users
    const usersInTenantB = await tenantClientB.user.findMany();
    const foundUserBInB = usersInTenantB.some((u) => u.id === userB.id);
    const foundUserAInB = usersInTenantB.some((u) => u.id === userA.id);

    assert.strictEqual(foundUserBInB, true);
    assert.strictEqual(foundUserAInB, false, "School B client MUST NOT see School A users");

    // 3. Prevent cross-tenant creation: creating under School A forces schoolId to schoolA
    const classA = await tenantClientA.class.create({
      data: {
        name: "Grade 10A",
        schoolId: schoolA.id,
      },
    });
    assert.strictEqual(classA.schoolId, schoolA.id);

    // 4. Attempting to tamper with schoolId to schoolB in School A's update throws ForbiddenError
    await assert.rejects(
      async () => {
        await tenantClientA.class.update({
          where: { id: classA.id },
          data: {
            schoolId: schoolB.id, // malicious tenant transfer attempt
          },
        });
      },
      (err: unknown) => err instanceof ForbiddenError
    );

    // 5. School B cannot delete School A's class
    const deleteCount = await tenantClientB.class.deleteMany({
      where: { id: classA.id },
    });
    assert.strictEqual(deleteCount.count, 0, "School B cannot delete School A's record");

    // Verify record still exists in School A
    const stillExists = await tenantClientA.class.findFirst({
      where: { id: classA.id },
    });
    assert.notStrictEqual(stillExists, null);

    // Clean up
    await tenantClientA.class.deleteMany({ where: { id: classA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
  });
});
