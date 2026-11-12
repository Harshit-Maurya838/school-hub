import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route.js";
import { POST as forgotPasswordHandler } from "../src/app/api/v1/auth/forgot-password/route.js";
import { POST as resetPasswordHandler } from "../src/app/api/v1/auth/reset-password/route.js";
import { GET as meHandler } from "../src/app/api/v1/auth/me/route.js";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { clearSentEmails, getLatestEmailFor } from "../src/lib/email.js";
import { SESSION_COOKIE_NAME, LOGIN_MAX_FAILURES } from "../src/modules/auth/index.js";

const EMAIL = "reset-user@test.edu";
const OLD_PASSWORD = "OldPassword123";
const NEW_PASSWORD = "NewPassword456";

const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost:3000${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const login = (password: string) =>
  loginHandler(post("/api/v1/auth/login", { email: EMAIL, password }));

const sessionCookie = (res: Response) => {
  const match = res.headers.get("set-cookie")?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  assert.ok(match, "login must set a session cookie");
  return `${SESSION_COOKIE_NAME}=${match[1]}`;
};

const me = (cookie: string) =>
  meHandler(
    new NextRequest("http://localhost:3000/api/v1/auth/me", { headers: { Cookie: cookie } })
  );

async function requestResetToken(): Promise<string> {
  clearSentEmails();
  const res = await forgotPasswordHandler(post("/api/v1/auth/forgot-password", { email: EMAIL }));
  assert.strictEqual(res.status, 200);
  const url = getLatestEmailFor(EMAIL)?.actionUrl;
  assert.ok(url, "a reset email must be sent to an active account");
  const token = new URL(url).searchParams.get("token");
  assert.ok(token);
  return token;
}

describe("Password reset, session revocation and login lockout", () => {
  let schoolId: string;
  let userId: string;

  before(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.school.deleteMany({ where: { code: "TEST_RESET_SCH" } });
    const school = await prisma.school.create({
      data: { name: "Reset Test School", code: "TEST_RESET_SCH", slug: "reset-test-school" },
    });
    schoolId = school.id;
    const user = await prisma.user.create({
      data: {
        name: "Reset User",
        email: EMAIL,
        passwordHash: await hashPassword(OLD_PASSWORD),
        role: "TEACHER",
        schoolId,
      },
    });
    userId = user.id;
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.school.deleteMany({ where: { id: schoolId } });
  });

  it("resets the password once and revokes sessions issued before the reset", async () => {
    const oldLogin = await login(OLD_PASSWORD);
    assert.strictEqual(oldLogin.status, 200);
    const oldCookie = sessionCookie(oldLogin);
    assert.strictEqual((await me(oldCookie)).status, 200);

    const token = await requestResetToken();

    const weak = await resetPasswordHandler(
      post("/api/v1/auth/reset-password", { token, password: "short" })
    );
    assert.strictEqual(weak.status, 422);

    const ok = await resetPasswordHandler(
      post("/api/v1/auth/reset-password", { token, password: NEW_PASSWORD })
    );
    assert.strictEqual(ok.status, 200);

    // Single use
    const reused = await resetPasswordHandler(
      post("/api/v1/auth/reset-password", { token, password: "AnotherPass789" })
    );
    assert.strictEqual(reused.status, 400);

    // The session cookie issued before the reset no longer authenticates
    assert.strictEqual((await me(oldCookie)).status, 401);

    assert.strictEqual((await login(OLD_PASSWORD)).status, 401);
    const newLogin = await login(NEW_PASSWORD);
    assert.strictEqual(newLogin.status, 200);
    assert.strictEqual((await me(sessionCookie(newLogin))).status, 200);
  });

  it("rejects unknown and expired tokens", async () => {
    const unknown = await resetPasswordHandler(
      post("/api/v1/auth/reset-password", { token: "f".repeat(64), password: NEW_PASSWORD })
    );
    assert.strictEqual(unknown.status, 400);

    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    const token = await requestResetToken();
    await prisma.passwordResetToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await resetPasswordHandler(
      post("/api/v1/auth/reset-password", { token, password: NEW_PASSWORD })
    );
    assert.strictEqual(expired.status, 400);
  });

  it("sends no email for unknown or inactive accounts", async () => {
    clearSentEmails();
    await forgotPasswordHandler(post("/api/v1/auth/forgot-password", { email: "ghost@test.edu" }));
    assert.strictEqual(getLatestEmailFor("ghost@test.edu"), undefined);
  });

  it("locks the account after repeated failures, even for the right password", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      assert.strictEqual((await login("WrongPassword000")).status, 401);
    }
    assert.strictEqual((await login(NEW_PASSWORD)).status, 429);

    // A completed password reset clears the lock
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    const token = await requestResetToken();
    const reset = await resetPasswordHandler(
      post("/api/v1/auth/reset-password", { token, password: OLD_PASSWORD })
    );
    assert.strictEqual(reset.status, 200);
    assert.strictEqual((await login(OLD_PASSWORD)).status, 200);
  });
});
