import { ErrorCode } from '@sh/shared';
import { useEffect, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ArrowLeftIcon, MessageIcon, UserIcon } from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { useCurrentUser } from '../auth/api.js';
import styles from '../chat/chat.module.css';
import { MessageBubble } from '../chat/MessageBubble.js';
import { MessageComposer } from '../chat/MessageComposer.js';
import { useStudentProfile } from '../profile/api.js';
import { useConversationThread, useSendDirectMessage } from './api.js';

/** A one-to-one conversation (FR47–FR48): oldest first, polled every 5 s, connected students only. */
export function ConversationPage() {
  const { userId = '' } = useParams();
  const me = useCurrentUser();
  const isMe = userId === me.id;
  const student = useStudentProfile(userId, { enabled: !isMe });
  const connected = student.data?.connectionState === 'connected';
  const thread = useConversationThread(userId, { enabled: !isMe && connected });
  const send = useSendDirectMessage(userId);
  const endRef = useRef<HTMLDivElement>(null);
  const count = thread.data?.length ?? 0;

  // Keep the newest message in view as messages arrive.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  if (isMe) return <Navigate to="/inbox" replace />;
  if (student.isPending) return <EmptyState title="Loading conversation…" />;
  if (student.isError) {
    const notFound = student.error instanceof ApiError && student.error.status === 404;
    return (
      <EmptyState
        icon={<UserIcon />}
        title={notFound ? "We couldn't find that student." : "We couldn't load this conversation."}
        description={notFound ? undefined : student.error.message}
        action={
          <LinkButton to="/inbox" variant="secondary">
            Back to Inbox
          </LinkButton>
        }
      />
    );
  }

  // FR48: the profile may be a moment old, so the thread's own refusal counts too.
  const notConnected =
    !connected ||
    (thread.error instanceof ApiError && thread.error.code === ErrorCode.NOT_CONNECTED);
  const { displayName } = student.data;

  return (
    <section className={styles.page} aria-labelledby="conversation-title">
      <Link to="/inbox" className={styles.back}>
        <ArrowLeftIcon width={18} height={18} aria-hidden="true" /> Inbox
      </Link>
      <h1 id="conversation-title" className={styles.title}>
        <Link to={`/users/${userId}`} className={styles.titleLink}>
          {displayName}
        </Link>
      </h1>

      {notConnected ? (
        <EmptyState
          icon={<MessageIcon />}
          title={`You're not connected with ${displayName}.`}
          description="Only connected students can read and send messages."
          action={<LinkButton to={`/users/${userId}`}>View profile</LinkButton>}
        />
      ) : thread.isPending ? (
        <p className={styles.hint}>Loading messages…</p>
      ) : thread.isError ? (
        <EmptyState title="We couldn't load the messages." description={thread.error.message} />
      ) : (
        <>
          {thread.data.length === 0 ? (
            <p className={styles.hint}>No messages yet. Say hi to {displayName}!</p>
          ) : (
            <ol className={styles.messages} aria-label="Messages" aria-live="polite">
              {thread.data.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  mine={message.sender.id === me.id}
                />
              ))}
            </ol>
          )}
          <div ref={endRef} />
          <MessageComposer send={send} />
        </>
      )}
    </section>
  );
}
