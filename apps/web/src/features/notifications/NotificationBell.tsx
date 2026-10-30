import { NavLink } from 'react-router';
import { BellIcon } from '../../components/icons.js';
import styles from './notifications.module.css';
import { useUnreadCount } from './api.js';

/** The header bell with the unread badge (mockup p.2, open question Q21). */
export function NotificationBell() {
  const count = useUnreadCount().data?.count ?? 0;
  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications';

  return (
    <NavLink
      to="/notifications"
      aria-label={label}
      className={({ isActive }) =>
        [styles.bell, isActive && styles.bellActive].filter(Boolean).join(' ')
      }
    >
      <BellIcon />
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </NavLink>
  );
}
