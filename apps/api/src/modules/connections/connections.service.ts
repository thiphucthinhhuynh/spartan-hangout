import {
  ErrorCode,
  NotificationType,
  type ConnectionRequestDto,
  type Paged,
  type PaginationInput,
  type StudentCardDto,
} from '@sh/shared';
import { ConflictError, NotFoundError } from '../../common/errors.js';
import { connectionStateBetween, isBlockedEitherWay } from '../../common/relationships.js';
import type { AppDeps } from '../../deps.js';
import { Prisma } from '../../generated/prisma/client.js';
import { createNotifications } from '../notifications/notifications.service.js';
import * as repo from './connections.repository.js';

const STUDENT_NOT_FOUND = 'We couldn’t find that student.';
const REQUEST_NOT_FOUND = 'We couldn’t find that connection request.';

function notAllowed(message: string) {
  return new ConflictError(ErrorCode.CONNECTION_NOT_ALLOWED, message);
}

/** Discover students, connection requests and connections (FR43–FR46). */
export function createConnectionsService({ db, clock }: Pick<AppDeps, 'db' | 'clock'>) {
  async function pageOfStudents(
    viewerId: string,
    mode: 'discover' | 'connected',
    { page, pageSize }: PaginationInput,
  ): Promise<Paged<StudentCardDto>> {
    const rows = await repo.studentCards(db, viewerId, mode, {
      limit: pageSize + 1,
      offset: (page - 1) * pageSize,
    });
    return { items: rows.slice(0, pageSize), page, pageSize, hasMore: rows.length > pageSize };
  }

  return {
    /** FR43–FR44: students sharing at least one interest, most shared first, then by name. */
    discover(viewerId: string, paging: PaginationInput) {
      return pageOfStudents(viewerId, 'discover', paging);
    },

    /** FR13: the student's connections, by name. */
    connections(viewerId: string, paging: PaginationInput) {
      return pageOfStudents(viewerId, 'connected', paging);
    },

    /**
     * FR45: not to yourself, an inactive or unknown student, a blocked student (either way),
     * a connection, or anyone with a pending request in either direction. Notifies the recipient.
     */
    async sendRequest(sender: { id: string; displayName: string }, recipientId: string) {
      if (recipientId === sender.id) {
        throw notAllowed('You can’t send a connection request to yourself.');
      }
      const recipient = await repo.findActiveUser(db, recipientId);
      if (!recipient) throw new NotFoundError(STUDENT_NOT_FOUND);
      // Generic wording, like a blocked join (open question Q12).
      if (await isBlockedEitherWay(db, sender.id, recipientId)) {
        throw notAllowed('You can’t send a connection request to this student.');
      }
      const state = await connectionStateBetween(db, sender.id, recipientId);
      if (state === 'connected') throw notAllowed('You’re already connected.');
      if (state === 'pending_outgoing') {
        throw notAllowed('You already sent this student a connection request.');
      }
      if (state === 'pending_incoming') {
        throw notAllowed(
          `${recipient.displayName} already sent you a request. Accept it on your Connections page.`,
        );
      }

      try {
        return await db.$transaction(async (tx) => {
          const request = await repo.insertRequest(tx, sender.id, recipientId, clock.now());
          await createNotifications(tx, [
            {
              recipientId,
              type: NotificationType.CONNECTION_REQUEST,
              actorId: sender.id,
              body: `${sender.displayName} wants to connect.`,
            },
          ]);
          return request;
        });
      } catch (err) {
        // Both students sent a request at the same moment: the pair index keeps one.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw notAllowed('There is already a pending request between you two.');
        }
        throw err;
      }
    },

    /** FR46: only the recipient sees and answers a request. */
    async listRequests(
      userId: string,
      direction: 'incoming' | 'outgoing',
    ): Promise<ConnectionRequestDto[]> {
      const rows = await repo.listRequests(db, userId, direction);
      return rows.map((row) => ({
        id: row.id,
        student: direction === 'incoming' ? row.sender : row.recipient,
        createdAt: row.createdAt.toISOString(),
      }));
    },

    /** FR46: accepting creates the connection and notifies the sender. */
    async accept(recipient: { id: string; displayName: string }, requestId: string) {
      const request = await repo.findIncomingRequest(db, requestId, recipient.id);
      if (!request) throw new NotFoundError(REQUEST_NOT_FOUND);
      // A block placed after the request was sent ends it (FR55a).
      if (await isBlockedEitherWay(db, recipient.id, request.senderId)) {
        await repo.deleteRequest(db, requestId);
        throw new NotFoundError(REQUEST_NOT_FOUND);
      }

      await db.$transaction(async (tx) => {
        if (!(await repo.deleteRequest(tx, requestId))) throw new NotFoundError(REQUEST_NOT_FOUND);
        await repo.insertConnection(tx, recipient.id, request.senderId, clock.now());
        await createNotifications(tx, [
          {
            recipientId: request.senderId,
            type: NotificationType.CONNECTION_ACCEPTED,
            actorId: recipient.id,
            body: `${recipient.displayName} accepted your connection request.`,
          },
        ]);
      });
    },

    /** FR46: declining deletes the request; the sender is not told. */
    async decline(recipientId: string, requestId: string) {
      const request = await repo.findIncomingRequest(db, requestId, recipientId);
      if (!request || !(await repo.deleteRequest(db, requestId))) {
        throw new NotFoundError(REQUEST_NOT_FOUND);
      }
    },
  };
}

export type ConnectionsService = ReturnType<typeof createConnectionsService>;
