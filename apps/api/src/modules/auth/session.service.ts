import { LIMITS } from '@sh/shared';
import type { AuthUser } from '../../common/auth.js';
import { generateToken, hashToken } from '../../common/crypto.js';
import { MINUTE_MS } from '../../common/time.js';
import type { AppDeps } from '../../deps.js';
import { UserStatus } from '../../generated/prisma/client.js';
import * as repo from './auth.repository.js';

const IDLE_LIMIT_MS = LIMITS.sessionIdleMinutes * MINUTE_MS;
/** Writing last_seen_at on every request is wasteful; once a minute is precise enough. */
const TOUCH_INTERVAL_MS = MINUTE_MS;

/** Server-side sessions (ADR-0009, FR10). */
export function createSessionService({ db, clock }: Pick<AppDeps, 'db' | 'clock'>) {
  return {
    /** Starts a session and returns the raw token for the cookie. */
    async start(userId: string): Promise<string> {
      const token = generateToken();
      await repo.createSession(db, {
        userId,
        tokenHash: hashToken(token),
        lastSeenAt: clock.now(),
      });
      return token;
    },

    /**
     * The user behind a cookie token, or null if the session is unknown or has been idle for
     * 30 minutes (FR10). `refreshed` says the idle window was extended, so the cookie should be too.
     */
    async resolve(token: string): Promise<{ user: AuthUser; refreshed: boolean } | null> {
      const session = await repo.findSession(db, hashToken(token));
      if (!session) return null;

      const now = clock.now();
      const idleMs = now.getTime() - session.lastSeenAt.getTime();
      if (idleMs >= IDLE_LIMIT_MS) {
        await repo.deleteSession(db, session.id);
        return null;
      }
      if (session.user.status !== UserStatus.ACTIVE) return null;

      const refreshed = idleMs >= TOUCH_INTERVAL_MS;
      if (refreshed) await repo.touchSession(db, session.id, now);

      const { id, displayName, role } = session.user;
      return { user: { id, displayName, role }, refreshed };
    },

    /** Log Out (FR10). */
    async end(token: string): Promise<void> {
      await repo.deleteSessionByTokenHash(db, hashToken(token));
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
