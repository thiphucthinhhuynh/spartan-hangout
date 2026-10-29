import { describe, expect, it } from 'vitest';
import { changeProblem, joinProblem, type JoinFacts } from './participation.rules.js';

const now = new Date('2026-10-21T20:00:00Z');
const open: JoinFacts = {
  status: 'OPEN',
  startAt: new Date('2026-10-21T23:00:00Z'),
  viewerRole: 'none',
  removed: false,
  blocked: false,
};
const code = (facts: Partial<JoinFacts>, at = now) => joinProblem({ ...open, ...facts }, at)?.code;

describe('joinProblem (FR21)', () => {
  it('allows an Open, upcoming activity the student is not in', () => {
    expect(joinProblem(open, now)).toBeNull();
  });

  it('names the failing condition', () => {
    expect(code({ viewerRole: 'participant' })).toBe('ALREADY_PARTICIPANT');
    expect(code({ viewerRole: 'organizer' })).toBe('ALREADY_PARTICIPANT');
    expect(code({ removed: true })).toBe('REMOVED_FROM_ACTIVITY');
    expect(code({ blocked: true })).toBe('JOIN_NOT_ALLOWED');
    expect(code({ status: 'CANCELLED' })).toBe('ACTIVITY_NOT_OPEN');
    expect(code({}, open.startAt)).toBe('ACTIVITY_STARTED');
    expect(code({ status: 'FULL' })).toBe('ACTIVITY_FULL');
  });

  it('never mentions blocking (open question Q12)', () => {
    expect(joinProblem({ ...open, blocked: true }, now)?.message).not.toMatch(/block/i);
  });

  it('reports "This activity is full." for a Full activity (FR23)', () => {
    expect(joinProblem({ ...open, status: 'FULL' }, now)?.message).toBe('This activity is full.');
  });
});

describe('changeProblem (FR24, FR33)', () => {
  it('allows Open and Full activities before the start', () => {
    expect(changeProblem(open, now)).toBeNull();
    expect(changeProblem({ ...open, status: 'FULL' }, now)).toBeNull();
    expect(changeProblem(open, open.startAt)?.code).toBe('ACTIVITY_STARTED');
    expect(changeProblem({ ...open, status: 'COMPLETED' }, now)?.code).toBe('ACTIVITY_NOT_OPEN');
  });
});
