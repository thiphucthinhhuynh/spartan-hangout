import { LIMITS } from '@sh/shared';
import { useLocation } from 'react-router';
import { MailIcon } from '../../components/icons.js';
import styles from './auth.module.css';
import { ResendLinkForm } from './ResendLinkForm.js';

/** Shown after registering (FR03). The account stays inactive until the link is used. */
export function CheckEmailPage() {
  const email = (useLocation().state as { email?: string } | null)?.email;

  return (
    <>
      <div className={styles.statusIcon} aria-hidden="true">
        <MailIcon width={32} height={32} />
      </div>
      <div className={`${styles.intro} ${styles.center}`}>
        <h1 className={styles.title}>Check your SJSU inbox</h1>
        <p className={styles.lead}>
          We sent a verification link to {email ? <strong>{email}</strong> : 'your SJSU email'}.
          Open it within {LIMITS.verificationLinkHours} hours to activate your account.
        </p>
      </div>

      {import.meta.env.DEV && (
        <p className={styles.devNote}>
          Development: emails aren't sent. Copy the link from the API console output.
        </p>
      )}

      <section aria-label="Resend verification link">
        <p className={styles.lead}>Didn't get it?</p>
        <ResendLinkForm defaultEmail={email} />
      </section>
    </>
  );
}
