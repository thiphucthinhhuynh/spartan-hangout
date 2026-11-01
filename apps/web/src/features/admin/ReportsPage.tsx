import { ActivityStatus, REPORT_REASON_LABELS, ReportStatus, type ReportDto } from '@sh/shared';
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Button } from '../../components/Button.js';
import { Chip } from '../../components/Chip.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ShieldCheckIcon } from '../../components/icons.js';
import { formatDateTime } from '../../lib/format.js';
import styles from './admin.module.css';
import { useMarkReviewed, useReports } from './api.js';

const FILTERS: { label: string; status: ReportStatus | undefined }[] = [
  { label: 'All', status: undefined },
  { label: 'Pending', status: ReportStatus.PENDING },
  { label: 'Reviewed', status: ReportStatus.REVIEWED },
];

/** Report review (FR53, administrators only): every report, and marking Pending ones Reviewed. */
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const status = FILTERS.find((filter) => filter.status === params.get('status'))?.status;
  const reports = useReports(status);

  let content;
  if (reports.isPending) {
    content = <EmptyState title="Loading reports…" />;
  } else if (reports.isError) {
    content = (
      <EmptyState
        title="We couldn't load the reports."
        description={reports.error.message}
        action={<Button onClick={() => void reports.refetch()}>Try again</Button>}
      />
    );
  } else {
    const items = reports.data.pages.flatMap((page) => page.items);
    content =
      items.length === 0 ? (
        <EmptyState icon={<ShieldCheckIcon />} title="No reports here." />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </ul>
          {reports.hasNextPage && (
            <Button
              variant="secondary"
              className={styles.more}
              disabled={reports.isFetchingNextPage}
              onClick={() => void reports.fetchNextPage()}
            >
              {reports.isFetchingNextPage ? 'Loading…' : 'Show more'}
            </Button>
          )}
        </>
      );
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Only administrators can see this page." />
      <div className={styles.filters} role="group" aria-label="Filter by status">
        {FILTERS.map((filter) => (
          <Chip
            key={filter.label}
            selected={status === filter.status}
            onClick={() => setParams(filter.status ? { status: filter.status } : {})}
          >
            {filter.label}
          </Chip>
        ))}
      </div>
      {content}
    </>
  );
}

function ReportTarget({ report }: { report: ReportDto }) {
  const { targetUser, targetActivity } = report;
  if (targetUser) {
    return (
      <>
        Student: <Link to={`/users/${targetUser.id}`}>{targetUser.displayName}</Link>
      </>
    );
  }
  if (targetActivity) {
    // Cancelled and Completed activities can only be opened by their own members (FR20, FR32).
    const live =
      targetActivity.status === ActivityStatus.OPEN ||
      targetActivity.status === ActivityStatus.FULL;
    return (
      <>
        Activity:{' '}
        {live ? (
          <Link to={`/activities/${targetActivity.id}`}>{targetActivity.title}</Link>
        ) : (
          `${targetActivity.title} (${targetActivity.status.toLowerCase()})`
        )}
      </>
    );
  }
  return <>The reported account or activity was deleted.</>;
}

function ReportCard({ report }: { report: ReportDto }) {
  const markReviewed = useMarkReviewed();
  const pending = report.status === ReportStatus.PENDING;
  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.reason}>{REPORT_REASON_LABELS[report.reason]}</h2>
        <span className={pending ? styles.pending : styles.reviewed}>
          {pending ? 'Pending' : 'Reviewed'}
        </span>
      </div>
      <p className={styles.target}>
        <ReportTarget report={report} />
      </p>
      {report.description && <p className={styles.description}>{report.description}</p>}
      <p className={styles.meta}>
        Reported by {report.reporter.displayName} · {formatDateTime(report.createdAt)}
      </p>
      {report.reviewedAt && report.reviewedBy && (
        <p className={styles.meta}>
          Reviewed by {report.reviewedBy.displayName} · {formatDateTime(report.reviewedAt)}
        </p>
      )}
      {pending && (
        <Button
          variant="secondary"
          className={styles.action}
          disabled={markReviewed.isPending}
          onClick={() => markReviewed.mutate(report.id)}
        >
          {markReviewed.isPending ? 'Saving…' : 'Mark Reviewed'}
        </Button>
      )}
      {markReviewed.isError && (
        <p className={styles.error} role="alert">
          {markReviewed.error.message}
        </p>
      )}
    </li>
  );
}
