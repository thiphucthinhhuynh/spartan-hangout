import type { ActivityType } from '../enums.js';
import type { ConnectionState } from './profile.js';

/** A student in a list: Discover students (FR43–FR44) or the connection list (FR13). */
export interface StudentCardDto {
  id: string;
  displayName: string;
  /** The interests they share with the viewer (FR44). */
  sharedInterests: ActivityType[];
  connectionState: ConnectionState;
}

/** GET /connections/requests: a pending request, with the other student (FR45–FR46). */
export interface ConnectionRequestDto {
  id: string;
  /** The sender for incoming requests, the recipient for outgoing ones. */
  student: { id: string; displayName: string };
  createdAt: string;
}
