import {
  ActivityStatus,
  MESSAGES,
  type ActivityCardDto,
  type ActivityDetailDto,
  type ActivityType,
  type ViewerRole,
} from '@sh/shared';
import { joinProblem } from './participation.rules.js';

// Activity rows → API responses. `now` is passed in so derived values are testable.

interface ActivityRow {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  startAt: Date;
  endAt: Date;
  location: string;
  participantLimit: number;
  participantCount: number;
  status: ActivityStatus;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizer: { id: string; displayName: string } | null;
}

/**
 * FR20: an Open or Full activity whose end time has passed is Completed, even if the background
 * job hasn't stored that yet.
 */
export function effectiveStatus(
  activity: { status: ActivityStatus; endAt: Date },
  now: Date,
): ActivityStatus {
  const live = activity.status === ActivityStatus.OPEN || activity.status === ActivityStatus.FULL;
  return live && activity.endAt <= now ? ActivityStatus.COMPLETED : activity.status;
}

export function toActivityCardDto(activity: ActivityRow, now: Date): ActivityCardDto {
  return {
    id: activity.id,
    title: activity.title,
    type: activity.type,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt.toISOString(),
    location: activity.location,
    openSpots: Math.max(0, activity.participantLimit - activity.participantCount),
    status: effectiveStatus(activity, now),
    organizer: activity.organizer
      ? { id: activity.organizer.id, displayName: activity.organizer.displayName }
      : { id: null, displayName: MESSAGES.deletedStudent },
  };
}

/** What the join rules need to know about the viewer besides their role (FR21d–e). */
export interface ViewerJoinContext {
  removed: boolean;
  blocked: boolean;
}

export function toActivityDetailDto(
  activity: ActivityRow,
  viewerRole: ViewerRole,
  now: Date,
  { removed, blocked }: ViewerJoinContext = { removed: false, blocked: false },
): ActivityDetailDto {
  const card = toActivityCardDto(activity, now);
  const live = card.status === ActivityStatus.OPEN || card.status === ActivityStatus.FULL;
  const notStarted = activity.startAt > now;
  const problem = joinProblem(
    { ...activity, status: card.status, viewerRole, removed, blocked },
    now,
  );
  return {
    ...card,
    description: activity.description,
    participantLimit: activity.participantLimit,
    participantCount: activity.participantCount,
    cancellationReason: activity.cancellationReason,
    viewerRole,
    // FR29: only the organizer, only while Open or Full and before the start.
    canEdit: viewerRole === 'organizer' && live && notStarted,
    // FR21: the reason is shown to students who aren't in a live activity.
    canJoin: problem === null,
    joinBlockedReason: problem && viewerRole === 'none' && live ? problem.message : null,
    // FR24: the organizer can't leave.
    canLeave: viewerRole === 'participant' && live && notStarted,
    // Turned on by later milestones: cancel (M7), report (M11).
    canCancel: false,
    canReport: false,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
