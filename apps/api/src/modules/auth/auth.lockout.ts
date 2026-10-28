import { LIMITS } from '@sh/shared';
import { addMinutes, MINUTE_MS } from '../../common/time.js';

// FR11: block login attempts for 15 minutes after five consecutive failed attempts within
// 15 minutes. A successful login, or the end of the block, resets the counter.

export interface LockoutState {
  failedLoginCount: number;
  firstFailedLoginAt: Date | null;
  lockedUntil: Date | null;
}

export const CLEARED_LOCKOUT: LockoutState = {
  failedLoginCount: 0,
  firstFailedLoginAt: null,
  lockedUntil: null,
};

const { attempts, windowMinutes, lockMinutes } = LIMITS.lockout;

export function isLocked(state: LockoutState, now: Date): boolean {
  return state.lockedUntil !== null && now < state.lockedUntil;
}

/** The state to store after a wrong password at `now` (only called when not locked). */
export function afterFailedLogin(state: LockoutState, now: Date): LockoutState {
  const blockEnded = state.lockedUntil !== null && now >= state.lockedUntil;
  const windowEnded =
    state.firstFailedLoginAt === null ||
    now.getTime() - state.firstFailedLoginAt.getTime() >= windowMinutes * MINUTE_MS;
  const startOver = blockEnded || windowEnded;

  const failedLoginCount = startOver ? 1 : state.failedLoginCount + 1;
  return {
    failedLoginCount,
    firstFailedLoginAt: startOver ? now : state.firstFailedLoginAt,
    lockedUntil: failedLoginCount >= attempts ? addMinutes(now, lockMinutes) : null,
  };
}

/** Whole minutes left in the block, for the message shown to the student. */
export function minutesLeft(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / MINUTE_MS));
}
