import { Link, useParams } from 'react-router';
import { Button, LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { CalendarIcon, CheckIcon, MapPinIcon } from '../../components/icons.js';
import { formatActivityDay, formatActivityTimes } from '../../lib/format.js';
import styles from './activities.module.css';
import { useActivity } from './api.js';

/** "You're in, Spartan!" after a successful join (mockup p.6 · FR22). Group chat arrives in M8. */
export function JoinSuccessPage() {
  const { id = '' } = useParams();
  const query = useActivity(id);

  if (query.isPending) return <EmptyState title="Loading activity…" />;
  if (query.isError) {
    return (
      <EmptyState
        title="We couldn't load this activity."
        description={query.error.message}
        action={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  const activity = query.data;
  return (
    <section className={styles.result} aria-labelledby="result-title">
      <span className={`${styles.resultIcon} ${styles.resultSuccess}`}>
        <CheckIcon width={40} height={40} aria-hidden="true" />
      </span>
      <h1 id="result-title" className={styles.resultTitle}>
        You're in, Spartan!
      </h1>
      <p className={styles.resultLead}>
        You've joined <strong>{activity.title}</strong>. The organizer has been told you're coming.
      </p>

      <div className={styles.resultCard}>
        <p className={styles.infoRow}>
          <CalendarIcon width={20} height={20} aria-hidden="true" />
          <span>
            {formatActivityDay(activity.startAt)}
            <br />
            <span className={styles.infoSecondary}>
              {formatActivityTimes(activity.startAt, activity.endAt)}
            </span>
          </span>
        </p>
        <p className={styles.infoRow}>
          <MapPinIcon width={20} height={20} aria-hidden="true" />
          <span>{activity.location}</span>
        </p>
      </div>

      <div className={styles.resultActions}>
        <LinkButton to={`/activities/${activity.id}`} fullWidth>
          View activity
        </LinkButton>
        <LinkButton to="/plans" variant="secondary" fullWidth>
          See my plans
        </LinkButton>
      </div>
      <Link to="/" className={styles.resultLink}>
        Back to Discover
      </Link>
    </section>
  );
}
