import { Avatar } from '../../components/Avatar.js';
import { formatDateTime } from '../../lib/format.js';
import styles from './chat.module.css';

interface MessageBubbleProps {
  message: {
    body: string;
    createdAt: string;
    sender: { id: string | null; displayName: string };
  };
  mine: boolean;
  /** Shown before the sender, e.g. "Update" (FR39); also highlights the message. */
  label?: string | undefined;
}

/** One message in a group chat or DM thread: sender, time and text (FR36, FR47). */
export function MessageBubble({ message, mine, label }: MessageBubbleProps) {
  return (
    <li
      className={[styles.message, mine && styles.mine, label && styles.update]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar name={message.sender.displayName} seed={message.sender.id ?? ''} size="sm" />
      <div className={styles.bubble}>
        <p className={styles.meta}>
          {label && <span className={styles.updateLabel}>{label}</span>}
          <span className={styles.sender}>{mine ? 'You' : message.sender.displayName}</span>
          <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
        </p>
        <p className={styles.body}>{message.body}</p>
      </div>
    </li>
  );
}
