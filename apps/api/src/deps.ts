import type { Mailer } from './common/email.js';
import type { Clock } from './common/time.js';
import type { PrismaClient } from './generated/prisma/client.js';

/** Collaborators shared by every module. Tests override them via createApp(overrides). */
export interface AppDeps {
  db: PrismaClient;
  mailer: Mailer;
  clock: Clock;
  /** Public URL of the web app: links in emails, and the only Origin allowed to send writes. */
  appOrigin: string;
  /** Mark the session cookie Secure (HTTPS only). On in production. */
  secureCookies: boolean;
}
