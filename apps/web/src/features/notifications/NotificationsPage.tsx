import type { NotificationDto } from '@sh/shared';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Button } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { BellIcon } from '../../components/icons.js';
import { formatDateTime } from '../../lib/format.js';
import { useMarkRead, useNotifications } from './api.js';
import { describeNotification } from './describe.js';
import styles from './notifications.module.css';

/** FR42: newest first; opening one marks it read and follows its link. */
export function NotificationsPage() {
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const navigate = useNavigate();

  function open(notification: NotificationDto, link: string | null) {
    if (!notification.read) markRead.mutate(notification.id);
    if (link) navigate(link);
  }

  let content;
  if (notifications.isPending) {
    content = <EmptyState title="Loading notifications…" />;
  } else if (notifications.isError) {
    content = (
      <EmptyState
        title="We couldn't load your notifications."
        description={notifications.error.message}
        action={<Button onClick={() => void notifications.refetch()}>Try again</Button>}
      />
    );
  } else {
    const items = notifications.data.pages.flatMap((page) => page.items);
    content =
      items.length === 0 ? (
        <EmptyState
          icon={<BellIcon />}
          title="No notifications yet"
          description="Changes to your activities, and students joining or leaving yours, show up here."
        />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((notification) => {
              const view = describeNotification(notification);
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={[styles.item, !notification.read && styles.unread]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => open(notification, view.link)}
                  >
                    {!notification.read && <span className="sr-only">Unread: </span>}
                    <span className={styles.itemTitle}>{view.title}</span>
                    {view.detail && <span className={styles.itemDetail}>{view.detail}</span>}
                    <span className={styles.itemTime}>
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {notifications.hasNextPage && (
            <Button
              variant="secondary"
              className={styles.more}
              disabled={notifications.isFetchingNextPage}
              onClick={() => void notifications.fetchNextPage()}
            >
              {notifications.isFetchingNextPage ? 'Loading…' : 'Show more'}
            </Button>
          )}
        </>
      );
  }

  return (
    <>
      <PageHeader title="Notifications" />
      {content}
    </>
  );
}
