import { Link } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Avatar } from '../../components/Avatar.js';
import { Button, LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { MessageIcon, UsersIcon } from '../../components/icons.js';
import { formatDateTime } from '../../lib/format.js';
import { useCurrentUser } from '../auth/api.js';
import { useConversations } from './api.js';
import styles from './inbox.module.css';

/** The Inbox tab: conversations, most recent first (FR49). Requests are one tap away (Q21). */
export function ConversationsPage() {
  const me = useCurrentUser();
  const conversations = useConversations();

  let content;
  if (conversations.isPending) {
    content = <EmptyState title="Loading conversations…" />;
  } else if (conversations.isError) {
    content = (
      <EmptyState
        title="We couldn't load your conversations."
        description={conversations.error.message}
        action={<Button onClick={() => void conversations.refetch()}>Try again</Button>}
      />
    );
  } else if (conversations.data.length === 0) {
    content = (
      <EmptyState
        icon={<MessageIcon />}
        title="No messages yet"
        description="Open a connection's profile and tap Message to start a conversation."
        action={
          <LinkButton to="/people" variant="secondary">
            Meet Spartans
          </LinkButton>
        }
      />
    );
  } else {
    content = (
      <ul className={styles.list}>
        {conversations.data.map(({ otherUser, lastMessage, lastMessageAt }) => (
          <li key={otherUser.id}>
            <Link to={`/inbox/${otherUser.id}`} className={styles.row}>
              <Avatar name={otherUser.displayName} seed={otherUser.id} />
              <span className={styles.rowBody}>
                <span className={styles.rowName}>{otherUser.displayName}</span>
                <span className={styles.preview}>
                  {lastMessage.senderId === me.id ? `You: ${lastMessage.body}` : lastMessage.body}
                </span>
                <time className={styles.time} dateTime={lastMessageAt}>
                  {formatDateTime(lastMessageAt)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        actions={
          <LinkButton to="/people/requests" variant="secondary">
            <UsersIcon width={20} height={20} aria-hidden="true" /> Connections
          </LinkButton>
        }
      />
      {content}
    </>
  );
}
