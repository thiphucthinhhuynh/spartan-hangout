import {
  minutesToTime,
  type ActivityType,
  type AvailabilitySlotDto,
  type ConnectionState,
  type OwnProfileDto,
  type PublicProfileDto,
} from '@sh/shared';

// The only place user rows become API responses. Public profiles are built field by field, so
// the SJSU email can never leak into them (FR04, FR13).

interface SlotRow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

interface ProfileRow {
  id: string;
  email: string;
  displayName: string;
  interests: ActivityType[];
  updatedAt: Date;
  availability: SlotRow[];
}

/** Ordered by day (Sunday first), then start time. */
export function toAvailabilityDtos(slots: SlotRow[]): AvailabilitySlotDto[] {
  return [...slots]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
    .map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      start: minutesToTime(slot.startMinute),
      end: minutesToTime(slot.endMinute),
    }));
}

export function toOwnProfileDto(user: ProfileRow): OwnProfileDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    interests: user.interests,
    availability: toAvailabilityDtos(user.availability),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toPublicProfileDto(
  user: Omit<ProfileRow, 'email' | 'updatedAt'>,
  viewerInterests: readonly ActivityType[],
  connectionState: ConnectionState,
): PublicProfileDto {
  return {
    id: user.id,
    displayName: user.displayName,
    interests: user.interests.map((type) => ({ type, shared: viewerInterests.includes(type) })),
    availability: toAvailabilityDtos(user.availability),
    connectionState,
  };
}
