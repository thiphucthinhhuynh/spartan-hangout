import type { ActivityType } from '../enums.js';

/** A weekly availability slot, in campus-local "HH:mm" time. */
export interface AvailabilitySlotDto {
  dayOfWeek: number;
  start: string;
  end: string;
}

/** GET /users/me — the only profile response that includes the SJSU email (FR12). */
export interface OwnProfileDto {
  id: string;
  email: string;
  displayName: string;
  interests: ActivityType[];
  availability: AvailabilitySlotDto[];
  /** ISO time of the last profile edit (FR06). */
  updatedAt: string;
}

/**
 * How the viewer is related to a student. Pending request states are added with connection
 * requests in Milestone 9.
 */
export type ConnectionState = 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected';

/** GET /users/:id — another student's profile. Never contains an email (FR04, FR13). */
export interface PublicProfileDto {
  id: string;
  displayName: string;
  /** Each of their interests, marked when the viewer shares it (FR13). */
  interests: { type: ActivityType; shared: boolean }[];
  availability: AvailabilitySlotDto[];
  connectionState: ConnectionState;
}
