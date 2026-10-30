import {
  ActivityMessageKind,
  ActivityStatus,
  LIMITS,
  MESSAGES,
  messageSchema,
  type ActivityMessageDto,
} from '@sh/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar.js';
import { Button, LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ArrowLeftIcon, MessageIcon } from '../../components/icons.js';
import { TextArea } from '../../components/TextArea.js';
import { ApiError } from '../../lib/apiClient.js';
import { formatDateTime } from '../../lib/format.js';
import { validateForm } from '../../lib/zodForm.js';
import { useActivity } from '../activities/api.js';
import { useCurrentUser } from '../auth/api.js';
import { useActivityMessages, useSendMessage } from './api.js';
import styles from './chat.module.css';

/**
 * An activity's group chat (FR35–FR39): oldest first, polled every 5 s. Organizers can also post
 * labeled updates. Read-only once the activity is Cancelled or Completed (FR37).
 */
export function ActivityChatPage() {
  const { id = '' } = useParams();
  const activity = useActivity(id);
  const isMember = activity.data !== undefined && activity.data.viewerRole !== 'none';
  const messages = useActivityMessages(id, { enabled: isMember });

  if (activity.isPending) return <EmptyState title="Loading chat…" />;
  if (activity.isError) {
    const notFound = activity.error instanceof ApiError && activity.error.status === 404;
    return (
      <EmptyState
        title={notFound ? "We couldn't find that activity." : "We couldn't load this chat."}
        action={
          <LinkButton to="/" variant="secondary">
            Back to Discover
          </LinkButton>
        }
      />
    );
  }

  const detail = activity.data;
  const readOnly =
    detail.status === ActivityStatus.CANCELLED || detail.status === ActivityStatus.COMPLETED;

  return (
    <section className={styles.page} aria-labelledby="chat-title">
      <Link to={`/activities/${id}`} className={styles.back}>
        <ArrowLeftIcon width={18} height={18} aria-hidden="true" /> {detail.title}
      </Link>
      <h1 id="chat-title" className={styles.title}>
        Group chat
      </h1>

      {!isMember ? (
        <EmptyState
          icon={<MessageIcon />}
          title="Only participants can see this chat."
          description="Join the activity to talk with everyone who's going."
          action={<LinkButton to={`/activities/${id}`}>View activity</LinkButton>}
        />
      ) : (
        <>
          <MessageList query={messages} />
          {readOnly ? (
            <p className={styles.readOnly}>
              This chat is read-only because the activity{' '}
              {detail.status === ActivityStatus.CANCELLED ? 'was cancelled' : 'has ended'}.
            </p>
          ) : (
            <Composer activityId={id} isOrganizer={detail.viewerRole === 'organizer'} />
          )}
        </>
      )}
    </section>
  );
}

function MessageList({ query }: { query: ReturnType<typeof useActivityMessages> }) {
  const me = useCurrentUser();
  const endRef = useRef<HTMLDivElement>(null);
  const count = query.data?.length ?? 0;

  // Keep the newest message in view as messages arrive.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  if (query.isPending) return <p className={styles.hint}>Loading messages…</p>;
  if (query.isError) {
    return (
      <EmptyState
        title="We couldn't load the messages."
        description={query.error.message}
        action={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }
  if (query.data.length === 0) {
    return <p className={styles.hint}>No messages yet. Say hi to everyone who's going!</p>;
  }

  return (
    <>
      <ol className={styles.messages} aria-label="Messages" aria-live="polite">
        {query.data.map((message) => (
          <Message key={message.id} message={message} mine={message.sender.id === me.id} />
        ))}
      </ol>
      <div ref={endRef} />
    </>
  );
}

function Message({ message, mine }: { message: ActivityMessageDto; mine: boolean }) {
  const isUpdate = message.kind === ActivityMessageKind.UPDATE;
  return (
    <li
      className={[styles.message, mine && styles.mine, isUpdate && styles.update]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar name={message.sender.displayName} seed={message.sender.id ?? ''} size="sm" />
      <div className={styles.bubble}>
        <p className={styles.meta}>
          {isUpdate && <span className={styles.updateLabel}>{MESSAGES.updateLabel}</span>}
          <span className={styles.sender}>{mine ? 'You' : message.sender.displayName}</span>
          <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
        </p>
        <p className={styles.body}>{message.body}</p>
      </div>
    </li>
  );
}

function Composer({ activityId, isOrganizer }: { activityId: string; isOrganizer: boolean }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | undefined>();
  const send = useSendMessage(activityId);
  const update = useSendMessage(activityId, { asUpdate: true });
  const busy = send.isPending || update.isPending;

  function submit(asUpdate: boolean) {
    const validation = validateForm(messageSchema, { body });
    if (!validation.success) return setError(validation.errors.body);
    (asUpdate ? update : send).mutate(validation.data, {
      onSuccess: () => {
        setBody('');
        setError(undefined);
      },
      onError: (err) => setError(err.message),
    });
  }

  return (
    <form
      className={styles.composer}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        submit(false);
      }}
      noValidate
    >
      <TextArea
        label="Message"
        rows={2}
        maxLength={LIMITS.messageBody.max}
        value={body}
        error={error}
        onChange={(e) => {
          setBody(e.target.value);
          setError(undefined);
        }}
      />
      <div className={styles.actions}>
        {isOrganizer && (
          <Button variant="secondary" disabled={busy} onClick={() => submit(true)}>
            Post as update
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {send.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {isOrganizer && (
        <p className={styles.hint}>Updates are labeled “Update” and notify everyone who's going.</p>
      )}
    </form>
  );
}
