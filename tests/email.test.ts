import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  sendEmail,
  sendVerificationEmail,
  sendInvitationEmail,
  getSentEmails,
  clearSentEmails,
  getLatestEmailFor,
  renderVerificationEmailHtml,
  renderInvitationEmailHtml,
  escapeHtml,
  getResendClient,
  setResendClient,
} from "../src/lib/email.js";
import { env } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import {
  submitSchoolRegistration,
  verifyRegistrationEmail,
  REGISTRATION_TOKEN_EXPIRY_HOURS,
} from "../src/modules/onboarding/services/school-registration.js";
import { BadRequestError } from "../src/lib/errors.js";

describe("Email Service & Resend Integration", () => {
  beforeEach(() => {
    clearSentEmails();
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

    it("renders verification email HTML with required UX elements", () => {
      const verificationUrl = "https://campuspulse.edu/register-school/verify?token=testtoken123";
      const html = renderVerificationEmailHtml({
        verificationUrl,
        schoolName: "Oakridge High",
        recipientName: "Principal Skinner",
        expiresInHours: 24,
      });

      // Verify button CTA
      assert.strictEqual(html.includes(verificationUrl), true);
      assert.strictEqual(html.includes("Verify Email Address"), true);

      // Verify recipient & school name personalization
      assert.strictEqual(html.includes("Principal Skinner"), true);
      assert.strictEqual(html.includes("Oakridge High"), true);

      // Verify expiration notice
      assert.strictEqual(html.includes("24 hours"), true);

      // Verify readable fallback link
      assert.strictEqual(html.includes("copy and paste this link"), true);

      // Verify explanation footer
      assert.strictEqual(html.includes("Why did you receive this email?"), true);
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

    it("dispatches verification email with structured payload", async () => {
      const verificationUrl = `${env.APP_URL}/register-school/verify?token=sampletoken`;
      const result = await sendVerificationEmail({
        to: "applicant@school.edu",
        verificationUrl,
        schoolName: "St. Jude Academy",
        recipientName: "Sister Mary",
        expiresInHours: 24,
      });

      assert.strictEqual(result.success, true);

      const email = getLatestEmailFor("applicant@school.edu");
      assert.notStrictEqual(email, undefined);
      assert.strictEqual(email?.subject.includes("Verify your school registration"), true);
      assert.strictEqual(email?.subject.includes("St. Jude Academy"), true);
      assert.strictEqual(email?.actionUrl, verificationUrl);
      assert.strictEqual(email?.text.includes(verificationUrl), true);
      assert.strictEqual(email?.text.includes("Why are you receiving this email?"), true);
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

  describe("Resend Provider Client & Error Handling", () => {
    it("initializes Resend client when API key is available", () => {
      const client = getResendClient();
      if (env.RESEND_API_KEY) {
        assert.notStrictEqual(client, null);
      } else {
        assert.strictEqual(client, null);
      }
    });

    it("handles simulated Resend provider error safely without exposing secrets", async () => {
      // Mock Resend client returning an API error
      const mockResend = {
        emails: {
          send: async () => ({
            data: null,
            error: {
              name: "validation_error",
              message: "Domain not verified",
            },
          }),
        },
      } as unknown as import("resend").Resend;

      setResendClient(mockResend);

      const result = await sendEmail({
        to: "user@test.org",
        subject: "Test Resend Error",
        text: "Error test",
        html: "<p>Error test</p>",
        forceDeliver: true, // Force provider execution even in test env
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "Email delivery failed with provider");
      // Ensure raw error message and API key are never leaked in returned object
      assert.strictEqual(JSON.stringify(result).includes("Domain not verified"), false);
      assert.strictEqual(
        JSON.stringify(result).includes(env.RESEND_API_KEY || "neverfound"),
        false
      );
    });

    it("handles unexpected provider exceptions gracefully", async () => {
      // Mock Resend client throwing an unhandled exception
      const throwingResend = {
        emails: {
          send: async () => {
            throw new Error("Network timeout to api.resend.com");
          },
        },
      } as unknown as import("resend").Resend;

      setResendClient(throwingResend);

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
  });

  describe("Registration Flow Token Expiration", () => {
    it("rejects verification if token has exceeded REGISTRATION_TOKEN_EXPIRY_HOURS", async () => {
      // Clean up previous test record if exists
      await prisma.schoolRegistration.deleteMany({
        where: { schoolCode: "SCH_EXPIRY_01" },
      });

      const submission = await submitSchoolRegistration({
        schoolName: "Expiry Test School",
        schoolCode: "SCH_EXPIRY_01",
        desiredSlug: "expiry-test-school",
        adminName: "Dr. Expiry",
        adminEmail: "expiry@test.org",
      });

      const rawToken = submission.rawVerificationToken;

      // Artificially age the registration createdAt beyond 24 hours
      const expiredDate = new Date(
        Date.now() - (REGISTRATION_TOKEN_EXPIRY_HOURS + 2) * 60 * 60 * 1000
      );
      await prisma.schoolRegistration.update({
        where: { id: submission.registration.id },
        data: { createdAt: expiredDate },
      });

      await assert.rejects(
        async () => {
          await verifyRegistrationEmail(rawToken);
        },
        (err: unknown) => {
          assert.ok(err instanceof BadRequestError);
          assert.strictEqual(
            (err as BadRequestError).message,
            "Verification token has expired. Please submit a new registration."
          );
          return true;
        }
      );

      // Clean up
      await prisma.schoolRegistration.deleteMany({
        where: { schoolCode: "SCH_EXPIRY_01" },
      });
    });
  });
});
