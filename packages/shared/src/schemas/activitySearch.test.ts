import { describe, expect, it } from 'vitest';
import { issuesToFieldErrors } from '../validation.js';
import { activitySearchSchema, paginationSchema } from './activitySearch.js';

function fieldErrors(input: unknown) {
  const result = activitySearchSchema.safeParse(input);
  return result.success ? {} : issuesToFieldErrors(result.error.issues);
}

describe('activitySearchSchema (FR16)', () => {
  it('accepts no criteria at all, with default paging', () => {
    expect(activitySearchSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('treats empty and blank values as no criterion', () => {
    expect(
      activitySearchSchema.parse({ type: '', fromDate: '', location: '   ', page: '' }),
    ).toEqual({ page: 1, pageSize: 20 });
  });

  it('parses every criterion from query-string values', () => {
    expect(
      activitySearchSchema.parse({
        type: 'STUDY',
        fromDate: '2026-10-21',
        toDate: '2026-10-21',
        earliestStart: '16:00',
        latestStart: '16:00',
        location: ' King ',
        page: '2',
        pageSize: '10',
      }),
    ).toEqual({
      type: 'STUDY',
      fromDate: '2026-10-21',
      toDate: '2026-10-21',
      earliestStart: '16:00',
      latestStart: '16:00',
      location: 'King',
      page: 2,
      pageSize: 10,
    });
  });

  it('identifies invalid fields and reversed ranges', () => {
    expect(fieldErrors({ type: 'HIKING', fromDate: '10/21/2026', latestStart: '4pm' })).toEqual({
      type: 'Choose a category.',
      fromDate: 'Enter a valid date.',
      latestStart: 'Enter a valid time.',
    });
    expect(fieldErrors({ fromDate: '2026-10-22', toDate: '2026-10-21' })).toHaveProperty('toDate');
    expect(fieldErrors({ earliestStart: '18:00', latestStart: '09:00' })).toHaveProperty(
      'latestStart',
    );
  });
});

describe('paginationSchema', () => {
  it('limits the page size', () => {
    expect(paginationSchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: '0' }).success).toBe(false);
  });
});
