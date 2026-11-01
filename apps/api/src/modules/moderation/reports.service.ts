import {
  ErrorCode,
  MESSAGES,
  ReportStatus,
  type MessageResponse,
  type Paged,
  type ReportDto,
  type ReportInput,
  type ReportListInput,
} from '@sh/shared';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors.js';
import { isBlockedEitherWay } from '../../common/relationships.js';
import type { AppDeps } from '../../deps.js';
import { Prisma, UserStatus } from '../../generated/prisma/client.js';
import type { ActivityService } from '../activities/activity.service.js';

// Reports (FR50–FR53). Simple inserts and lists, so the service calls Prisma directly
// (architecture §5). Reported students and organizers are never told (FR52).

const REPORT_NOT_FOUND = 'We couldn’t find that report.';

const reportSelect = {
  id: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  reporter: { select: { id: true, displayName: true } },
  targetUser: { select: { id: true, displayName: true } },
  targetActivity: { select: { id: true, title: true, status: true } },
  reviewedBy: { select: { id: true, displayName: true } },
} as const;

type ReportRow = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

function toReportDto(row: ReportRow): ReportDto {
  const deleted = { id: null, displayName: MESSAGES.deletedStudent };
  return {
    id: row.id,
    reporter: row.reporter ?? deleted,
    targetUser: row.targetUser,
    targetActivity: row.targetActivity,
    reason: row.reason,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    // A Reviewed report whose administrator's account is gone still shows that it was reviewed.
    reviewedBy: row.reviewedBy ?? (row.reviewedAt ? deleted : null),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

function duplicate() {
  return new ConflictError(
    ErrorCode.DUPLICATE_PENDING_REPORT,
    'You already reported this, and an administrator hasn’t reviewed it yet.',
  );
}

export function createReportsService(
  { db, clock }: Pick<AppDeps, 'db' | 'clock'>,
  activities: ActivityService,
) {
  /** FR50: not your own profile, and only a student you can see (FR57). */
  async function assertCanReportUser(reporterId: string, targetUserId: string) {
    if (targetUserId === reporterId) throw new ForbiddenError('You can’t report yourself.');
    const target = await db.user.findFirst({
      where: { id: targetUserId, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (!target || (await isBlockedEitherWay(db, reporterId, targetUserId))) {
      throw new NotFoundError('We couldn’t find that student.');
    }
  }

  /** FR50: not your own activity, and only one you can see (getDetail's 404). */
  async function assertCanReportActivity(reporterId: string, targetActivityId: string) {
    const activity = await activities.getDetail(reporterId, targetActivityId);
    if (activity.viewerRole === 'organizer') {
      throw new ForbiddenError('You can’t report your own activity.');
    }
  }

  return {
    /** FR50–FR52: stored as Pending; only the reporter gets a confirmation. */
    async submit(reporterId: string, input: ReportInput): Promise<MessageResponse> {
      const { targetUserId, targetActivityId, reason, description } = input;
      if (targetUserId) await assertCanReportUser(reporterId, targetUserId);
      if (targetActivityId) await assertCanReportActivity(reporterId, targetActivityId);

      const pending = await db.report.findFirst({
        where: {
          reporterId,
          status: ReportStatus.PENDING,
          ...(targetUserId ? { targetUserId } : { targetActivityId: targetActivityId ?? null }),
        },
        select: { id: true },
      });
      if (pending) throw duplicate();

      try {
        await db.report.create({
          data: {
            reporterId,
            targetUserId: targetUserId ?? null,
            targetActivityId: targetActivityId ?? null,
            reason,
            description: description ?? null,
            createdAt: clock.now(),
          },
        });
      } catch (err) {
        // Two identical reports at the same moment: the partial unique index keeps one.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw duplicate();
        }
        throw err;
      }
      return { message: 'Thanks. Your report was submitted and an administrator will review it.' };
    },

    /** FR53: every report, newest first, optionally by status. */
    async list({ page, pageSize, status }: ReportListInput): Promise<Paged<ReportDto>> {
      const rows = await db.report.findMany({
        where: status ? { status } : {},
        select: reportSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize + 1,
      });
      return {
        items: rows.slice(0, pageSize).map(toReportDto),
        page,
        pageSize,
        hasMore: rows.length > pageSize,
      };
    },

    /** FR53: marks a Pending report Reviewed, recording the administrator and the time. */
    async markReviewed(adminId: string, reportId: string): Promise<ReportDto> {
      const { count } = await db.report.updateMany({
        where: { id: reportId, status: ReportStatus.PENDING },
        data: { status: ReportStatus.REVIEWED, reviewedById: adminId, reviewedAt: clock.now() },
      });
      const row = await db.report.findUnique({ where: { id: reportId }, select: reportSelect });
      if (!row) throw new NotFoundError(REPORT_NOT_FOUND);
      if (count === 0) {
        throw new ConflictError(
          ErrorCode.REPORT_ALREADY_REVIEWED,
          'This report has already been reviewed.',
        );
      }
      return toReportDto(row);
    },
  };
}

export type ReportsService = ReturnType<typeof createReportsService>;
