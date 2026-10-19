import { describe, it } from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import {
  createSessionToken,
  verifySessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth.js";

describe("Authentication & Password Security", () => {
  it("should securely hash and verify passwords using bcrypt", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    assert.notStrictEqual(hash, password);
    assert.strictEqual(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"), true);

    const isValid = await verifyPassword(password, hash);
    assert.strictEqual(isValid, true);

    const isWrongValid = await verifyPassword("WrongPassword!", hash);
    assert.strictEqual(isWrongValid, false);
  });

  it("should create and cryptographically verify session tokens", async () => {
    const payload = {
      userId: "user_123",
      schoolId: "school_abc",
      role: "SCHOOL_ADMIN" as const,
      email: "admin@school.edu",
      phone: "+1234567890",
    };

    const token = await createSessionToken(payload);
    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.split(".").length, 3); // standard JWT structure

    const verified = await verifySessionToken(token);
    assert.notStrictEqual(verified, null);
    assert.strictEqual(verified?.userId, payload.userId);
    assert.strictEqual(verified?.schoolId, payload.schoolId);
    assert.strictEqual(verified?.role, payload.role);
    assert.strictEqual(verified?.email, payload.email);
    assert.strictEqual(verified?.phone, payload.phone);
  });

  it("should support SUPER_ADMIN session with null schoolId", async () => {
    const payload = {
      userId: "superadmin_001",
      schoolId: null,
      role: "SUPER_ADMIN" as const,
      email: "superadmin@atenea.local",
    };

    const token = await createSessionToken(payload);
    const verified = await verifySessionToken(token);

    assert.notStrictEqual(verified, null);
    assert.strictEqual(verified?.userId, "superadmin_001");
    assert.strictEqual(verified?.schoolId, null);
    assert.strictEqual(verified?.role, "SUPER_ADMIN");
  });

  it("should reject tampered or invalid session tokens", async () => {
    const token = await createSessionToken({
      userId: "user_abc",
      schoolId: "school_xyz",
      role: "TEACHER" as const,
    });

    // Tamper with signature
    const parts = token.split(".");
    const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`;
    const verified = await verifySessionToken(tamperedToken);
    assert.strictEqual(verified, null);

    // Completely malformed token
    const malformed = await verifySessionToken("not-a-jwt");
    assert.strictEqual(malformed, null);
  });

  it("should configure secure cookie options for sessions", () => {
    const options = getSessionCookieOptions();
    assert.strictEqual(options.name, SESSION_COOKIE_NAME);
    assert.strictEqual(options.httpOnly, true);
    assert.strictEqual(options.sameSite, "lax");
    assert.strictEqual(options.path, "/");
    assert.strictEqual(options.maxAge, 60 * 60 * 24 * 7); // 7 days
  });
});
