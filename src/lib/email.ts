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
  recipientName?: string;
  fromName?: string;
  metadata?: Record<string, unknown>;
  forceDeliver?: boolean;
}

export interface MailSyncConfig {
  apiUrl?: string;
  accessKey?: string;
  from: string;
}

export type MailSyncDispatcher = (url: string, init: RequestInit) => Promise<Response>;

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

let customDispatcher: MailSyncDispatcher | null = null;

/**
 * Returns the current MailSync configuration.
 */
export function getMailSyncConfig(): MailSyncConfig {
  return {
    apiUrl: env.MAILSYNC_API_URL,
    accessKey: env.EMAIL_ACCESS_KEY,
    from: env.EMAIL_FROM,
  };
}

/**
 * Allows overriding the HTTP dispatcher for MailSync (primarily for unit testing and error simulation).
 */
export function setMailSyncDispatcher(dispatcher: MailSyncDispatcher | null): void {
  customDispatcher = dispatcher;
}

/**
 * Backwards compatibility helper for tests or legacy code expecting Resend client.
 */
export function getResendClient(): unknown {
  return env.EMAIL_ACCESS_KEY || env.RESEND_API_KEY ? { provider: "mailsync" } : null;
}

/**
 * Backwards compatibility helper for tests or legacy code expecting Resend client.
 */
