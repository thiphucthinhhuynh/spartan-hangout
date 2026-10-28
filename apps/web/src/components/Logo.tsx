import styles from './Logo.module.css';

/** Helmet mark + "spartan hangout" wordmark from the mockups. */
export function Logo() {
  return (
    <span className={styles.logo}>
      <svg viewBox="0 0 32 32" width={40} height={40} aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--color-primary)" />
        <path
          fill="var(--color-accent)"
          fillRule="evenodd"
          d="M7 24v-8a9 9 0 0 1 18 0v8zM11 13h10v3h-3.5v8h-3v-8H11z"
        />
      </svg>
      <span className={styles.wordmark}>spartan hangout</span>
    </span>
  );
}
