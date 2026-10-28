import { describe, expect, it } from 'vitest';
import { campusDateTimeToUtc, utcToCampusParts } from './time.js';

// US daylight saving in 2026: starts Sunday March 8 (UTC-8 → UTC-7), ends Sunday November 1.

describe('campusDateTimeToUtc (ADR-0011)', () => {
  it('uses Pacific Daylight Time (UTC-7) in October', () => {
    expect(campusDateTimeToUtc('2026-10-21', '16:00').toISOString()).toBe(
      '2026-10-21T23:00:00.000Z',
    );
  });

  it('uses Pacific Standard Time (UTC-8) in winter, crossing into the next UTC day', () => {
    expect(campusDateTimeToUtc('2026-12-02', '16:30').toISOString()).toBe(
      '2026-12-03T00:30:00.000Z',
    );
  });

  it('handles the days around the March switch', () => {
    expect(campusDateTimeToUtc('2026-03-07', '16:00').toISOString()).toBe(
      '2026-03-08T00:00:00.000Z',
    );
    expect(campusDateTimeToUtc('2026-03-08', '01:30').toISOString()).toBe(
      '2026-03-08T09:30:00.000Z',
    );
    expect(campusDateTimeToUtc('2026-03-08', '03:30').toISOString()).toBe(
      '2026-03-08T10:30:00.000Z',
    );
    expect(campusDateTimeToUtc('2026-03-09', '16:00').toISOString()).toBe(
      '2026-03-09T23:00:00.000Z',
    );
  });

  it('handles the days around the November switch', () => {
    expect(campusDateTimeToUtc('2026-10-31', '16:00').toISOString()).toBe(
      '2026-10-31T23:00:00.000Z',
    );
    expect(campusDateTimeToUtc('2026-11-01', '16:00').toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
  });
});

describe('utcToCampusParts', () => {
  it('converts back to the campus-local date, time and weekday', () => {
    expect(utcToCampusParts(new Date('2026-10-21T23:00:00Z'))).toEqual({
      date: '2026-10-21',
      time: '16:00',
      dayOfWeek: 3,
    });
    // 00:30 UTC on Dec 3 is still the evening of Wednesday Dec 2 on campus.
    expect(utcToCampusParts(new Date('2026-12-03T00:30:00Z'))).toEqual({
      date: '2026-12-02',
      time: '16:30',
      dayOfWeek: 3,
    });
  });

  it('round-trips with campusDateTimeToUtc across the year', () => {
    for (const date of ['2026-01-15', '2026-03-08', '2026-07-04', '2026-11-01', '2026-12-31']) {
      for (const time of ['00:00', '09:15', '12:00', '23:59']) {
        const parts = utcToCampusParts(campusDateTimeToUtc(date, time));
        expect([parts.date, parts.time]).toEqual([date, time]);
      }
    }
  });
});
