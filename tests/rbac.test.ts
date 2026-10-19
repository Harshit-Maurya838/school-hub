import { describe, it } from "node:test";
import assert from "node:assert";
import {
  hasPermission,
  requireRole,
  requirePermission,
  assertSchoolAccess,
} from "../src/lib/rbac.js";
import { ForbiddenError } from "../src/lib/errors.js";
import { Role } from "../src/generated/prisma/enums.js";

describe("Role-Based Access Control (RBAC)", () => {
  it("should deny permissions by default", () => {
    // Non-existent permission or role without permission
    assert.strictEqual(hasPermission("STUDENT", "platform:manage"), false);
    assert.strictEqual(hasPermission("STUDENT", "fees:manage"), false);
    assert.strictEqual(hasPermission("TEACHER", "platform:manage"), false);
    assert.strictEqual(hasPermission("ACCOUNTANT", "attendance:manage"), false);
  });

  it("should grant SUPER_ADMIN platform management permissions", () => {
    assert.strictEqual(hasPermission("SUPER_ADMIN", "platform:manage"), true);
    assert.strictEqual(hasPermission("SUPER_ADMIN", "platform:view"), true);
    assert.strictEqual(hasPermission("SUPER_ADMIN", "school:create"), true);
    assert.strictEqual(hasPermission("SUPER_ADMIN", "audit:view"), true);
  });

  it("should grant SCHOOL_ADMIN school management but not platform management", () => {
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "school:manage"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "staff:manage"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "student:create"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "platform:manage"), false);
  });

  it("should enforce accountant boundaries to financial workflows only", () => {
    assert.strictEqual(hasPermission("ACCOUNTANT", "fees:manage"), true);
    assert.strictEqual(hasPermission("ACCOUNTANT", "fees:view"), true);
    assert.strictEqual(hasPermission("ACCOUNTANT", "attendance:manage"), false);
    assert.strictEqual(hasPermission("ACCOUNTANT", "grades:manage"), false);
    assert.strictEqual(hasPermission("ACCOUNTANT", "staff:manage"), false);
  });

  it("should enforce teacher boundaries to academic and attendance workflows only", () => {
    assert.strictEqual(hasPermission("TEACHER", "attendance:manage"), true);
    assert.strictEqual(hasPermission("TEACHER", "grades:manage"), true);
    assert.strictEqual(hasPermission("TEACHER", "fees:manage"), false);
    assert.strictEqual(hasPermission("TEACHER", "staff:manage"), false);
  });

  it("should enforce parent and student limited own-record permissions", () => {
    assert.strictEqual(hasPermission("PARENT", "student:view:own"), true);
    assert.strictEqual(hasPermission("PARENT", "student:view:all"), false);
    assert.strictEqual(hasPermission("PARENT", "staff:manage"), false);

    assert.strictEqual(hasPermission("STUDENT", "student:view:own"), true);
    assert.strictEqual(hasPermission("STUDENT", "student:view:all"), false);
    assert.strictEqual(hasPermission("STUDENT", "grades:manage"), false);
  });

  it("should enforce requireRole checks", () => {
    const user = {
      id: "u1",
      name: "Teacher Alice",
      email: "teacher@school.edu",
      phone: null,
      role: "TEACHER" as Role,
      schoolId: "school_1",
      isActive: true,
    };

    // Allowed role
    assert.doesNotThrow(() => requireRole(user, ["TEACHER", "SCHOOL_ADMIN"]));

    // Disallowed role throws ForbiddenError (403)
    assert.throws(
      () => requireRole(user, ["SUPER_ADMIN", "SCHOOL_ADMIN"]),
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );
  });

  it("should enforce requirePermission checks", () => {
    const user = {
      id: "u2",
      name: "Accountant Bob",
      email: "accountant@school.edu",
      phone: null,
      role: "ACCOUNTANT" as Role,
      schoolId: "school_1",
      isActive: true,
    };

    // Permitted
    assert.doesNotThrow(() => requirePermission(user, "fees:manage"));

    // Forbidden
    assert.throws(
      () => requirePermission(user, "platform:manage"),
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );
  });

  it("should assert school access and block cross-tenant access", () => {
    const schoolUser = {
      id: "u3",
      name: "School Admin Charlie",
      email: "admin@school-a.edu",
      phone: null,
      role: "SCHOOL_ADMIN" as Role,
      schoolId: "school_A",
      isActive: true,
    };

    // Same school: allowed
    assert.doesNotThrow(() => assertSchoolAccess(schoolUser, "school_A"));

    // Different school: throws ForbiddenError
    assert.throws(
      () => assertSchoolAccess(schoolUser, "school_B"),
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );

    // SUPER_ADMIN: allowed to access any school context
    const superAdmin = {
      id: "u_super",
      name: "Super Admin",
      email: "admin@atenea.local",
      phone: null,
      role: "SUPER_ADMIN" as Role,
      schoolId: null,
      isActive: true,
    };
    assert.doesNotThrow(() => assertSchoolAccess(superAdmin, "school_A"));
    assert.doesNotThrow(() => assertSchoolAccess(superAdmin, "school_B"));
  });
});
