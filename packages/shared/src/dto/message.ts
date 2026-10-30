import type { ActivityMessageKind } from '../enums.js';
import type { ActivityOrganizerDto } from './activity.js';

/** A message in an activity's group chat (FR36, FR39). */
export interface ActivityMessageDto {
  id: string;
  /** UPDATE is shown with the "Update" label (FR39). */
  kind: ActivityMessageKind;
  body: string;
  createdAt: string;
  /** "Deleted Student" with a null id when the sender deleted their account (FR08). */
  sender: ActivityOrganizerDto;
}
