import { ActivityStatus, MESSAGES } from '@sh/shared';
import { Link, useNavigate, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar.js';
import { Button, LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, PencilIcon } from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { formatActivityDay, formatActivityTimes } from '../../lib/format.js';
import { useCurrentUser } from '../auth/api.js';
import styles from './activities.module.css';
import { ActivityTypeArt, TypeChip } from './ActivityTypeArt.js';
import { useActivity } from './api.js';
import { SpotsBar } from './SpotsBar.js';

const STATUS_LABELS: Partial<Record<ActivityStatus, string>> = {
  FULL: 'Full',
  CANCELLED: MESSAGES.cancelledLabel,
  COMPLETED: 'Completed',
};

/** Activity details (mockup p.4 · FR18). Joining (M6) and cancelling (M7) come later. */
export function ActivityDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const me = useCurrentUser();
  const query = useActivity(id);

  if (query.isPending) return <EmptyState title="Loading activity…" />;
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <EmptyState
        title={notFound ? "We couldn't find that activity." : "We couldn't load this activity."}
        description={notFound ? undefined : query.error.message}
        action={
          notFound ? (
            <LinkButton to="/" variant="secondary">
              Back to Discover
            </LinkButton>
          ) : (
            <Button onClick={() => void query.refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const activity = query.data;
  const statusLabel = STATUS_LABELS[activity.status];
  const organizer = activity.organizer;
  const hostIsMe = organizer.id === me.id;

  return (
    <article className={styles.detail}>
      <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
        <ArrowLeftIcon width={18} height={18} aria-hidden="true" /> Back
      </button>

      {/* Phones read top to bottom in the mockup's order (p.4): art, title, when/where/host and
          spots, then the description. Desktop puts the details card in a right-hand column. */}
      <div className={styles.detailArt}>
        <ActivityTypeArt type={activity.type} />
      </div>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{activity.title}</h1>
        <div className={styles.tags}>
          <TypeChip type={activity.type} />
          {statusLabel && <span className={styles.statusBadge}>{statusLabel}</span>}
        </div>
        {activity.status === ActivityStatus.CANCELLED && activity.cancellationReason && (
          <p className={styles.notice}>Cancelled: {activity.cancellationReason}</p>
        )}
      </div>

      <aside className={styles.detailSide} aria-label="Activity details">
        <div className={styles.sideCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>
              <CalendarIcon width={22} height={22} aria-hidden="true" />
            </span>
            <div>
              <p className={styles.infoPrimary}>{formatActivityDay(activity.startAt)}</p>
              <p className={styles.infoSecondary}>
                {formatActivityTimes(activity.startAt, activity.endAt)}
              </p>
            </div>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>
              <MapPinIcon width={22} height={22} aria-hidden="true" />
            </span>
            <p className={styles.infoPrimary}>{activity.location}</p>
          </div>

          <div className={styles.host}>
            <Avatar name={organizer.displayName} seed={organizer.id ?? ''} />
            <p>
              {hostIsMe ? (
                <strong>You're hosting</strong>
              ) : organizer.id ? (
                <>
                  Hosted by <Link to={`/users/${organizer.id}`}>{organizer.displayName}</Link>
                </>
              ) : (
                <>Hosted by {organizer.displayName}</>
              )}
            </p>
          </div>

          <SpotsBar count={activity.participantCount} limit={activity.participantLimit} />

          {activity.canEdit ? (
            <LinkButton to={`/activities/${activity.id}/edit`} variant="secondary" fullWidth>
              <PencilIcon width={18} height={18} aria-hidden="true" /> Edit activity
            </LinkButton>
          ) : (
            activity.viewerRole === 'none' &&
            activity.status === ActivityStatus.OPEN && (
              <p className={styles.fieldHint}>Joining activities arrives in Milestone 6.</p>
            )
          )}
        </div>
      </aside>

      <section className={styles.about} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.sectionTitle}>
          About this activity
        </h2>
        <p className={styles.description}>{activity.description}</p>
      </section>
    </article>
  );
}
