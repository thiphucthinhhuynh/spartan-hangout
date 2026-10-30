import {
  ActivityStatus,
  activityCreateSchema,
  campusDateTimeToUtc,
  ErrorCode,
  issuesToFieldErrors,
  NotificationType,
  START_IN_PAST_MESSAGE,
  utcToCampusParts,
  type ActivityCardDto,
  type ActivityCreateInput,
  type ActivityDetailDto,
  type ActivitySearchInput,
  type ActivityUpdateInput,
  type MyActivitiesInput,
  type Paged,
  type PaginationInput,
  type ViewerRole,
} from '@sh/shared';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors.js';
import { isBlockedEitherWay } from '../../common/relationships.js';
import type { AppDeps } from '../../deps.js';
import { createNotifications } from '../notifications/notifications.service.js';
import * as repo from './activities.repository.js';
import { effectiveStatus, toActivityCardDto, toActivityDetailDto } from './activities.mappers.js';
import { changeProblem } from './participation.rules.js';

const ACTIVITY_NOT_FOUND = 'We couldn’t find that activity.';

/** Fields whose change notifies participants (FR40a). Description and limit don't. */
const NOTIFY_FIELDS = ['title', 'type', 'date', 'startTime', 'endTime', 'location'] as const;
const FIELD_LABELS: Record<(typeof NOTIFY_FIELDS)[number], string> = {
  title: 'title',
  type: 'category',
  date: 'date',
  startTime: 'start time',
  endTime: 'end time',
  location: 'location',
};

/** Form values → stored values: campus-local date and times become UTC instants (ADR-0011). */
function toStoredValues(input: ActivityCreateInput): repo.ActivityValues {
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    startAt: campusDateTimeToUtc(input.date, input.startTime),
    endAt: campusDateTimeToUtc(input.date, input.endTime),
    location: input.location,
    participantLimit: input.participantLimit,
  };
}

/** A stored activity as form values, for merging an edit. */
function toFormValues(activity: repo.ActivityValues): ActivityCreateInput {
  const start = utcToCampusParts(activity.startAt);
  return {
    title: activity.title,
    description: activity.description,
    type: activity.type,
    date: start.date,
    startTime: start.time,
    endTime: utcToCampusParts(activity.endAt).time,
    location: activity.location,
    participantLimit: activity.participantLimit,
  };
}

