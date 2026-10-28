import { describe, expect, it } from 'vitest';
import { toOwnProfileDto, toPublicProfileDto } from './users.mappers.js';

const row = {
  id: '6f1c2b1e-0000-4000-8000-000000000001',
  email: 'sammy.spartan@sjsu.edu',
  displayName: 'Sammy Spartan',
  interests: ['STUDY' as const, 'GAMING' as const],
  updatedAt: new Date('2026-10-21T16:00:00Z'),
  availability: [
    { dayOfWeek: 5, startMinute: 600, endMinute: 720 },
    { dayOfWeek: 1, startMinute: 960, endMinute: 1080 },
  ],
};

describe('profile mappers', () => {
  it('never puts the email in a public profile, even when given a full user row (FR04, FR13)', () => {
    const dto = toPublicProfileDto(row, [], 'none');
    expect(dto).not.toHaveProperty('email');
    expect(JSON.stringify(dto)).not.toContain('sjsu.edu');
  });

  it('marks the interests the viewer shares (FR13)', () => {
    expect(toPublicProfileDto(row, ['GAMING', 'FOOD'], 'none').interests).toEqual([
      { type: 'STUDY', shared: false },
      { type: 'GAMING', shared: true },
    ]);
  });

  it('shows the email on your own profile, with slots in HH:mm ordered by day (FR12)', () => {
    const dto = toOwnProfileDto(row);
    expect(dto.email).toBe('sammy.spartan@sjsu.edu');
    expect(dto.availability).toEqual([
      { dayOfWeek: 1, start: '16:00', end: '18:00' },
      { dayOfWeek: 5, start: '10:00', end: '12:00' },
    ]);
  });
});
