import type { NotificationDto } from '@sh/shared';
import { describe, expect, it } from 'vitest';
import { describeNotification } from './describe.js';

const base: NotificationDto = {
  id: 'n1',
  type: 'ACTIVITY_CANCELLED',
  activityId: 'a1',
  activityTitle: 'Midterm Study Group',
  conversationUserId: null,
  body: 'Library closed',
  createdAt: '2026-10-21T16:00:00Z',
  read: false,
};

describe('describeNotification', () => {
  it('names the activity, gives the reason and links to the activity', () => {
    expect(describeNotification(base)).toEqual({
      title: 'Midterm Study Group was cancelled',
      detail: 'Reason: Library closed',
      link: '/activities/a1',
    });
  });

  it('leaves out a missing reason and a deleted activity’s link', () => {
    const removed = {
      ...base,
      type: 'REMOVED_FROM_ACTIVITY' as const,
      body: null,
      activityId: null,
    };
    expect(describeNotification(removed)).toEqual({
      title: 'You were removed from Midterm Study Group',
      detail: null,
      link: null,
    });
  });

  it('shows who joined', () => {
    const joined = { ...base, type: 'PARTICIPANT_JOINED' as const, body: 'Sammy Spartan joined.' };
    expect(describeNotification(joined).title).toBe('Sammy Spartan joined.');
  });
});