export function createActivityService({ db, clock }: Pick<AppDeps, 'db' | 'clock'>) {
  async function loadForViewer(activityId: string, viewerId: string) {
    const activity = await repo.findActivityForViewer(db, activityId, viewerId);
    if (!activity) throw new NotFoundError(ACTIVITY_NOT_FOUND);
    const participation = activity.participations[0];
    const viewerRole: ViewerRole = participation
      ? participation.isOrganizer
        ? 'organizer'
        : 'participant'
      : 'none';
    // FR21d–e, only needed for students who could still join.
    const removed = activity.removals.length > 0;
    const blocked =
      viewerRole === 'none' && activity.organizerId !== null
        ? await isBlockedEitherWay(db, viewerId, activity.organizerId)
        : false;
    return { activity, viewerRole, joinContext: { removed, blocked } };
  }

  async function getDetail(viewerId: string, activityId: string): Promise<ActivityDetailDto> {
    const now = clock.now();
    const { activity, viewerRole, joinContext } = await loadForViewer(activityId, viewerId);
    // FR20, FR32: Completed and Cancelled activities stay viewable only by their own members.
    const status = effectiveStatus(activity, now);
    const ended = status === ActivityStatus.COMPLETED || status === ActivityStatus.CANCELLED;
    if (ended && viewerRole === 'none') throw new NotFoundError(ACTIVITY_NOT_FOUND);
    return toActivityDetailDto(activity, viewerRole, now, joinContext);
  }

  /** Fetches one row past the page to know whether there is more (docs/api.md: "Lists"). */
  async function pageOfCards(
    { page, pageSize }: PaginationInput,
    findIds: (window: repo.PageWindow) => Promise<string[]>,
  ): Promise<Paged<ActivityCardDto>> {
    const now = clock.now();
    const ids = await findIds({ limit: pageSize + 1, offset: (page - 1) * pageSize });
    const rows = await repo.findActivitiesInOrder(db, ids.slice(0, pageSize));
    return {
      items: rows.map((row) => toActivityCardDto(row, now)),
      page,
      pageSize,
      hasMore: ids.length > pageSize,
    };
  }

  return {
    getDetail,
    loadForViewer,

    /** "My plans" (FR18 entry point): joined or organizing, upcoming or past. */
    mine(viewerId: string, { page, pageSize, role, when }: MyActivitiesInput) {
      return pageOfCards({ page, pageSize }, async (window) => {
        const rows = await repo.findMyActivities(db, viewerId, { role, when }, clock.now(), window);
        return rows.map((row) => row.id);
      });
    },

    /** FR16–FR17: every given criterion applies; with none, every activity FR17 allows. */
    search(viewerId: string, { page, pageSize, ...criteria }: ActivitySearchInput) {
      return pageOfCards({ page, pageSize }, (window) =>
        repo.searchActivityIds(db, viewerId, criteria, clock.now(), window),
      );
    },

    /** FR14–FR15: the viewer's Recommended list, soonest first. */
    recommended(viewerId: string, paging: PaginationInput) {
      return pageOfCards(paging, (window) =>
        repo.recommendedActivityIds(db, viewerId, clock.now(), window),
      );
    },

    /** FR26–FR28: create an Open activity with the organizer as its first participant. */
    async create(organizerId: string, input: ActivityCreateInput): Promise<ActivityDetailDto> {
      const now = clock.now();
      const values = toStoredValues(input);
      if (values.startAt <= now) throw new ValidationError({ startTime: START_IN_PAST_MESSAGE });

      const { id } = await repo.insertActivity(db, organizerId, values, now);
      return getDetail(organizerId, id);
    },

    /**
     * FR31–FR32, FR40b: the organizer cancels an Open or Full activity before it starts. It can't
     * be undone; every other participant is notified, with the reason if one was given.
     */
    async cancel(
      viewerId: string,
      activityId: string,
      reason: string | undefined,
    ): Promise<ActivityDetailDto> {
      const now = clock.now();
      const { activity, viewerRole } = await loadForViewer(activityId, viewerId);
      if (viewerRole !== 'organizer') {
        throw new ForbiddenError('Only the organizer can cancel this activity.');
      }
      const problem = changeProblem(
        { status: effectiveStatus(activity, now), startAt: activity.startAt },
        now,
      );
      if (problem) throw new ConflictError(problem.code, problem.message);

      await db.$transaction(async (tx) => {
        if (!(await repo.cancelActivityGuarded(tx, activityId, reason ?? null, now))) {
          // It started or was cancelled a moment ago: report that.
          const current = await repo.findActivityForViewer(tx, activityId, viewerId);
          if (!current) throw new NotFoundError(ACTIVITY_NOT_FOUND);
          const late = changeProblem(
            { status: effectiveStatus(current, now), startAt: current.startAt },
            now,
          );
          throw new ConflictError(
            late?.code ?? ErrorCode.ACTIVITY_NOT_OPEN,
            late?.message ?? 'This activity can’t be cancelled.',
          );
        }
        const recipients = await repo.participantIds(tx, activityId, viewerId);
        await createNotifications(
          tx,
          recipients.map((recipientId) => ({
            recipientId,
            type: NotificationType.ACTIVITY_CANCELLED,
            activityId,
            activityTitle: activity.title,
            actorId: viewerId,
            ...(reason ? { body: reason } : {}),
          })),
        );
      });
      return getDetail(viewerId, activityId);
    },

    /**
     * FR29–FR30, FR40a: the organizer edits an Open or Full activity before it starts. The edit is
     * merged into the current values and validated with the creation rules.
     */
    async update(
      viewerId: string,
      activityId: string,
      patch: ActivityUpdateInput,
    ): Promise<ActivityDetailDto> {
      const now = clock.now();
      const { activity, viewerRole } = await loadForViewer(activityId, viewerId);
      if (viewerRole !== 'organizer') {
        throw new ForbiddenError('Only the organizer can edit this activity.');
      }
      assertEditable(activity, now);

      const before = toFormValues(activity);
      const parsed = activityCreateSchema.safeParse({ ...before, ...patch });
      if (!parsed.success) throw new ValidationError(issuesToFieldErrors(parsed.error.issues));
      const after = parsed.data;
      const values = toStoredValues(after);
      if (values.startAt <= now) throw new ValidationError({ startTime: START_IN_PAST_MESSAGE });
      if (values.participantLimit < activity.participantCount) throw limitBelowCount(activity);

      const changed = NOTIFY_FIELDS.filter((field) => before[field] !== after[field]);
      await db.$transaction(async (tx) => {
        // The guards run again inside the update, in case a join or cancel happened meanwhile.
        if (!(await repo.updateActivityGuarded(tx, activityId, values, now))) {
          const current = await repo.findActivityForViewer(tx, activityId, viewerId);
          if (!current) throw new NotFoundError(ACTIVITY_NOT_FOUND);
          assertEditable(current, now);
          throw limitBelowCount(current);
        }
        if (changed.length > 0) {
          const recipients = await repo.participantIds(tx, activityId, viewerId);
          await createNotifications(
            tx,
            recipients.map((recipientId) => ({
              recipientId,
              type: NotificationType.ACTIVITY_CHANGED,
              activityId,
              activityTitle: after.title,
              actorId: viewerId,
              body: `Changed: ${changed.map((field) => FIELD_LABELS[field]).join(', ')}.`,
            })),
          );
        }
      });
      return getDetail(viewerId, activityId);
    },
  };
}

export type ActivityService = ReturnType<typeof createActivityService>;

/** FR29: Cancelled and Completed activities are read-only, and nothing changes once started. */
function assertEditable(
  activity: { status: ActivityStatus; startAt: Date; endAt: Date },
  now: Date,
) {
  const status = effectiveStatus(activity, now);
  if (status !== ActivityStatus.OPEN && status !== ActivityStatus.FULL) {
    throw new ConflictError(
      ErrorCode.ACTIVITY_NOT_OPEN,
      'Cancelled and completed activities can’t be edited.',
    );
  }
  if (activity.startAt <= now) {
    throw new ConflictError(ErrorCode.ACTIVITY_STARTED, 'This activity has already started.');
  }
}

/** FR30: the limit can't go below the number of students already in. */
function limitBelowCount(activity: { participantCount: number }) {
  const message = `${activity.participantCount} Spartans are already going, so the limit can’t be lower than that.`;
  return new AppError(409, ErrorCode.LIMIT_BELOW_COUNT, message, { participantLimit: message });
}
