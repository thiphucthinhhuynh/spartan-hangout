import { describe, expect, it } from 'vitest';
import { formatDateTime, formatTimeOfDay, initials } from './format.js';

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
