// String-literal enums shared by the API and the web app.
// ActivityType is intentionally absent until open question Q4 (the activity type list) is decided.

export const ActivityStatus = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const; // FR18
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ReportReason = {
  HARASSMENT: 'HARASSMENT',
  SPAM: 'SPAM',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  SAFETY_CONCERN: 'SAFETY_CONCERN',
  OTHER: 'OTHER',
} as const; // FR51
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];
