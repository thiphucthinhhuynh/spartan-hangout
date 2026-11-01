// String-literal enums shared by the API and the web app. Values match the Prisma enums.

/** Activity type list (open question Q4, decided 2026-10-27: the five types in the UI mockups). */
export const ActivityType = {
  STUDY: 'STUDY',
  SPORTS: 'SPORTS',
  FOOD: 'FOOD',
  SOCIAL: 'SOCIAL',
  GAMING: 'GAMING',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const ACTIVITY_TYPES = Object.values(ActivityType);

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  STUDY: 'Study',
  SPORTS: 'Sports',
  FOOD: 'Food',
  SOCIAL: 'Social',
  GAMING: 'Gaming',
};

export const Role = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
} as const; // FR53: administrators only review reports
export type Role = (typeof Role)[keyof typeof Role];

export const ActivityStatus = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const; // FR18
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ActivityMessageKind = {
  MESSAGE: 'MESSAGE',
  UPDATE: 'UPDATE',
} as const; // FR36, FR39
export type ActivityMessageKind = (typeof ActivityMessageKind)[keyof typeof ActivityMessageKind];

export const NotificationType = {
  ACTIVITY_CHANGED: 'ACTIVITY_CHANGED',
  ACTIVITY_CANCELLED: 'ACTIVITY_CANCELLED',
  ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',
  REMOVED_FROM_ACTIVITY: 'REMOVED_FROM_ACTIVITY',
  PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
  CONNECTION_REQUEST: 'CONNECTION_REQUEST',
  CONNECTION_ACCEPTED: 'CONNECTION_ACCEPTED',
  DIRECT_MESSAGE: 'DIRECT_MESSAGE',
} as const; // FR40–FR42, FR45–FR46, FR49
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ReportReason = {
  HARASSMENT: 'HARASSMENT',
  SPAM: 'SPAM',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  SAFETY_CONCERN: 'SAFETY_CONCERN',
  OTHER: 'OTHER',
} as const; // FR51
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const REPORT_REASONS = Object.values(ReportReason);

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  HARASSMENT: 'Harassment',
  SPAM: 'Spam',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  SAFETY_CONCERN: 'Safety concern',
  OTHER: 'Other',
};

export const ReportStatus = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
} as const; // FR52–FR53
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
