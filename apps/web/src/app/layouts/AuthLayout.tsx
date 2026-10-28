import { Link, Outlet } from 'react-router';
import { Logo } from '../../components/Logo.js';
import styles from './AuthLayout.module.css';

/** Layout for signed-out screens: logo header, no bottom navigation (mockup p.1). */
export function AuthLayout() {
  return (
    <div className={styles.page}>
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
    </div>
  );
}
