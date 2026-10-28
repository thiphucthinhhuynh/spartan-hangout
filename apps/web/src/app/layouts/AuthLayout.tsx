import { Link, Outlet, ScrollRestoration } from 'react-router';
import { MapPinIcon } from '../../components/icons.js';
import { Logo } from '../../components/Logo.js';
import styles from './AuthLayout.module.css';

/**
 * Signed-out screens (mockup p.1). Phones: one white column. Tablets: the same column as a card.
 * Desktop: split screen with a brand panel on the left.
 */
export function AuthLayout() {
  return (
    <div className={styles.page}>
      <div className={styles.brand} aria-hidden="true">
        {/* The panel's background spans the whole page; its contents stay in view while scrolling. */}
        <div className={styles.brandSticky}>
          <svg className={styles.brandMark} viewBox="0 0 32 32">
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M7 24v-8a9 9 0 0 1 18 0v8zM11 13h10v3h-3.5v8h-3v-8H11z"
            />
          </svg>
          <div className={styles.brandText}>
            <span className={styles.brandPill}>
              <MapPinIcon width={18} height={18} /> Small campus. Big connections.
            </span>
            <p className={styles.brandCaption}>SJSU student community</p>
          </div>
        </div>
      </div>

      <div className={styles.column}>
        <header className={styles.header}>
          <Link to="/" className={styles.home} aria-label="Spartan Hangout home">
            <Logo />
          </Link>
          <p className={styles.badge}>
            <strong>SJSU</strong>
            <span>Student community</span>
          </p>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
        <ScrollRestoration />
      </div>
    </div>
  );
}
