import { describe, expect, it } from 'vitest';
import {
  formatActivityDay,
  formatActivityTimes,
  formatCardWhen,
  formatDateTime,
  formatDuration,
  formatOpenSpots,
  formatShortDate,
  formatTimeOfDay,
  initials,
} from './format.js';

describe('format helpers', () => {
  it('formats 24-hour times as 12-hour', () => {
    expect(formatTimeOfDay('00:05')).toBe('12:05 AM');
    expect(formatTimeOfDay('12:00')).toBe('12:00 PM');
    expect(formatTimeOfDay('16:30')).toBe('4:30 PM');
  });

  it('shows instants in campus time (America/Los_Angeles)', () => {
    expect(formatDateTime('2026-10-21T23:00:00Z')).toBe('Oct 21, 2026, 4:00 PM');
  });

  it('makes avatar initials from the first and last word', () => {
    expect(initials('Maya Chen')).toBe('MC');
    expect(initials('  sammy  ')).toBe('S');
    expect(initials('Ana de la Cruz')).toBe('AC');
  });
});

describe('activity formatting (mockup p.4)', () => {
  it('formats the day and time range in campus time', () => {
    expect(formatActivityDay('2026-10-21T23:00:00Z')).toBe('Wednesday, October 21, 2026');
    expect(formatActivityTimes('2026-10-21T23:00:00Z', '2026-10-22T01:00:00Z')).toBe(
      '4:00 PM – 6:00 PM · 2 hours',
    );
  });

  it('formats durations and open spots', () => {
    expect(formatDuration(60)).toBe('1 hour');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatOpenSpots(3)).toBe('3 spots left');
    expect(formatOpenSpots(1)).toBe('1 spot left');
    expect(formatOpenSpots(0)).toBe('No spots left');
  });

  it('formats activity cards and search dates', () => {
    expect(formatCardWhen('2026-10-21T23:00:00Z', '2026-10-22T01:00:00Z')).toBe(
      'Wed, Oct 21 · 4:00 PM – 6:00 PM',
    );
    expect(formatShortDate('2026-10-22')).toBe('Oct 22');
  });
});
