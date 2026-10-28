import { describe, expect, it } from 'vitest';
import { issuesToFieldErrors } from '../validation.js';
import { activityCreateSchema, activityUpdateSchema } from './activity.js';

const valid = {
  title: ' Midterm Study Group ',
  description: 'Bring your notes.',
  type: 'STUDY',
  date: '2026-10-21',
  startTime: '16:00',
  endTime: '18:00',
  location: 'King Library',
  participantLimit: 8,
};

function fieldErrors(input: unknown) {
  const result = activityCreateSchema.safeParse(input);
  return result.success ? {} : issuesToFieldErrors(result.error.issues);
}

describe('activityCreateSchema (FR26–FR27)', () => {
  it('accepts a valid activity and trims text', () => {
    expect(activityCreateSchema.parse(valid).title).toBe('Midterm Study Group');
  });

  it('identifies every missing field at once', () => {
    expect(Object.keys(fieldErrors({})).sort()).toEqual([
      'date',
      'description',
      'endTime',
      'location',
      'participantLimit',
      'startTime',
      'title',
      'type',
    ]);
  });

  it('requires the end time to be later than the start time on the same date', () => {
    expect(fieldErrors({ ...valid, endTime: '16:00' }).endTime).toMatch(/later/);
    expect(fieldErrors({ ...valid, endTime: '09:00' }).endTime).toMatch(/later/);
  });

  it('limits the participants to a whole number from 2 to 100', () => {
    expect(fieldErrors({ ...valid, participantLimit: 1 }).participantLimit).toBeDefined();
    expect(fieldErrors({ ...valid, participantLimit: 101 }).participantLimit).toBeDefined();
    expect(fieldErrors({ ...valid, participantLimit: 2.5 }).participantLimit).toBeDefined();
    expect(fieldErrors({ ...valid, participantLimit: 100 })).toEqual({});
  });

  it('enforces the text lengths', () => {
    expect(fieldErrors({ ...valid, title: 'x'.repeat(101) }).title).toBeDefined();
    expect(fieldErrors({ ...valid, description: 'x'.repeat(501) }).description).toBeDefined();
    expect(fieldErrors({ ...valid, location: '   ' }).location).toBeDefined();
  });
});

describe('activityUpdateSchema (FR29–FR30)', () => {
  it('accepts any subset of fields but not an empty update', () => {
    expect(activityUpdateSchema.safeParse({ location: 'Student Union' }).success).toBe(true);
    expect(activityUpdateSchema.safeParse({}).success).toBe(false);
  });
});
