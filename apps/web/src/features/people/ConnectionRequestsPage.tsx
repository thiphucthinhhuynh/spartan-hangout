import type { ConnectionRequestDto } from '@sh/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Avatar } from '../../components/Avatar.js';
import { Button } from '../../components/Button.js';
import { formatDateTime } from '../../lib/format.js';
import { useAnswerConnectionRequest, useConnectionRequests, useConnections } from './api.js';
import styles from './people.module.css';
import { StudentList } from './StudentList.js';

/** Pending requests (FR46: Accept or Decline) and the student's connections (FR13). */
export function ConnectionRequestsPage() {
  const incoming = useConnectionRequests('incoming');
  const outgoing = useConnectionRequests('outgoing');
  const connections = useConnections();

  return (
    <>
      <PageHeader title="Connections" />

      <section className={styles.section} aria-labelledby="incoming-heading">
        <h2 id="incoming-heading" className={styles.sectionTitle}>
          Requests for you
        </h2>
        <RequestList
          query={incoming}
          empty="No requests right now."
          renderActions={(request) => <AnswerButtons request={request} />}
        />
      </section>

      <section className={styles.section} aria-labelledby="outgoing-heading">
        <h2 id="outgoing-heading" className={styles.sectionTitle}>
          Requests you sent
        </h2>
        <RequestList
          query={outgoing}
          empty="You haven't sent any requests."
          renderActions={() => <span className={styles.muted}>Waiting</span>}
        />
      </section>

      <section className={styles.section} aria-labelledby="connections-heading">
        <h2 id="connections-heading" className={styles.sectionTitle}>
          Your connections
        </h2>
        <StudentList
          query={connections}
          emptyTitle="No connections yet"
          emptyDescription="Meet Spartans who share your interests and send them a request."
        />
      </section>
    </>
  );
}

function RequestList({
  query,
  empty,
  renderActions,
}: {
  query: ReturnType<typeof useConnectionRequests>;
  empty: string;
  renderActions: (request: ConnectionRequestDto) => ReactNode;
}) {
  if (query.isPending) return <p className={styles.muted}>Loading…</p>;
  if (query.isError) return <p className={styles.error}>{query.error.message}</p>;
  if (query.data.length === 0) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {query.data.map((request) => (
        <li key={request.id} className={styles.card}>
          <Avatar name={request.student.displayName} seed={request.student.id} />
          <div className={styles.cardBody}>
            <Link to={`/users/${request.student.id}`} className={styles.name}>
              {request.student.displayName}
            </Link>
            <p className={styles.muted}>{formatDateTime(request.createdAt)}</p>
          </div>
          <div className={styles.cardAction}>{renderActions(request)}</div>
        </li>
      ))}
    </ul>
  );
}

function AnswerButtons({ request }: { request: ConnectionRequestDto }) {
  const answer = useAnswerConnectionRequest();
  return (
    <div className={styles.answer}>
      <Button
        disabled={answer.isPending}
        onClick={() => answer.mutate({ id: request.id, accept: true })}
      >
        Accept<span className="sr-only"> {request.student.displayName}</span>
      </Button>
      <Button
        variant="secondary"
        disabled={answer.isPending}
        onClick={() => answer.mutate({ id: request.id, accept: false })}
      >
        Decline<span className="sr-only"> {request.student.displayName}</span>
      </Button>
      {answer.isError && (
        <p className={styles.error} role="alert">
          {answer.error.message}
        </p>
      )}
    </div>
  );
}
