import nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

interface MailerConfig {
  SMTP_HOST?: string | undefined;
  SMTP_PORT: number;
  SMTP_USER?: string | undefined;
  SMTP_PASS?: string | undefined;
  EMAIL_FROM: string;
}

/** SMTP when SMTP_HOST is set (production); otherwise prints emails to the API console. */
export function createMailer(config: MailerConfig): Mailer {
  if (!config.SMTP_HOST) return consoleMailer;

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });
  return {
    async send(message) {
      await transport.sendMail({ from: config.EMAIL_FROM, ...message });
    },
  };
}

const consoleMailer: Mailer = {
  async send({ to, subject, text }) {
    console.log(
      `\n──── Email (not sent: SMTP_HOST is empty) ────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n──────────────────────────────────────────────\n`,
    );
  },
};

/** Escapes text for safe inclusion in an HTML email. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
