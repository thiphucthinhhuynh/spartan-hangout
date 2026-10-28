import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet } from 'react-router';
import { CalendarIcon, CompassIcon, MessageIcon, UserIcon } from '../../components/icons.js';
import { Logo } from '../../components/Logo.js';
import styles from './AppShell.module.css';

const tabs: { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { to: '/', label: 'Discover', Icon: CompassIcon },
  { to: '/plans', label: 'My plans', Icon: CalendarIcon },
  { to: '/inbox', label: 'Inbox', Icon: MessageIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
];

/** Header + page content + bottom tab bar, as in the mockups. */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Logo />
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

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
  );
}
