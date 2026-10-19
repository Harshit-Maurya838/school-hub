import { describe, it } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route.js";
import { POST as logoutHandler } from "../src/app/api/v1/auth/logout/route.js";
import { GET as meHandler } from "../src/app/api/v1/auth/me/route.js";
import { POST as forgotPasswordHandler } from "../src/app/api/v1/auth/forgot-password/route.js";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { createSessionToken, SESSION_COOKIE_NAME, getSession } from "../src/lib/auth.js";
import { sanitizeRedirectUrl } from "../src/proxy.js";

describe("API Authentication & Route Security", () => {
  it("should sanitize redirect URLs to prevent open redirect vulnerabilities", () => {
    // Valid relative URLs
    assert.strictEqual(sanitizeRedirectUrl("/school/dashboard"), "/school/dashboard");
    assert.strictEqual(sanitizeRedirectUrl("/platform/schools"), "/platform/schools");

    // Malicious open redirect attempts
    assert.strictEqual(sanitizeRedirectUrl("https://evil.com"), "");
    assert.strictEqual(sanitizeRedirectUrl("//evil.com"), "");
    assert.strictEqual(sanitizeRedirectUrl("/\\evil.com"), "");
    assert.strictEqual(sanitizeRedirectUrl("javascript:alert(1)"), "");
    assert.strictEqual(sanitizeRedirectUrl(null), "");
    assert.strictEqual(sanitizeRedirectUrl(undefined), "");
  });

  it("should reject client header spoofing and rely strictly on cryptographic session", async () => {
    // Attempt spoofing with x-user-id, x-school-id, x-role headers without a cookie
    const spoofedReq = new NextRequest("http://localhost:3000/api/v1/auth/me", {
      headers: {
        "x-user-id": "fake_user_id",
        "x-school-id": "fake_school_id",
        "x-role": "SUPER_ADMIN",
      },
    });

    const session = await getSession(spoofedReq);
    assert.strictEqual(session, null, "Spoofed headers must NOT yield a valid session");
  });

  it("should execute end-to-end login flow with valid, invalid, inactive, and deleted accounts", async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { in: ["active@test.edu", "inactive@test.edu", "deleted@test.edu"] } },
    });
    await prisma.school.deleteMany({
      where: { code: "TEST_AUTH_SCH" },
    });

    const school = await prisma.school.create({
      data: {
        name: "Auth Test School",
        code: "TEST_AUTH_SCH",
        slug: "auth-test-school",
        isActive: true,
      },
    });

    const rawPassword = "CorrectPassword123!";
    const passwordHash = await hashPassword(rawPassword);

    const activeUser = await prisma.user.create({
      data: {
        name: "Active Staff",
        email: "active@test.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: school.id,
        isActive: true,
      },
    });

    const inactiveUser = await prisma.user.create({
      data: {
        name: "Inactive Staff",
        email: "inactive@test.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: school.id,
        isActive: false, // Inactive
      },
    });

    const deletedUser = await prisma.user.create({
      data: {
        name: "Deleted Staff",
        email: "deleted@test.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: school.id,
        isActive: true,
        deletedAt: new Date(), // Soft-deleted
      },
    });

    // 1. Valid login
    const validLoginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "Active@Test.Edu ", // tests email trimming and case-normalization
        password: rawPassword,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const validLoginRes = await loginHandler(validLoginReq);
    assert.strictEqual(validLoginRes.status, 200);

    const validLoginBody = await validLoginRes.json();
    assert.strictEqual(validLoginBody.data.user.id, activeUser.id);
    assert.strictEqual(validLoginBody.data.user.email, "active@test.edu");
    assert.strictEqual(validLoginBody.data.user.role, "TEACHER");
    assert.strictEqual(
      validLoginBody.data.user.passwordHash,
      undefined,
      "Never expose passwordHash"
    );

    // Verify session cookie was set
    const setCookieHeader = validLoginRes.headers.get("set-cookie");
    assert.notStrictEqual(setCookieHeader, null);
    assert.strictEqual(setCookieHeader?.includes(`${SESSION_COOKIE_NAME}=`), true);
    assert.strictEqual(setCookieHeader?.includes("HttpOnly"), true);

    // 2. Invalid password
    const invalidPasswordReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "active@test.edu",
        password: "WrongPassword!",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const invalidPasswordRes = await loginHandler(invalidPasswordReq);
    assert.strictEqual(invalidPasswordRes.status, 401);
    const invalidPassBody = await invalidPasswordRes.json();
    assert.strictEqual(invalidPassBody.error.code, "unauthorized");
    assert.strictEqual(invalidPassBody.error.message, "Invalid email or password");

    // 3. Non-existent account (generic message)
    const nonExistentReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "nobody@test.edu",
        password: "AnyPassword123!",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const nonExistentRes = await loginHandler(nonExistentReq);
    assert.strictEqual(nonExistentRes.status, 401);
    const nonExistentBody = await nonExistentRes.json();
    assert.strictEqual(nonExistentBody.error.message, "Invalid email or password");

    // 4. Inactive user login rejected
    const inactiveLoginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "inactive@test.edu",
        password: rawPassword,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const inactiveLoginRes = await loginHandler(inactiveLoginReq);
    assert.strictEqual(inactiveLoginRes.status, 401);

    // 5. Soft-deleted user login rejected
    const deletedLoginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "deleted@test.edu",
        password: rawPassword,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const deletedLoginRes = await loginHandler(deletedLoginReq);
    assert.strictEqual(deletedLoginRes.status, 401);

    // 6. Test /me endpoint with valid cookie
    const token = await createSessionToken({
      userId: activeUser.id,
      schoolId: activeUser.schoolId,
      role: activeUser.role,
      email: activeUser.email,
    });

    const meReq = new NextRequest("http://localhost:3000/api/v1/auth/me", {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const meRes = await meHandler(meReq);
    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.data.user.id, activeUser.id);
    assert.strictEqual(meBody.data.user.role, "TEACHER");
    assert.strictEqual(Array.isArray(meBody.data.permissions), true);

    // 7. Test /logout endpoint
    const logoutReq = new NextRequest("http://localhost:3000/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const logoutRes = await logoutHandler(logoutReq);
    assert.strictEqual(logoutRes.status, 200);
    const logoutCookie = logoutRes.headers.get("set-cookie");
    assert.strictEqual(logoutCookie?.includes("Max-Age=0"), true);

    // 8. Test /forgot-password rejection when transport is unconfigured
    const forgotReq = new NextRequest("http://localhost:3000/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "active@test.edu" }),
      headers: { "Content-Type": "application/json" },
    });
    const forgotRes = await forgotPasswordHandler(forgotReq);
    assert.strictEqual(forgotRes.status, 400);

    // Clean up
    await prisma.user.deleteMany({
      where: { id: { in: [activeUser.id, inactiveUser.id, deletedUser.id] } },
    });
    await prisma.school.deleteMany({ where: { id: school.id } });
  });
});
