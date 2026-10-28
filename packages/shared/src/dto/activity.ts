import type { ActivityStatus, ActivityType } from '../enums.js';

export interface ActivityOrganizerDto {
  /** Null when the organizer deleted their account. */
  id: string | null;
  /** "Deleted Student" when the organizer deleted their account (FR08). */
  displayName: string;
}

/** An activity in a list (FR15, FR17). */
export interface ActivityCardDto {
  id: string;
  title: string;
  type: ActivityType;
  /** ISO instants; show them in campus time. */
  startAt: string;
  endAt: string;
  location: string;
  openSpots: number;
  /** Completed as soon as the end time passes, even before the background job runs (FR20). */
  status: ActivityStatus;
  organizer: ActivityOrganizerDto;
}

export type ViewerRole = 'organizer' | 'participant' | 'none';

/**
 * GET /activities/:id (FR18). The `can*` flags tell the UI which actions to offer; the server still
 * checks every action. Join, leave, cancel and report turn on in Milestones 6, 7 and 11.
 */
export interface ActivityDetailDto extends ActivityCardDto {
  description: string;
  participantLimit: number;
  participantCount: number;
  cancellationReason: string | null;
  viewerRole: ViewerRole;
  canEdit: boolean;
  canJoin: boolean;
  /** Why the viewer can't join, when that is worth showing (from Milestone 6). */
  joinBlockedReason: string | null;
  canLeave: boolean;
  canCancel: boolean;
  canReport: boolean;
  createdAt: string;
  updatedAt: string;
}