export function setResendClient(client: unknown): void {
  if (!client) {
    customDispatcher = null;
    return;
  }
  const legacyMock = client as {
    emails?: {
      send?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
  };
  if (legacyMock?.emails?.send) {
    customDispatcher = async (_url, init) => {
      const body = JSON.parse(init.body as string);
      const res = await legacyMock.emails!.send!(body);
      if (res.error) {
        return new Response(JSON.stringify({ success: false, error: res.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          messageId: (res.data as { id?: string })?.id || "mock_id",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };
  }
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
        <p>Academix AI Portal Invitation</p>
      </div>
      <div class="content">
        <div class="badge">Portal Invitation</div>
        <h2 class="greeting">You're invited!</h2>
        <p class="body-text">
          You have been invited to join <strong>${schoolName}</strong> on Academix AI as a <strong>${role}</strong>.
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
          An authorized administrator at ${schoolName} issued an invitation for your account on Academix AI.
          If you believe this invitation was sent in error, please contact your school administrator.
        </p>
        <p>© ${new Date().getFullYear()} ${schoolName} via Academix AI. All rights reserved.</p>
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
 * Sends an email using MailSync API (or records it to the in-memory test queue in test mode).
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

  // Records hold live token links, so never retain them in a production process.
  if (process.env.NODE_ENV !== "production") {
    sentEmailsStore.push(record);
  }

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

  const config = getMailSyncConfig();

  // Without a configured relay (or a test dispatcher) nothing leaves the process.
  if (!customDispatcher && (!config.accessKey || !config.apiUrl)) {
    logger.warn(
      {
        emailId: id,
        to: record.to,
        subject: record.subject,
      },
      "EMAIL_ACCESS_KEY or MAILSYNC_API_URL is not configured; email was not delivered"
    );
    return { success: true, id };
  }

  try {
    const baseUrl = (config.apiUrl ?? "").replace(/\/+$/, "");
    const url = `${baseUrl}/mail`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.accessKey) {
      headers["x-access-key"] = config.accessKey;
      headers["Authorization"] = `Bearer ${config.accessKey}`;
    }

    const payload = {
      to: normalizedTo,
      email: normalizedTo,
      subject: options.subject,
      message: options.text,
      text: options.text,
      html: options.html,
      from: config.from,
      fromName: options.fromName || "Academix AI",
      name: options.recipientName,
    };

    const dispatcher = customDispatcher || fetch;
    const response = await dispatcher(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const responseData = (await response.json().catch(() => null)) as {
      success?: boolean;
      messageId?: string;
      id?: string;
      message?: string;
      error?: string;
    } | null;

    if (!response.ok || (responseData && responseData.success === false)) {
      logger.error(
        {
          emailId: id,
          to: record.to,
          subject: record.subject,
          statusCode: response.status,
          providerError: responseData?.error || responseData?.message || `HTTP ${response.status}`,
        },
        "Failed to deliver email through MailSync"
      );
      return {
        success: false,
        id,
        error: "Email delivery failed with provider",
      };
    }

    const mailSyncId = responseData?.messageId || responseData?.id || id;
    logger.info(
      {
        emailId: mailSyncId,
        to: record.to,
        subject: record.subject,
      },
      `Email successfully delivered via MailSync: ${record.subject} -> ${record.to}`
    );

    return { success: true, id: mailSyncId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      {
        emailId: id,
        to: record.to,
        subject: record.subject,
        errorMessage,
      },
      "Unexpected exception while dispatching email through MailSync"
    );

    return {
      success: false,
      id,
      error: "Unexpected error during email delivery",
    };
  }
}

/** Simple branded HTML shell shared by the registration emails. */
function renderSimpleEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:40px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </div>
</body>
</html>`;
}

/**
 * Sends the 6-digit OTP that confirms a school registrant owns their email address.
 * The OTP is a secret, so it only travels in the email body and is never logged.
 */
export async function sendRegistrationOtpEmail(options: {
  to: string;
  otp: string;
  schoolName: string;
  recipientName?: string;
  expiresInMinutes: number;
}): Promise<SendEmailResult> {
  const name = options.recipientName || "there";
  const minutes = options.expiresInMinutes;

  const text = [
    `Hello ${name},`,
    "",
    `Your verification code to register ${options.schoolName} on Academix AI is: ${options.otp}`,
    "",
    `This code expires in ${minutes} minutes. Do not share it with anyone.`,
    "If you did not try to register a school, you can ignore this email.",
    "",
    "---",
    "Academix AI School Management Platform",
  ].join("\n");

  const html = renderSimpleEmailHtml(
    "Verify your email",
    `<p style="font-size:15px;line-height:1.6;color:#334155;">Hello ${escapeHtml(name)}, use this code to finish registering <strong>${escapeHtml(options.schoolName)}</strong>.</p>
    <p style="text-align:center;margin:28px 0;font-size:32px;font-weight:800;letter-spacing:10px;color:#047857;">${escapeHtml(options.otp)}</p>
    <p style="font-size:13px;color:#64748b;">This code expires in ${minutes} minutes. Do not share it with anyone. If you did not try to register a school, ignore this email.</p>`
  );

  return sendEmail({
    to: options.to,
    subject: `Your verification code for ${options.schoolName}`,
    text,
    html,
    recipientName: options.recipientName,
    metadata: { type: "registration_otp", expiresInMinutes: minutes },
  });
}

/** Confirms that a self-registered school and its admin account are ready to use. */
export async function sendRegistrationSuccessEmail(options: {
  to: string;
  schoolName: string;
  recipientName?: string;
  loginUrl: string;
}): Promise<SendEmailResult> {
  const name = options.recipientName || "there";
  const safeUrl = escapeHtml(options.loginUrl);

  const text = [
    `Hello ${name},`,
    "",
    `${options.schoolName} has been registered on Academix AI and your admin account is ready.`,
    `Sign in with ${options.to} and the password you chose:`,
    options.loginUrl,
    "",
    "---",
    "Academix AI School Management Platform",
  ].join("\n");

  const html = renderSimpleEmailHtml(
    "Your school is registered",
    `<p style="font-size:15px;line-height:1.6;color:#334155;">Hello ${escapeHtml(name)}, <strong>${escapeHtml(options.schoolName)}</strong> has been registered and your admin account is ready.</p>
    <p style="font-size:15px;line-height:1.6;color:#334155;">Sign in with <strong>${escapeHtml(options.to)}</strong> and the password you chose.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:8px;">Sign in to your dashboard</a>
    </p>`
  );

  return sendEmail({
    to: options.to,
    subject: `${options.schoolName} is registered on Academix AI`,
    text,
    html,
    actionUrl: options.loginUrl,
    recipientName: options.recipientName,
    metadata: { type: "registration_success", schoolName: options.schoolName },
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
    `An authorized administrator at ${options.schoolName} invited you to access their Academix AI portal. If you believe this invitation was sent by mistake, please contact your school administration.`,
    "",
    "---",
    `${options.schoolName} on Academix AI`,
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
 * Sends a password reset link. The link carries a raw single-use token, so it is never logged.
 */
export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
  recipientName?: string;
  expiresInMinutes: number;
}): Promise<SendEmailResult> {
  const name = escapeHtml(options.recipientName || "there");
  const safeUrl = escapeHtml(options.resetUrl);
  const minutes = options.expiresInMinutes;

  const text = [
    `Hello ${options.recipientName || "there"},`,
    "",
    "We received a request to reset your Academix AI password. Choose a new one here:",
    options.resetUrl,
    "",
    `This link expires in ${minutes} minutes and can be used once.`,
    "If you did not ask for this, ignore this email; your password will not change.",
    "",
    "---",
    "Academix AI School Management Platform",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset your password</title></head>
<body style="margin:0;padding:40px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 16px;font-size:20px;">Reset your password</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155;">Hello ${name}, we received a request to reset your Academix AI password.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:8px;">Choose a new password</a>
    </p>
    <p style="font-size:13px;color:#64748b;">This link expires in ${minutes} minutes and can be used once. If you did not ask for this, ignore this email; your password will not change.</p>
    <p style="font-size:12px;color:#64748b;word-break:break-all;">If the button does not work, open: <a href="${safeUrl}" style="color:#047857;">${safeUrl}</a></p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: options.to,
    subject: "Reset your Academix AI password",
    text,
    html,
    actionUrl: options.resetUrl,
    recipientName: options.recipientName,
    metadata: { type: "password_reset", expiresInMinutes: minutes },
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
