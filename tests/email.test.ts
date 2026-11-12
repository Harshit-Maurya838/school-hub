import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  sendEmail,
  sendRegistrationOtpEmail,
  sendRegistrationSuccessEmail,
  sendInvitationEmail,
  getSentEmails,
  clearSentEmails,
  getLatestEmailFor,
  renderInvitationEmailHtml,
  escapeHtml,
  getMailSyncConfig,
  setMailSyncDispatcher,
  getResendClient,
  setResendClient,
} from "../src/lib/email.js";
import { env } from "../src/lib/env.js";

describe("Email Service & MailSync Integration", () => {
  beforeEach(() => {
    clearSentEmails();
    setMailSyncDispatcher(null);
    setResendClient(null);
  });

  describe("HTML Template Rendering & XSS Protection", () => {
    it("escapes special characters to prevent HTML injection in emails", () => {
      const malicious = `<script>alert("xss")</script>&"test"'`;
      const escaped = escapeHtml(malicious);
      assert.strictEqual(escaped.includes("<script>"), false);
      assert.strictEqual(escaped.includes("&lt;script&gt;"), true);
      assert.strictEqual(escaped.includes("&amp;"), true);
      assert.strictEqual(escaped.includes("&quot;"), true);
    });

    it("renders invitation email HTML with role and school branding", () => {
      const invitationUrl = "https://campuspulse.edu/accept-invitation?token=invitetoken456";
      const html = renderInvitationEmailHtml({
        invitationUrl,
        schoolName: "Oakridge High",
        role: "TEACHER",
        expiresInHours: 48,
      });

      assert.strictEqual(html.includes(invitationUrl), true);
      assert.strictEqual(html.includes("Oakridge High"), true);
      assert.strictEqual(html.includes("TEACHER"), true);
      assert.strictEqual(html.includes("48 hours"), true);
      assert.strictEqual(html.includes("Accept Invitation"), true);
    });
  });

  describe("Server-side Email Dispatch & Test Inbox", () => {
    it("captures dispatched emails in in-memory test store", async () => {
      const result = await sendEmail({
        to: "teacher@oakridge.edu",
        subject: "Welcome to CampusPulse",
        text: "Plain text welcome",
        html: "<p>HTML welcome</p>",
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.id);
      assert.ok(getSentEmails().length > 0);

      const captured = getLatestEmailFor("teacher@oakridge.edu");
      assert.notStrictEqual(captured, undefined);
      assert.strictEqual(captured?.subject, "Welcome to CampusPulse");
      assert.strictEqual(captured?.to, "teacher@oakridge.edu");
    });

    it("dispatches registration OTP email with the code and escaped school name", async () => {
      const result = await sendRegistrationOtpEmail({
        to: "applicant@school.edu",
        otp: "482915",
        schoolName: "St. Jude <Academy>",
        recipientName: "Sister Mary",
        expiresInMinutes: 10,
      });

      assert.strictEqual(result.success, true);
      const email = getLatestEmailFor("applicant@school.edu");
      assert.ok(email?.subject.includes("verification code"));
      assert.ok(email?.text.includes("482915"));
      assert.ok(email?.html.includes("482915"));
      assert.ok(email?.html.includes("St. Jude &lt;Academy&gt;"));
      assert.strictEqual(email?.subject.includes("482915"), false, "OTP must not be in subject");
    });

    it("dispatches registration success email with a sign-in link", async () => {
      const loginUrl = `${env.APP_URL}/login`;
      await sendRegistrationSuccessEmail({
        to: "applicant@school.edu",
        schoolName: "St. Jude Academy",
        recipientName: "Sister Mary",
        loginUrl,
      });

      const email = getLatestEmailFor("applicant@school.edu");
      assert.ok(email?.subject.includes("St. Jude Academy is registered"));
      assert.strictEqual(email?.actionUrl, loginUrl);
      assert.ok(email?.html.includes(loginUrl));
    });

    it("dispatches invitation email with structured payload", async () => {
      const invitationUrl = `${env.APP_URL}/accept-invitation?token=sampleinvitetoken`;
      const result = await sendInvitationEmail({
        to: "math.teacher@school.edu",
        invitationUrl,
        schoolName: "St. Jude Academy",
        role: "TEACHER",
        expiresInHours: 48,
      });

      assert.strictEqual(result.success, true);

      const email = getLatestEmailFor("math.teacher@school.edu");
      assert.notStrictEqual(email, undefined);
      assert.strictEqual(email?.subject, "Invitation to join St. Jude Academy");
      assert.strictEqual(email?.actionUrl, invitationUrl);
      assert.strictEqual(email?.text.includes(invitationUrl), true);
    });
  });

  describe("MailSync Provider Client & Error Handling", () => {
    it("initializes MailSync configuration with endpoint and access key", () => {
      const config = getMailSyncConfig();
      assert.ok(config.apiUrl);
      assert.strictEqual(typeof config.apiUrl, "string");
      if (env.EMAIL_ACCESS_KEY) {
        assert.strictEqual(config.accessKey, env.EMAIL_ACCESS_KEY);
      }
    });

    it("dispatches email to MailSync successfully with mock dispatcher", async () => {
      let capturedUrl = "";
      let capturedBody: Record<string, unknown> = {};

      setMailSyncDispatcher(async (url, init) => {
        capturedUrl = url;
        capturedBody = JSON.parse(init.body as string);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Email sent successfully",
            messageId: "mock_ms_123456",
            recipient: "teacher@oakridge.edu",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const result = await sendEmail({
        to: "teacher@oakridge.edu",
        subject: "Welcome to MailSync",
        text: "Plain text body",
        html: "<p>HTML body</p>",
        forceDeliver: true,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.id, "mock_ms_123456");
      assert.ok(capturedUrl.endsWith("/mail"));
      assert.strictEqual(capturedBody.email, "teacher@oakridge.edu");
      assert.strictEqual(capturedBody.to, "teacher@oakridge.edu");
      assert.strictEqual(capturedBody.subject, "Welcome to MailSync");
    });

    it("handles simulated MailSync provider error safely without exposing secrets", async () => {
      // Mock MailSync dispatcher returning a 401/400 provider error
      setMailSyncDispatcher(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized",
            message: "Invalid or missing Access Key",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const result = await sendEmail({
        to: "user@test.org",
        subject: "Test MailSync Error",
        text: "Error test",
        html: "<p>Error test</p>",
        forceDeliver: true, // Force provider execution even in test env
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "Email delivery failed with provider");
      // Ensure raw error message and API key are never leaked in returned object
      assert.strictEqual(JSON.stringify(result).includes("Invalid or missing Access Key"), false);
      assert.strictEqual(
        JSON.stringify(result).includes(env.EMAIL_ACCESS_KEY || "neverfound"),
        false
      );
    });

    it("handles unexpected provider exceptions gracefully", async () => {
      // Mock MailSync dispatcher throwing an unhandled network error
      setMailSyncDispatcher(async () => {
        throw new Error("Network timeout to mailsync-sigma.vercel.app");
      });

      const result = await sendEmail({
        to: "user@test.org",
        subject: "Test Exception",
        text: "Exception test",
        html: "<p>Exception test</p>",
        forceDeliver: true,
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "Unexpected error during email delivery");
    });

    it("maintains backwards compatibility for legacy resend adapter mocks", async () => {
      assert.ok(getResendClient());
      const mockLegacyResend = {
        emails: {
          send: async () => ({
            data: { id: "legacy_resend_id_999" },
            error: null,
          }),
        },
      };

      setResendClient(mockLegacyResend);

      const result = await sendEmail({
        to: "legacy@test.org",
        subject: "Legacy Adapter Test",
        text: "Legacy text",
        html: "<p>Legacy html</p>",
        forceDeliver: true,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.id, "legacy_resend_id_999");
    });
  });
});
