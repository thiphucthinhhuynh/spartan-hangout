import {
  ErrorCode,
  NotificationType,
  type ConversationSummaryDto,
  type DirectMessageDto,
} from '@sh/shared';
import { ConflictError, NotFoundError } from '../../common/errors.js';
import {
  areConnected,
  blockedIdsFor,
  connectedIdsFor,
  isBlockedEitherWay,
  orderedPair,
} from '../../common/relationships.js';
import type { AppDeps } from '../../deps.js';
import { UserStatus, type Prisma } from '../../generated/prisma/client.js';
import { createNotifications } from '../notifications/notifications.service.js';
import { toSenderDto } from './messages.service.js';

// Direct messages (FR47–FR49). Simple inserts and lists, so the service calls Prisma directly
// (architecture §5).

const STUDENT_NOT_FOUND = 'We couldn’t find that student.';

const messageSelect = {
  id: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, displayName: true } },
} as const;

type MessageRow = Prisma.DirectMessageGetPayload<{ select: typeof messageSelect }>;

function toDirectMessageDto(row: MessageRow): DirectMessageDto {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    sender: toSenderDto(row.sender),
  };
}

export function createConversationsService({ db, clock }: Pick<AppDeps, 'db' | 'clock'>) {
  /**
   * FR48: only two students with an active connection. A missing, inactive or blocked student
   * looks the same (404, FR57); anyone else who isn't connected gets NOT_CONNECTED.
   */
  async function assertCanMessage(viewerId: string, otherId: string) {
    if (viewerId === otherId) throw new NotFoundError(STUDENT_NOT_FOUND);
    const other = await db.user.findFirst({
      where: { id: otherId, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (!other || (await isBlockedEitherWay(db, viewerId, otherId))) {
      throw new NotFoundError(STUDENT_NOT_FOUND);
    }
    if (!(await areConnected(db, viewerId, otherId))) {
      throw new ConflictError(
        ErrorCode.NOT_CONNECTED,
        'You can only message students you’re connected with.',
      );
    }
  }

  return {
    /**
     * FR49: most recent first. A preview is reading the message, so conversations whose
     * connection has ended are left out (FR48).
     */
    async list(viewerId: string): Promise<ConversationSummaryDto[]> {
      const blocked = await blockedIdsFor(db, viewerId);
      const connected = await connectedIdsFor(db, viewerId);
      const others = connected.filter((id) => !blocked.has(id));
      if (others.length === 0) return [];

      const user = { select: { id: true, displayName: true } };
      const rows = await db.conversation.findMany({
        where: {
          lastMessageAt: { not: null },
          OR: [
            { userAId: viewerId, userBId: { in: others } },
            { userBId: viewerId, userAId: { in: others } },
          ],
        },
        select: {
          lastMessageAt: true,
          userA: user,
          userB: user,
          messages: {
            select: { body: true, senderId: true },
            orderBy: { seq: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }],
      });
      return rows.flatMap((row) => {
        const [lastMessage] = row.messages;
        if (!lastMessage || !row.lastMessageAt) return [];
        return [
          {
            otherUser: row.userA.id === viewerId ? row.userB : row.userA,
            lastMessage,
            lastMessageAt: row.lastMessageAt.toISOString(),
          },
        ];
      });
    },

    /** FR47–FR48: oldest first. `after` (a message id) returns only newer messages, for polling. */
    async thread(viewerId: string, otherId: string, after?: string): Promise<DirectMessageDto[]> {
      await assertCanMessage(viewerId, otherId);
      const conversation = await db.conversation.findUnique({
        where: { userAId_userBId: orderedPair(viewerId, otherId) },
        select: { id: true },
      });
      if (!conversation) return [];

      const cursor = after
        ? await db.directMessage.findFirst({
            where: { id: after, conversationId: conversation.id },
            select: { seq: true },
          })
        : null;
      const rows = await db.directMessage.findMany({
        where: {
          conversationId: conversation.id,
          ...(cursor ? { seq: { gt: cursor.seq } } : {}),
        },
        select: messageSelect,
        orderBy: { seq: 'asc' },
      });
      return rows.map(toDirectMessageDto);
    },

    /**
     * FR47, FR49: creates the conversation on the first message, moves it to the top of both
     * lists and notifies the recipient. The notification names the sender but not the text,
     * which stays readable only while they're connected (FR48).
     */
    async send(
      sender: { id: string; displayName: string },
      otherId: string,
      body: string,
    ): Promise<DirectMessageDto> {
      await assertCanMessage(sender.id, otherId);
      const now = clock.now();
      const pair = orderedPair(sender.id, otherId);

      return db.$transaction(async (tx) => {
        const conversation = await tx.conversation.upsert({
          where: { userAId_userBId: pair },
          create: { ...pair, lastMessageAt: now },
          update: { lastMessageAt: now },
          select: { id: true },
        });
        const row = await tx.directMessage.create({
          data: { conversationId: conversation.id, senderId: sender.id, body, createdAt: now },
          select: messageSelect,
        });
        await createNotifications(tx, [
          {
            recipientId: otherId,
            type: NotificationType.DIRECT_MESSAGE,
            conversationId: conversation.id,
            actorId: sender.id,
            body: `${sender.displayName} sent you a message.`,
          },
        ]);
        return toDirectMessageDto(row);
      });
    },
  };
}

export type ConversationsService = ReturnType<typeof createConversationsService>;
