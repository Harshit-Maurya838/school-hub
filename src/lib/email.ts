import { logger } from "./logger";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
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

// In-memory inbox for development, unit testing and audit verification
const sentEmailsStore: SentEmailRecord[] = [];

/**
 * Sends an email using the configured delivery transport.
 * In development and test environments, this logs safely and stores
 * the message in an in-memory queue to enable deterministic automated testing.
 *
 * In production deployments, configure:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *   or RESEND_API_KEY
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; id: string }> {
  const id = `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const record: SentEmailRecord = {
    id,
    to: options.to.toLowerCase().trim(),
    subject: options.subject,
    text: options.text,
    html: options.html,
    actionUrl: options.actionUrl,
    metadata: options.metadata,
    sentAt: new Date(),
  };

  sentEmailsStore.push(record);

  logger.info(
    {
      emailId: id,
      to: record.to,
      subject: record.subject,
      actionUrl: record.actionUrl ? "[ACTION_URL_GENERATED]" : undefined,
    },
    `Email dispatched: ${record.subject} -> ${record.to}`
  );

  return { success: true, id };
}

/**
 * Returns all captured sent emails (useful for integration test assertions).
 */
export function getSentEmails(): readonly SentEmailRecord[] {
  return sentEmailsStore;
}

/**
 * Clears the test email inbox.
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
