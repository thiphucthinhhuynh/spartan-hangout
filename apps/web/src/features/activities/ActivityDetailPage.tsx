import { ActivityStatus, ErrorCode, MESSAGES } from '@sh/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar.js';
import { Button, LinkButton } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { CancelDialog } from './CancelDialog.js';
import { EmptyState } from '../../components/EmptyState.js';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  MapPinIcon,
  PencilIcon,
} from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { formatActivityDay, formatActivityTimes } from '../../lib/format.js';
import { useCurrentUser } from '../auth/api.js';
import styles from './activities.module.css';
import { ActivityTypeArt, TypeChip } from './ActivityTypeArt.js';
import { useActivity, useJoinActivity, useLeaveActivity } from './api.js';
import { ParticipantList } from './ParticipantList.js';
import { SpotsBar } from './SpotsBar.js';

const STATUS_LABELS: Partial<Record<ActivityStatus, string>> = {
  FULL: 'Full',
  CANCELLED: MESSAGES.cancelledLabel,
  COMPLETED: 'Completed',
};

/** Activity details (mockup p.4 · FR18–FR19, FR21, FR24, FR31–FR32). */
export function ActivityDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const me = useCurrentUser();
  const query = useActivity(id);
  const join = useJoinActivity(id);
  const leave = useLeaveActivity(id);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

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
  // FR21: a full activity has its own screen (mockup p.5); other reasons show inline.
  const joinError =
    join.error instanceof ApiError && join.error.code !== ErrorCode.ACTIVITY_FULL
      ? join.error.message
      : null;

  function handleJoin() {
    join.mutate(undefined, {
      onSuccess: () => navigate(`/activities/${activity.id}/joined`),
      onError: (err) => {
        if (err instanceof ApiError && err.code === ErrorCode.ACTIVITY_FULL) {
          navigate(`/activities/${activity.id}/full`);
        }
      },
    });
  }

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
        {activity.status === ActivityStatus.CANCELLED && (
          <p className={styles.notice}>
            The organizer cancelled this activity.
            {activity.cancellationReason && <> Reason: {activity.cancellationReason}</>}
          </p>
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

          {activity.canEdit && (
            <LinkButton to={`/activities/${activity.id}/edit`} variant="secondary" fullWidth>
              <PencilIcon width={18} height={18} aria-hidden="true" /> Edit activity
            </LinkButton>
          )}
          {activity.canJoin && (
            <Button fullWidth disabled={join.isPending} onClick={handleJoin}>
              {join.isPending ? 'Joining…' : 'Join activity'}
            </Button>
          )}
          {(joinError ?? activity.joinBlockedReason) && (
            <p className={styles.notice} role={joinError ? 'alert' : undefined}>
              {joinError ?? activity.joinBlockedReason}
            </p>
          )}
          {activity.viewerRole === 'participant' && (
            <p className={styles.going}>
              <CheckIcon width={18} height={18} aria-hidden="true" /> You're going
            </p>
          )}
          {activity.canLeave && (
            <Button variant="secondary" fullWidth onClick={() => setConfirmLeave(true)}>
              Leave activity
            </Button>
          )}
          {activity.canCancel && (
            <Button
              variant="ghost"
              fullWidth
              className={styles.dangerButton}
              onClick={() => setConfirmCancel(true)}
            >
              Cancel activity
            </Button>
          )}
        </div>
      </aside>

      <section className={styles.about} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.sectionTitle}>
          About this activity
        </h2>
        <p className={styles.description}>{activity.description}</p>
      </section>

      <section className={styles.participants} aria-labelledby="participants-heading">
        <h2 id="participants-heading" className={styles.sectionTitle}>
          Who's going
        </h2>
        {/* FR33: canEdit holds exactly when the organizer may remove participants. */}
        <ParticipantList activityId={activity.id} canRemove={activity.canEdit} />
      </section>

      <CancelDialog
        activityId={activity.id}
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        open={confirmLeave}
        title="Leave this activity?"
        confirmLabel="Leave"
        busy={leave.isPending}
        error={leave.error?.message}
        onCancel={() => {
          setConfirmLeave(false);
          leave.reset();
        }}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => setConfirmLeave(false) })}
      >
        <p>
          Your spot opens up for someone else and you'll lose access to the group chat. You can join
          again later if there's still room.
        </p>
      </ConfirmDialog>
    </article>
  );
}
