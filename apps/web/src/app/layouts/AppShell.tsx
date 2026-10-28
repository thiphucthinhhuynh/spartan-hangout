import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { CalendarIcon, CompassIcon, MessageIcon, UserIcon } from '../../components/icons.js';
import { Logo } from '../../components/Logo.js';
import styles from './AppShell.module.css';

const tabs: { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { to: '/', label: 'Discover', Icon: CompassIcon },
  { to: '/plans', label: 'My plans', Icon: CalendarIcon },
  { to: '/inbox', label: 'Inbox', Icon: MessageIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
];

/**
 * Responsive app frame (architecture §12.3). Phones: header + content + bottom tab bar, as in the
 * mockups. Tablets: left icon rail. Desktop: full left sidebar. Same links at every size.
 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <div className={styles.sidebar}>
        {/* The sidebar's background spans the whole page; its contents stay in view. */}
        <div className={styles.sidebarSticky}>
          <header className={styles.header}>
            <Logo collapsible />
          </header>

          <nav className={styles.nav} aria-label="Main">
            {tabs.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [styles.tab, isActive && styles.active].filter(Boolean).join(' ')
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <main id="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      {/* New pages start at the top; Back returns to where you were. */}
      <ScrollRestoration />
    </div>
  );
}
