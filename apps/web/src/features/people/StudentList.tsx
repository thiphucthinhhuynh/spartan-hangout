import type { Paged, StudentCardDto } from '@sh/shared';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { Button } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import styles from './people.module.css';
import { StudentCard } from './StudentCard.js';

interface StudentListProps {
  query: UseInfiniteQueryResult<InfiniteData<Paged<StudentCardDto>>>;
  emptyTitle: string;
  emptyDescription?: string;
}

/** A paged list of student cards with loading, error, empty and "Show more" states. */
export function StudentList({ query, emptyTitle, emptyDescription }: StudentListProps) {
  if (query.isPending) return <EmptyState title="Loading students…" />;
  if (query.isError) {
    return (
      <EmptyState
        title="We couldn't load students."
        description={query.error.message}
        action={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }
  const students = query.data.pages.flatMap((page) => page.items);
  if (students.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <>
      <ul className={styles.list}>
        {students.map((student) => (
          <li key={student.id}>
            <StudentCard student={student} />
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
