import { describe, expect, it } from 'vitest';
import { addMinutes } from '../../common/time.js';
import {
  afterFailedLogin,
  CLEARED_LOCKOUT,
  isLocked,
  minutesLeft,
  type LockoutState,
} from './auth.lockout.js';

const start = new Date('2026-10-21T16:00:00Z');

function failTimes(times: number, state = CLEARED_LOCKOUT, at = start, stepMinutes = 1) {
  let current: LockoutState = state;
  for (let i = 0; i < times; i++)
    current = afterFailedLogin(current, addMinutes(at, i * stepMinutes));
  return current;
}

describe('login lockout (FR11)', () => {
  it('locks for 15 minutes on the fifth failure within 15 minutes', () => {
    const four = failTimes(4);
    expect(four.lockedUntil).toBeNull();

    const five = afterFailedLogin(four, addMinutes(start, 4));
    expect(five.lockedUntil).toEqual(addMinutes(start, 19));
    expect(isLocked(five, addMinutes(start, 18))).toBe(true);
    expect(isLocked(five, addMinutes(start, 19))).toBe(false);
  });

  it('does not lock when the failures are spread over more than 15 minutes', () => {
    const spread = failTimes(5, CLEARED_LOCKOUT, start, 4); // at 0, 4, 8, 12, 16 minutes
    expect(spread.lockedUntil).toBeNull();
    expect(spread.failedLoginCount).toBe(1); // the 16-minute failure starts a new window
  });

  it('resets the counter once the block has ended', () => {
    const locked = failTimes(5);
    const afterBlock = afterFailedLogin(locked, addMinutes(start, 30));
    expect(afterBlock).toMatchObject({ failedLoginCount: 1, lockedUntil: null });
  });

  it('reports the minutes left, rounded up', () => {
    expect(minutesLeft(addMinutes(start, 15), start)).toBe(15);
    expect(minutesLeft(new Date(start.getTime() + 61_000), start)).toBe(2);
  });
});
