import { MESSAGES } from '@sh/shared';
import { Link, useParams } from 'react-router';
import { LinkButton } from '../../components/Button.js';
import { UsersIcon } from '../../components/icons.js';
import styles from './activities.module.css';
import { useActivity } from './api.js';

/** Shown when the last spot was taken first (mockup p.5 · FR23). */
export function ActivityFullPage() {
  const { id = '' } = useParams();
  const activity = useActivity(id).data;
  // Similar activities = the same category (open question Q9: chips search by type).
  const similar = activity ? `/search?type=${activity.type}` : '/search';

  return (
    <section className={styles.result} aria-labelledby="result-title">
      <span className={styles.resultIcon}>
        <UsersIcon width={40} height={40} aria-hidden="true" />
      </span>
      <h1 id="result-title" className={styles.resultTitle}>
        {MESSAGES.activityFull}
      </h1>
      <p className={styles.resultLead}>
        {activity ? (
          <>
            Every spot in <strong>{activity.title}</strong> is taken. A spot opens up if someone
            leaves.
          </>
        ) : (
          'Every spot is taken. A spot opens up if someone leaves.'
        )}
      </p>

      <div className={styles.resultActions}>
        <LinkButton to={similar} fullWidth>
          Find similar activities
        </LinkButton>
        <LinkButton to={`/activities/${id}`} variant="secondary" fullWidth>
          Back to activity
        </LinkButton>
      </div>
      <Link to="/" className={styles.resultLink}>
        Back to Discover
      </Link>
    </section>
  );
}
