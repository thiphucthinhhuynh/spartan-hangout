import { describe, expect, it } from 'vitest';
import { issuesToFieldErrors } from '../validation.js';
import { reportListSchema, reportSchema } from './report.js';

const id = '00000000-0000-4000-8000-000000000000';

function fieldErrors(input: unknown) {
  const result = reportSchema.safeParse(input);
  return result.success ? {} : issuesToFieldErrors(result.error.issues);
}

describe('reportSchema (FR50–FR51)', () => {
  it('accepts one target and a reason; a blank description counts as none', () => {
    expect(reportSchema.parse({ targetUserId: id, reason: 'SPAM', description: '   ' })).toEqual({
      targetUserId: id,
      reason: 'SPAM',
    });
  });

  it('needs a reason from the list', () => {
    expect(fieldErrors({ targetUserId: id })).toEqual({ reason: 'Choose a reason.' });
    expect(fieldErrors({ targetUserId: id, reason: 'BORING' })).toHaveProperty('reason');
  });

  it('needs exactly one target', () => {
    expect(fieldErrors({ reason: 'SPAM' })).toHaveProperty('target');
    expect(fieldErrors({ targetUserId: id, targetActivityId: id, reason: 'SPAM' })).toHaveProperty(
      'target',
    );
  });

  it('limits the description to 500 characters', () => {
    const report = { targetActivityId: id, reason: 'OTHER' };
    expect(reportSchema.safeParse({ ...report, description: 'a'.repeat(500) }).success).toBe(true);
    expect(fieldErrors({ ...report, description: 'a'.repeat(501) })).toHaveProperty('description');
  });
});

describe('reportListSchema (FR53)', () => {
  it('filters by status when given', () => {
    expect(reportListSchema.parse({ status: 'PENDING' })).toMatchObject({ status: 'PENDING' });
    expect(reportListSchema.parse({}).status).toBeUndefined();
    expect(reportListSchema.safeParse({ status: 'NOPE' }).success).toBe(false);
  });
});
