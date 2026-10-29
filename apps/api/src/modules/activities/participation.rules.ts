import { ActivityStatus, ErrorCode, MESSAGES, type ViewerRole } from '@sh/shared';

// FR21's join conditions as one pure function, so the join endpoint and the detail view's
// `canJoin` / `joinBlockedReason` can't disagree. The atomic UPDATE still re-checks the
// status, the start and the capacity when the student actually joins (ADR-0010).

export interface JoinFacts {
  /** The effective status (Completed once the end has passed, FR20). */
  status: ActivityStatus;
  startAt: Date;
  viewerRole: ViewerRole;
  /** The organizer removed this student before (FR21d, FR34). */
  removed: boolean;
  /** A block exists in either direction between the student and the organizer (FR21e). */
  blocked: boolean;
}

export interface JoinProblem {
  code: ErrorCode;
  message: string;
}

/** Open question Q12 (working assumption): generic wording that doesn't mention blocking. */
export const JOIN_NOT_ALLOWED_MESSAGE = 'You can’t join this activity.';
export const ALREADY_IN_MESSAGE = 'You’re already in this activity.';
export const STARTED_MESSAGE = 'This activity has already started.';
export const NOT_OPEN_MESSAGE = 'This activity is no longer open.';

/** The first FR21 condition that fails, or null when the student may join. */
export function joinProblem(facts: JoinFacts, now: Date): JoinProblem | null {
  if (facts.viewerRole !== 'none') {
    return { code: ErrorCode.ALREADY_PARTICIPANT, message: ALREADY_IN_MESSAGE };
  }
  if (facts.removed) {
    return {
      code: ErrorCode.REMOVED_FROM_ACTIVITY,
      message: 'The organizer removed you from this activity, so you can’t join it again.',
    };
  }
  if (facts.blocked) return { code: ErrorCode.JOIN_NOT_ALLOWED, message: JOIN_NOT_ALLOWED_MESSAGE };
  if (facts.status === ActivityStatus.CANCELLED || facts.status === ActivityStatus.COMPLETED) {
    return { code: ErrorCode.ACTIVITY_NOT_OPEN, message: NOT_OPEN_MESSAGE };
  }
  if (facts.startAt <= now) return { code: ErrorCode.ACTIVITY_STARTED, message: STARTED_MESSAGE };
  if (facts.status === ActivityStatus.FULL) {
    return { code: ErrorCode.ACTIVITY_FULL, message: MESSAGES.activityFull };
  }
  return null;
}

/** FR24, FR33: leaving and removals need an Open or Full activity that hasn't started. */
export function changeProblem(
  facts: Pick<JoinFacts, 'status' | 'startAt'>,
  now: Date,
): JoinProblem | null {
  if (facts.status !== ActivityStatus.OPEN && facts.status !== ActivityStatus.FULL) {
    return { code: ErrorCode.ACTIVITY_NOT_OPEN, message: NOT_OPEN_MESSAGE };
  }
  if (facts.startAt <= now) return { code: ErrorCode.ACTIVITY_STARTED, message: STARTED_MESSAGE };
  return null;
}
