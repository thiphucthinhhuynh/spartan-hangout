import {
  ErrorCode,
  LIMITS,
  timeToMinutes,
  type LoginInput,
  type MeDto,
  type MessageResponse,
  type RegisterInput,
} from '@sh/shared';
import { generateToken, hashToken } from '../../common/crypto.js';
import { AppError, ConflictError, NotFoundError } from '../../common/errors.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../common/password.js';
import { addHours } from '../../common/time.js';
import type { AppDeps } from '../../deps.js';
import { Prisma, UserStatus } from '../../generated/prisma/client.js';
import { verificationEmail } from './auth.emails.js';
import { afterFailedLogin, CLEARED_LOCKOUT, isLocked, minutesLeft } from './auth.lockout.js';
import * as repo from './auth.repository.js';
import type { SessionService } from './session.service.js';

const INVALID_LINK_MESSAGE = 'This verification link is invalid or has already been used.';

export function createAuthService(
  { db, mailer, clock, appOrigin }: AppDeps,
  sessions: SessionService,
) {
  /** Stores a fresh link for the user (replacing unused ones) and returns the raw token. */
  async function issueVerificationToken(client: Prisma.TransactionClient, userId: string) {
    const token = generateToken();
    await repo.deleteUnusedVerificationTokens(client, userId);
    await repo.createVerificationToken(client, {
      userId,
      tokenHash: hashToken(token),
      expiresAt: addHours(clock.now(), LIMITS.verificationLinkHours),
    });
    return token;
  }

  /** The account already exists, so a failed send is logged; the student can request a new link. */
  async function sendVerificationEmail(email: string, displayName: string, token: string) {
    const link = `${appOrigin}/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await mailer.send(verificationEmail(email, displayName, link));
    } catch (err) {
      console.error(`Could not send the verification email to ${email}:`, err);
    }
  }

  return {
    /** FR01–FR03: create an inactive account and email a verification link. */
    async register(input: RegisterInput): Promise<MessageResponse> {
      const existing = await repo.findUserByEmail(db, input.email);
      if (existing) throw emailTaken(existing.status);

      const passwordHash = await hashPassword(input.password);
      let token: string;
      try {
        token = await db.$transaction(async (tx) => {
          const user = await repo.createPendingUser(tx, {
            email: input.email,
            passwordHash,
            displayName: input.displayName,
            interests: input.interests,
            availability: input.availability.map((slot) => ({
              dayOfWeek: slot.dayOfWeek,
              startMinute: timeToMinutes(slot.start),
              endMinute: timeToMinutes(slot.end),
            })),
          });
          return issueVerificationToken(tx, user.id);
        });
      } catch (err) {
        // Two registrations for the same email at the same moment: the unique index decides.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw emailTaken(UserStatus.PENDING_VERIFICATION);
        }
        throw err;
      }

      await sendVerificationEmail(input.email, input.displayName, token);
      return {
        message: `We sent a verification link to ${input.email}. It expires in ${LIMITS.verificationLinkHours} hours.`,
      };
    },

    /** FR03–FR04: a valid, unused, unexpired link activates the account. */
    async verifyEmail(token: string): Promise<MessageResponse> {
      const record = await repo.findVerificationToken(db, hashToken(token));
      if (!record || record.usedAt) throw new NotFoundError(INVALID_LINK_MESSAGE);

      const now = clock.now();
      if (record.expiresAt <= now) {
        throw new AppError(
          410,
          ErrorCode.TOKEN_EXPIRED,
          'This verification link has expired. Request a new one below.',
        );
      }

      await db.$transaction(async (tx) => {
        const consumed = await repo.consumeVerificationToken(tx, record.id, now);
        if (!consumed) throw new NotFoundError(INVALID_LINK_MESSAGE);
        await repo.activateUser(tx, record.userId);
      });
      return { message: 'Your SJSU email is verified. Your account is active.' };
    },

    /** FR03: request a new link. The response is the same whether or not the email has an account. */
    async resendVerification(email: string): Promise<MessageResponse> {
      const user = await repo.findUserByEmail(db, email);
      if (user?.status === UserStatus.PENDING_VERIFICATION) {
        const token = await db.$transaction((tx) => issueVerificationToken(tx, user.id));
        await sendVerificationEmail(user.email, user.displayName, token);
      }
      return {
        message: `If ${email} has an account waiting for verification, we sent it a new link.`,
      };
    },

    /**
     * FR09–FR11: check the password, enforce the lockout, and start a session.
     * Returns the raw session token for the cookie.
     */
    async login(input: LoginInput): Promise<{ user: MeDto; token: string }> {
      const now = clock.now();
      const user = await repo.findUserForLogin(db, input.email);
      if (!user) {
        // Same work and same answer as a wrong password (FR09). Unknown emails are not
        // counted toward a lockout (open question Q16).
        await verifyAgainstDummy(input.password);
        throw invalidCredentials();
      }

      if (user.lockedUntil && isLocked(user, now)) throw accountLocked(user.lockedUntil, now);

      if (!(await verifyPassword(user.passwordHash, input.password))) {
        const next = afterFailedLogin(user, now);
        await repo.saveLockoutState(db, user.id, next);
        throw next.lockedUntil ? accountLocked(next.lockedUntil, now) : invalidCredentials();
      }

      // Correct password: a successful attempt resets the counter (FR11).
      if (user.failedLoginCount > 0 || user.lockedUntil) {
        await repo.saveLockoutState(db, user.id, CLEARED_LOCKOUT);
      }
      // Checked only after the password, so this does not reveal unverified accounts (FR09).
      if (user.status !== UserStatus.ACTIVE) {
        throw new AppError(
          403,
          ErrorCode.EMAIL_NOT_VERIFIED,
          'Verify your SJSU email before logging in. Check your inbox or request a new link.',
        );
      }

      const token = await sessions.start(user.id);
      return { user: { id: user.id, displayName: user.displayName, role: user.role }, token };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

/** FR09: never say whether the email or the password was wrong. */
function invalidCredentials() {
  return new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Incorrect email or password.');
}

/** FR11 (open question Q16: a locked account is told so). */
function accountLocked(lockedUntil: Date, now: Date) {
  const minutes = minutesLeft(lockedUntil, now);
  return new AppError(
    423,
    ErrorCode.ACCOUNT_LOCKED,
    `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
  );
}

/** FR01 (with open question Q15: a pending account counts as "already linked"). */
function emailTaken(status: UserStatus) {
  return new ConflictError(
    ErrorCode.EMAIL_TAKEN,
    status === UserStatus.PENDING_VERIFICATION
      ? 'An account with this email is waiting for verification. Check your inbox or request a new link.'
      : 'An account with this email already exists.',
  );
}
