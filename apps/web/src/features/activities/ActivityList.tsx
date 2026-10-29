import type { ActivityCardDto, Paged } from '@sh/shared';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { Button } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ActivityCard } from './ActivityCard.js';
import styles from './ActivityCard.module.css';

interface ActivityListProps {
  query: UseInfiniteQueryResult<InfiniteData<Paged<ActivityCardDto>>>;
  /** The FR15 / FR17 message for an empty list. */
  emptyTitle: string;
  emptyDescription?: string;
}

/** A paged list of activity cards with loading, error, empty and "Show more" states. */
export function ActivityList({ query, emptyTitle, emptyDescription }: ActivityListProps) {
  if (query.isPending) return <EmptyState title="Loading activities…" />;
  if (query.isError) {
    return (
      <EmptyState
        title="We couldn't load activities."
        description={query.error.message}
        action={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  const activities = query.data.pages.flatMap((page) => page.items);
  if (activities.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <ul className={styles.list}>
        {activities.map((activity) => (
          <li key={activity.id}>
            <ActivityCard activity={activity} />
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="secondary"
          className={styles.more}
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Show more'}
        </Button>
      )}
    </>
  );
}
