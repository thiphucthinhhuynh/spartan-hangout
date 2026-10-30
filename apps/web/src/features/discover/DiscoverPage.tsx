import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPES, MESSAGES } from '@sh/shared';
import { Link } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { LinkButton } from '../../components/Button.js';
import { PlusIcon, SearchIcon, UsersIcon } from '../../components/icons.js';
import { ActivityList } from '../activities/ActivityList.js';
import { useRecommended } from './api.js';
import styles from './discover.module.css';

/**
 * Discover home (mockup p.2). Working assumptions until the team decides: the search box opens
 * /search and the category chips search by type (Q9); the list is FR14's Recommended list (Q10).
 */
export function DiscoverPage() {
  const recommended = useRecommended();

  return (
    <>
      <PageHeader
        title="Hey, Spartan!"
        subtitle="A little plan. A new connection."
        actions={
          <LinkButton to="/activities/new">
            <PlusIcon width={20} height={20} aria-hidden="true" /> Create
          </LinkButton>
        }
      />

      <Link to="/search" className={styles.searchEntry}>
        <SearchIcon width={20} height={20} aria-hidden="true" />
        <span>What do you want to do?</span>
      </Link>

      <nav className={styles.typeLinks} aria-label="Search by category">
        {ACTIVITY_TYPES.map((type) => (
          <Link key={type} to={`/search?type=${type}`} className={styles.typeLink}>
            {ACTIVITY_TYPE_LABELS[type]}
          </Link>
        ))}
      </nav>

      {/* Open question Q1: student discovery lives at /people, reached from here. */}
      <Link to="/people" className={styles.peopleLink}>
        <UsersIcon width={20} height={20} aria-hidden="true" />
        <span>Meet Spartans who share your interests</span>
      </Link>

      <section aria-labelledby="recommended-heading">
        <h2 id="recommended-heading" className={styles.sectionTitle}>
          Recommended for you
        </h2>
        <p className={styles.sectionHint}>
          Open activities that match your interests and fit your availability.
        </p>
        <ActivityList
          query={recommended}
          emptyTitle={MESSAGES.noMatchingActivities}
          emptyDescription="Try adding interests or availability to your profile, or search all activities."
        />
      </section>
    </>
  );
}
