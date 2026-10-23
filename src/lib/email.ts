import { Resend } from "resend";
import { env } from "./env";
import { logger } from "./logger";

if (typeof window !== "undefined") {
  throw new Error("The email service can only be executed on the server.");
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  forceDeliver?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  id: string;
  error?: string;
}

export interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  sentAt: Date;
}

export interface SendVerificationEmailOptions {
  to: string;
  verificationUrl: string;
  schoolName?: string;
  recipientName?: string;
  expiresInHours?: number;
  metadata?: Record<string, unknown>;
  forceDeliver?: boolean;
}

export interface SendInvitationEmailOptions {
  to: string;
  invitationUrl: string;
  schoolName: string;
  role: string;
  expiresInHours?: number;
  metadata?: Record<string, unknown>;
  forceDeliver?: boolean;
}

// In-memory queue for tests, development, and audit verification
const sentEmailsStore: SentEmailRecord[] = [];

let resendInstance: Resend | null = null;

/**
 * Lazily initializes and returns the Resend client instance.
 * Returns null if RESEND_API_KEY is not configured.
 */
export function getResendClient(): Resend | null {
  if (resendInstance) {
    return resendInstance;
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  resendInstance = new Resend(apiKey.trim());
  return resendInstance;
}

/**
 * Allows overriding or resetting the Resend client for unit testing or custom configurations.
 */
export function setResendClient(client: Resend | null): void {
  resendInstance = client;
}

/**
 * Escapes characters for safe inclusion in HTML templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders a clean, responsive HTML email for school registration verification.
 */
export function renderVerificationEmailHtml(params: {
  verificationUrl: string;
  schoolName?: string;
  recipientName?: string;
  expiresInHours?: number;
}): string {
  const schoolName = params.schoolName ? escapeHtml(params.schoolName) : "CampusPulse";
  const recipientName = params.recipientName ? escapeHtml(params.recipientName) : "Administrator";
  const hours = params.expiresInHours || 24;
  const safeUrl = escapeHtml(params.verificationUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your school registration</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #fafafa;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #09090b;
      padding: 40px 16px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #18181b;
      border-radius: 16px;
      border: 1px solid #27272a;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      padding: 32px;
      text-align: center;
      border-bottom: 1px solid #3730a3;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 6px 0 0;
      color: #c7d2fe;
      font-size: 13px;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      background-color: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px;
    }
    .body-text {
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d8;
      margin-bottom: 24px;
    }
    .callout {
      background-color: #27272a;
      border-left: 4px solid #6366f1;
      padding: 14px 18px;
      border-radius: 6px;
      margin-bottom: 28px;
      font-size: 13px;
      color: #e4e4e7;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    }
    .fallback-container {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #27272a;
    }
    .fallback-text {
      font-size: 13px;
      color: #a1a1aa;
      margin: 0 0 8px;
    }
    .fallback-link {
      background-color: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 12px;
      font-size: 12px;
      word-break: break-all;
      color: #818cf8;
    }
    .fallback-link a {
      color: #818cf8;
      text-decoration: underline;
    }
    .footer {
      border-top: 1px solid #27272a;
      background-color: #121215;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #71717a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>CampusPulse</h1>
        <p>School Management Platform</p>
      </div>
      <div class="content">
        <div class="badge">Verification Required</div>
        <h2 class="greeting">Hello, ${recipientName}</h2>
        <p class="body-text">
          Thank you for submitting a registration application for <strong>${schoolName}</strong> on CampusPulse.
          To confirm that you own this contact email address, please verify your account using the button below.
        </p>
        <div class="callout">
          ⏱️ This verification link is strictly single-use and will expire in <strong>${hours} hours</strong>.
        </div>
        <div class="btn-container">
          <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
        </div>
        <div class="fallback-container">
          <p class="fallback-text">
            If the button above does not work, copy and paste this link into your web browser:
          </p>
          <div class="fallback-link">
            <a href="${safeUrl}">${safeUrl}</a>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>
          <strong>Why did you receive this email?</strong><br>
          This verification message was sent because someone registered an institution using this email address on CampusPulse.
          If this wasn't you, no further action is needed and you can safely ignore this email.
        </p>
        <p>© ${new Date().getFullYear()} CampusPulse. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders a clean, responsive HTML email for inviting faculty, parents, or staff.
 */
export function renderInvitationEmailHtml(params: {
  invitationUrl: string;
  schoolName: string;
  role: string;
  expiresInHours?: number;
}): string {
  const schoolName = escapeHtml(params.schoolName);
  const role = escapeHtml(params.role);
  const hours = params.expiresInHours || 48;
  const safeUrl = escapeHtml(params.invitationUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${schoolName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #fafafa;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #09090b;
      padding: 40px 16px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #18181b;
      border-radius: 16px;
      border: 1px solid #27272a;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      padding: 32px;
      text-align: center;
      border-bottom: 1px solid #3730a3;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 6px 0 0;
      color: #c7d2fe;
      font-size: 13px;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      background-color: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px;
    }
    .body-text {
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d8;
      margin-bottom: 24px;
    }
    .callout {
      background-color: #27272a;
      border-left: 4px solid #6366f1;
      padding: 14px 18px;
      border-radius: 6px;
      margin-bottom: 28px;
      font-size: 13px;
      color: #e4e4e7;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    }
    .fallback-container {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #27272a;
    }
    .fallback-text {
      font-size: 13px;
      color: #a1a1aa;
      margin: 0 0 8px;
    }
    .fallback-link {
      background-color: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 12px;
      font-size: 12px;
      word-break: break-all;
      color: #818cf8;
    }
    .fallback-link a {
      color: #818cf8;
      text-decoration: underline;
    }
    .footer {
      border-top: 1px solid #27272a;
      background-color: #121215;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #71717a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>${schoolName}</h1>
        <p>CampusPulse Portal Invitation</p>
      </div>
      <div class="content">
        <div class="badge">Portal Invitation</div>
        <h2 class="greeting">You're invited!</h2>
        <p class="body-text">
          You have been invited to join <strong>${schoolName}</strong> on CampusPulse as a <strong>${role}</strong>.
          Activate your account to access your personalized dashboard and academic tools.
        </p>
        <div class="callout">
          ⏱️ This invitation link will expire in <strong>${hours} hours</strong>.
        </div>
        <div class="btn-container">
          <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Accept Invitation & Set Password</a>
        </div>
        <div class="fallback-container">
          <p class="fallback-text">
            If the button above does not work, copy and paste this link into your web browser:
          </p>
          <div class="fallback-link">
            <a href="${safeUrl}">${safeUrl}</a>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>
          <strong>Why did you receive this email?</strong><br>
          An authorized administrator at ${schoolName} issued an invitation for your account on CampusPulse.
          If you believe this invitation was sent in error, please contact your school administrator.
        </p>
        <p>© ${new Date().getFullYear()} ${schoolName} via CampusPulse. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function isTestEnvironment(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  if (process.execArgv.some((arg) => arg.includes("--test"))) return true;
  if (
    process.argv.some(
      (arg) =>
        arg.includes("--test") ||
        arg.includes("tests/") ||
        arg.endsWith(".test.ts") ||
        arg.endsWith(".test.js")
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Sends an email using Resend (or records it to the in-memory test queue in test mode).
 * Safely handles errors without exposing API keys or provider response details.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const normalizedTo = options.to.toLowerCase().trim();
  const id = `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const record: SentEmailRecord = {
    id,
    to: normalizedTo,
    subject: options.subject,
    text: options.text,
    html: options.html,
    actionUrl: options.actionUrl,
    metadata: options.metadata,
    sentAt: new Date(),
  };

  sentEmailsStore.push(record);

  const isTestEnv = isTestEnvironment() && !options.forceDeliver;

  if (isTestEnv) {
    logger.info(
      {
        emailId: id,
        to: record.to,
        subject: record.subject,
        actionUrl: record.actionUrl ? "[ACTION_URL_GENERATED]" : undefined,
      },
      `Email dispatched (test in-memory): ${record.subject} -> ${record.to}`
    );
    return { success: true, id };
  }

  const resend = getResendClient();

  if (!resend) {
    logger.warn(
      {
        emailId: id,
        to: record.to,
        subject: record.subject,
      },
      "RESEND_API_KEY is not configured; email saved to in-memory store only"
    );
    return { success: true, id };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [normalizedTo],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      logger.error(
        {
          emailId: id,
          to: record.to,
          subject: record.subject,
          resendErrorCode: error.name,
          resendErrorMessage: error.message,
        },
        "Failed to deliver email through Resend"
      );
      return {
        success: false,
        id,
        error: "Email delivery failed with provider",
      };
    }

    const resendId = data?.id || id;
    logger.info(
      {
        emailId: resendId,
        to: record.to,
        subject: record.subject,
      },
      `Email successfully delivered via Resend: ${record.subject} -> ${record.to}`
    );

    return { success: true, id: resendId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      {
        emailId: id,
        to: record.to,
        subject: record.subject,
        errorMessage,
      },
      "Unexpected exception while dispatching email through Resend"
    );

    return {
      success: false,
      id,
      error: "Unexpected error during email delivery",
    };
  }
}

/**
 * Reusable function for sending verification emails with rich HTML and plain-text fallback.
 */
export async function sendVerificationEmail(
  options: SendVerificationEmailOptions
): Promise<SendEmailResult> {
  const schoolName = options.schoolName || "CampusPulse";
  const subject = options.schoolName
    ? `Verify your school registration for ${options.schoolName}`
    : "Verify your email address for CampusPulse";

  const hours = options.expiresInHours || 24;
  const html = renderVerificationEmailHtml({
    verificationUrl: options.verificationUrl,
    schoolName: options.schoolName,
    recipientName: options.recipientName,
    expiresInHours: hours,
  });

  const text = [
    `Hello ${options.recipientName || "there"},`,
    "",
    `Thank you for registering ${schoolName} on CampusPulse.`,
    "",
    "To verify your email address and continue with your registration, please visit the following link:",
    options.verificationUrl,
    "",
    `This verification link will expire in ${hours} hours.`,
    "",
    "Why are you receiving this email?",
    `You are receiving this email because someone submitted a registration request for ${schoolName} using this email address. If you did not make this request, you can safely ignore this email.`,
    "",
    "---",
    "CampusPulse School Management Platform",
  ].join("\n");

  return sendEmail({
    to: options.to,
    subject,
    text,
    html,
    actionUrl: options.verificationUrl,
    metadata: {
      ...options.metadata,
      type: "email_verification",
      schoolName: options.schoolName,
      expiresInHours: hours,
    },
    forceDeliver: options.forceDeliver,
  });
}

/**
 * Reusable function for sending account invitations with rich HTML and plain-text fallback.
 */
export async function sendInvitationEmail(
  options: SendInvitationEmailOptions
): Promise<SendEmailResult> {
  const subject = `Invitation to join ${options.schoolName}`;
  const hours = options.expiresInHours || 48;

  const html = renderInvitationEmailHtml({
    invitationUrl: options.invitationUrl,
    schoolName: options.schoolName,
    role: options.role,
    expiresInHours: hours,
  });

  const text = [
    `You have been invited to join ${options.schoolName} as a ${options.role}.`,
    "",
    "Complete your account setup and choose your password here:",
    options.invitationUrl,
    "",
    `This invitation link will expire in ${hours} hours.`,
    "",
    "Why did you receive this email?",
    `An authorized administrator at ${options.schoolName} invited you to access their CampusPulse portal. If you believe this invitation was sent by mistake, please contact your school administration.`,
    "",
    "---",
    `${options.schoolName} on CampusPulse`,
  ].join("\n");

  return sendEmail({
    to: options.to,
    subject,
    text,
    html,
    actionUrl: options.invitationUrl,
    metadata: {
      ...options.metadata,
      type: "account_invitation",
      schoolName: options.schoolName,
      role: options.role,
      expiresInHours: hours,
    },
    forceDeliver: options.forceDeliver,
  });
}

/**
 * Returns all captured sent emails (useful for integration test assertions).
 */
export function getSentEmails(): readonly SentEmailRecord[] {
  return sentEmailsStore;
}

/**
 * Clears the in-memory email store.
 */
export function clearSentEmails(): void {
  sentEmailsStore.length = 0;
}

/**
 * Retrieves the most recent email sent to a specific address.
 */
export function getLatestEmailFor(email: string): SentEmailRecord | undefined {
  const normalized = email.toLowerCase().trim();
  const matches = sentEmailsStore.filter((e) => e.to === normalized);
  return matches[matches.length - 1];
}
