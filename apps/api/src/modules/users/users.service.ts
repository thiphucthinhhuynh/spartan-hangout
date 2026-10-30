import { timeToMinutes, type ProfileUpdateInput } from '@sh/shared';
import { NotFoundError } from '../../common/errors.js';
import { connectionStateBetween, isBlockedEitherWay } from '../../common/relationships.js';
import type { AppDeps } from '../../deps.js';
import { UserStatus } from '../../generated/prisma/client.js';
import { toOwnProfileDto, toPublicProfileDto } from './users.mappers.js';

const profileSelect = {
  id: true,
  email: true,
  displayName: true,
  interests: true,
  updatedAt: true,
  availability: { select: { dayOfWeek: true, startMinute: true, endMinute: true } },
} as const;

const STUDENT_NOT_FOUND = 'We couldn’t find that student.';

export function createUsersService({ db, clock }: Pick<AppDeps, 'db' | 'clock'>) {
  return {
    /** FR12: the logged-in student's own profile, including their SJSU email. */
    async getOwnProfile(userId: string) {
      const user = await db.user.findUnique({ where: { id: userId }, select: profileSelect });
      if (!user) throw new NotFoundError();
      return toOwnProfileDto(user);
    },

    /**
     * FR05–FR06: update the given fields in place. Input was validated with the registration
     * rules; availability is replaced as a whole. One transaction, so nothing is saved on error.
     */
    async updateOwnProfile(userId: string, input: ProfileUpdateInput) {
      const user = await db.$transaction(async (tx) => {
        if (input.availability) {
          await tx.availabilitySlot.deleteMany({ where: { userId } });
          await tx.availabilitySlot.createMany({
            data: input.availability.map((slot) => ({
              userId,
              dayOfWeek: slot.dayOfWeek,
              startMinute: timeToMinutes(slot.start),
              endMinute: timeToMinutes(slot.end),
            })),
          });
        }
        return tx.user.update({
          where: { id: userId },
          data: {
            displayName: input.displayName,
            interests: input.interests,
            // Set explicitly so an availability-only edit also counts as an update (FR06).
            updatedAt: clock.now(),
          },
          select: profileSelect,
        });
      });
      return toOwnProfileDto(user);
    },

    /**
     * FR13: another active student's profile. Hidden (404, like a missing student) when either
     * of them has blocked the other (FR57).
     */
    async getPublicProfile(viewerId: string, userId: string) {
      const [user, viewer] = await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            displayName: true,
            interests: true,
            status: true,
            availability: profileSelect.availability,
          },
        }),
        db.user.findUnique({ where: { id: viewerId }, select: { interests: true } }),
      ]);
      if (!user || user.status !== UserStatus.ACTIVE || !viewer) {
        throw new NotFoundError(STUDENT_NOT_FOUND);
      }
      if (await isBlockedEitherWay(db, viewerId, userId))
        throw new NotFoundError(STUDENT_NOT_FOUND);

      const state = await connectionStateBetween(db, viewerId, userId);
      return toPublicProfileDto(user, viewer.interests, state);
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
