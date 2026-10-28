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
