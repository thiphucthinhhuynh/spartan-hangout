import { describe, expect, it } from 'vitest';
import { effectiveStatus, toActivityDetailDto } from './activities.mappers.js';

const now = new Date('2026-10-21T20:00:00Z');
const row = {
  id: 'a1',
  title: 'Midterm Study Group',
  description: 'Bring your notes.',
  type: 'STUDY' as const,
  startAt: new Date('2026-10-21T23:00:00Z'),
  endAt: new Date('2026-10-22T01:00:00Z'),
  location: 'King Library',
  participantLimit: 8,
  participantCount: 5,
  status: 'OPEN' as const,
  cancellationReason: null,
  createdAt: now,
  updatedAt: now,
  organizer: { id: 'u1', displayName: 'Maya Chen' },
};

describe('activity mappers', () => {
  it('shows an ended Open or Full activity as Completed before the job runs (FR20)', () => {
    const later = new Date('2026-10-22T01:00:00Z');
    expect(effectiveStatus(row, later)).toBe('COMPLETED');
    expect(effectiveStatus({ ...row, status: 'FULL' }, later)).toBe('COMPLETED');
    expect(effectiveStatus({ ...row, status: 'CANCELLED' }, later)).toBe('CANCELLED');
    expect(effectiveStatus(row, now)).toBe('OPEN');
  });

  it('lets only the organizer edit, and only before the start (FR29)', () => {
    expect(toActivityDetailDto(row, 'organizer', now).canEdit).toBe(true);
    expect(toActivityDetailDto(row, 'participant', now).canEdit).toBe(false);
    expect(toActivityDetailDto(row, 'organizer', row.startAt).canEdit).toBe(false);
    expect(toActivityDetailDto({ ...row, status: 'CANCELLED' }, 'organizer', now).canEdit).toBe(
      false,
    );
  });

  it('counts open spots and names a deleted organizer "Deleted Student" (FR08, FR15)', () => {
    const dto = toActivityDetailDto({ ...row, organizer: null }, 'none', now);
    expect(dto.openSpots).toBe(3);
    expect(dto.organizer).toEqual({ id: null, displayName: 'Deleted Student' });
  });
});
