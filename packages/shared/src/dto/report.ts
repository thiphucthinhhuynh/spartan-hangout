import type { ActivityStatus, ReportReason, ReportStatus } from '../enums.js';

/** GET /admin/reports (FR53). Administrators only; never contains an email. */
export interface ReportDto {
  id: string;
  /** "Deleted Student" with a null id when the reporter's account is gone. */
  reporter: { id: string | null; displayName: string };
  /** Exactly one is set when submitted; both are null once the target has been deleted. */
  targetUser: { id: string; displayName: string } | null;
  targetActivity: { id: string; title: string; status: ActivityStatus } | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  /** Who marked it Reviewed, and when (FR53). */
  reviewedBy: { id: string | null; displayName: string } | null;
  reviewedAt: string | null;
}
