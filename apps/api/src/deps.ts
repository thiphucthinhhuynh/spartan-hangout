import type { Mailer } from './common/email.js';
import type { Clock } from './common/time.js';
import type { PrismaClient } from './generated/prisma/client.js';

/** Collaborators shared by every module. Tests override them via createApp(overrides). */
export interface AppDeps {
  db: PrismaClient;
  mailer: Mailer;
  clock: Clock;
  /** Public URL of the web app, for links in emails. */
  appOrigin: string;
}
