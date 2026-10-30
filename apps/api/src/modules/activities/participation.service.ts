import {
  ErrorCode,
  MESSAGES,
  NotificationType,
  type ActivityDetailDto,
  type MeDto,
  type ParticipantDto,
} from '@sh/shared';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors.js';
import type { AppDeps } from '../../deps.js';
import { Prisma } from '../../generated/prisma/client.js';
import { createNotifications } from '../notifications/notifications.service.js';
import * as repo from './activities.repository.js';
import { effectiveStatus } from './activities.mappers.js';
import type { ActivityService } from './activity.service.js';
import {
  ALREADY_IN_MESSAGE,
  changeProblem,
  joinProblem,
  type JoinProblem,
} from './participation.rules.js';

/** Thrown inside a transaction to roll it back and report why (the guarded UPDATE matched 0 rows). */
function conflict(problem: JoinProblem) {
  return new ConflictError(problem.code, problem.message);
}

type Actor = Pick<MeDto, 'id' | 'displayName'>;

/** Join, leave, remove and the participant list (architecture §11.1, ADR-0010). */
export function createParticipationService(
  { db, clock }: Pick<AppDeps, 'db' | 'clock'>,
  activities: ActivityService,
) {
  /** After a guarded UPDATE failed: the current reason, re-read inside the transaction. */
  async function currentProblem(
    tx: Prisma.TransactionClient,
    activityId: string,
    viewerId: string,
    check: 'join' | 'change',
  ): Promise<JoinProblem> {
    const now = clock.now();
    const current = await repo.findActivityForViewer(tx, activityId, viewerId);
    if (!current) throw new NotFoundError('We couldn’t find that activity.');
    const facts = { status: effectiveStatus(current, now), startAt: current.startAt };
    const problem =
      check === 'join'
        ? joinProblem({ ...facts, viewerRole: 'none', removed: false, blocked: false }, now)
        : changeProblem(facts, now);
    // A join that lost the race for the last spot (FR23).
    return problem ?? { code: ErrorCode.ACTIVITY_FULL, message: MESSAGES.activityFull };
  }

  /** Loads the activity for an organizer action on another participant. */
  async function loadAsOrganizer(organizerId: string, activityId: string) {
    const loaded = await activities.loadForViewer(activityId, organizerId);
    if (loaded.viewerRole !== 'organizer') {
      throw new ForbiddenError('Only the organizer can remove participants.');
    }
    return loaded.activity;
  }

  return {
    /** FR19: visible to anyone who can see the activity's detail view. */
    async participants(viewerId: string, activityId: string): Promise<ParticipantDto[]> {
      await activities.getDetail(viewerId, activityId);
      const rows = await repo.listParticipants(db, activityId);
      return rows.map((row) => ({
        userId: row.userId,
        displayName: row.user.displayName,
        isOrganizer: row.isOrganizer,
      }));
    },

    /**
     * FR21–FR23, FR41: check the conditions, then take a spot atomically, add the participant
     * and notify the organizer, all in one transaction.
     */
    async join(actor: Actor, activityId: string): Promise<ActivityDetailDto> {
      const now = clock.now();
      const { activity, viewerRole, joinContext } = await activities.loadForViewer(
        activityId,
        actor.id,
      );
      const status = effectiveStatus(activity, now);
      // FR20, FR32: outsiders can't see Cancelled or Completed activities at all.
      if (viewerRole === 'none' && (status === 'CANCELLED' || status === 'COMPLETED')) {
        throw new NotFoundError('We couldn’t find that activity.');
      }
      const problem = joinProblem(
        {
          status,
          startAt: activity.startAt,
          viewerRole,
          ...joinContext,
        },
        now,
      );
      if (problem) throw conflict(problem);

      try {
        await db.$transaction(async (tx) => {
          if (!(await repo.reserveSpot(tx, activityId, now))) {
            throw conflict(await currentProblem(tx, activityId, actor.id, 'join'));
          }
          await repo.insertParticipation(tx, activityId, actor.id, now);
          if (activity.organizerId) {
            await createNotifications(tx, [
              {
                recipientId: activity.organizerId,
                type: NotificationType.PARTICIPANT_JOINED,
                activityId,
                activityTitle: activity.title,
                actorId: actor.id,
                body: `${actor.displayName} joined.`,
              },
            ]);
          }
        });
      } catch (err) {
        // The same student joining twice at once: the participation primary key decides.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictError(ErrorCode.ALREADY_PARTICIPANT, ALREADY_IN_MESSAGE);
        }
        throw err;
      }
      return activities.getDetail(actor.id, activityId);
    },

    /** FR24–FR25, FR41: a participant (not the organizer) leaves before the start. */
    async leave(actor: Actor, activityId: string): Promise<ActivityDetailDto> {
      const now = clock.now();
      const { activity, viewerRole } = await activities.loadForViewer(activityId, actor.id);
      if (viewerRole === 'organizer') {
        throw new ForbiddenError('Organizers can’t leave their own activity.');
      }
      if (viewerRole === 'none') throw new NotFoundError('You’re not in this activity.');
      const problem = changeProblem(
        { status: effectiveStatus(activity, now), startAt: activity.startAt },
        now,
      );
      if (problem) throw conflict(problem);

      await db.$transaction(async (tx) => {
        if (!(await repo.releaseSpot(tx, activityId, now))) {
          throw conflict(await currentProblem(tx, activityId, actor.id, 'change'));
        }
        if (!(await repo.deleteParticipation(tx, activityId, actor.id))) {
          throw new NotFoundError('You’re not in this activity.');
        }
        if (activity.organizerId) {
          await createNotifications(tx, [
            {
              recipientId: activity.organizerId,
              type: NotificationType.PARTICIPANT_LEFT,
              activityId,
              activityTitle: activity.title,
              actorId: actor.id,
              body: `${actor.displayName} left.`,
            },
          ]);
        }
      });
      return activities.getDetail(actor.id, activityId);
    },

    /**
     * FR33–FR34: the organizer removes a participant before the start. The student is told,
     * with the reason if one was given, and can't join again.
     */
    async removeParticipant(
      organizerId: string,
      activityId: string,
      userId: string,
      reason: string | undefined,
    ): Promise<void> {
      const now = clock.now();
      const activity = await loadAsOrganizer(organizerId, activityId);
      if (userId === organizerId) {
        throw new ForbiddenError('The organizer can’t be removed from their own activity.');
      }
      const problem = changeProblem(
        { status: effectiveStatus(activity, now), startAt: activity.startAt },
        now,
      );
      if (problem) throw conflict(problem);

      await db.$transaction(async (tx) => {
        if (!(await repo.releaseSpot(tx, activityId, now))) {
          throw conflict(await currentProblem(tx, activityId, organizerId, 'change'));
        }
        if (!(await repo.deleteParticipation(tx, activityId, userId))) {
          throw new NotFoundError('That student isn’t in this activity.');
        }
        await repo.insertRemoval(tx, activityId, userId, reason ?? null, now);
        await createNotifications(tx, [
          {
            recipientId: userId,
            type: NotificationType.REMOVED_FROM_ACTIVITY,
            activityId,
            activityTitle: activity.title,
            actorId: organizerId,
            ...(reason ? { body: reason } : {}),
          },
        ]);
      });
    },
  };
}

export type ParticipationService = ReturnType<typeof createParticipationService>;
