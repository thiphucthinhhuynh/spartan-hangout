import type { DbClient } from '../../db.js';
import { UserStatus, type ActivityType } from '../../generated/prisma/client.js';

// Queries for the auth module. Functions take the client so services can run them in a transaction.

export function findUserByEmail(client: DbClient, email: string) {
  return client.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true, status: true },
  });
}

interface NewUser {
  email: string;
  passwordHash: string;
  displayName: string;
  interests: ActivityType[];
  availability: { dayOfWeek: number; startMinute: number; endMinute: number }[];
}

/** FR03: the account stays PENDING_VERIFICATION (inactive) until the emailed link is used. */
export function createPendingUser(client: DbClient, user: NewUser) {
  return client.user.create({
    data: {
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      interests: user.interests,
      status: UserStatus.PENDING_VERIFICATION,
      availability: { create: user.availability },
    },
    select: { id: true, email: true, displayName: true },
  });
}

export function createVerificationToken(
  client: DbClient,
  token: { userId: string; tokenHash: string; expiresAt: Date },
) {
  return client.emailVerificationToken.create({ data: token });
}

/** Old links stop working once a new one is requested. */
export function deleteUnusedVerificationTokens(client: DbClient, userId: string) {
  return client.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
}

export function findVerificationToken(client: DbClient, tokenHash: string) {
  return client.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
}

/**
 * Marks the token used only if nobody used it first (two tabs clicking the same link).
 * Returns false when the token was already consumed.
 */
export async function consumeVerificationToken(client: DbClient, tokenId: string, usedAt: Date) {
  const { count } = await client.emailVerificationToken.updateMany({
    where: { id: tokenId, usedAt: null },
    data: { usedAt },
  });
  return count === 1;
}

export function activateUser(client: DbClient, userId: string) {
  return client.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
}
