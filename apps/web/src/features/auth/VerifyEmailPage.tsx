import { ErrorCode } from '@sh/shared';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LinkButton } from '../../components/Button.js';
import { CheckIcon, XIcon } from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { useVerifyEmail } from './api.js';
import styles from './auth.module.css';
import { ResendLinkForm } from './ResendLinkForm.js';

/** Target of the emailed link: /verify-email?token=… (FR03–FR04). */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verify = useVerifyEmail();
  const { mutate } = verify;
  // A link works only once, so React's development double-effect must not send it twice.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    mutate({ token });
  }, [token, mutate]);

  if (!token || verify.isError) {
    const expired =
      verify.error instanceof ApiError && verify.error.code === ErrorCode.TOKEN_EXPIRED;
    return (
      <>
        <div className={styles.statusIcon} aria-hidden="true">
          <XIcon width={32} height={32} />
        </div>
        <div className={`${styles.intro} ${styles.center}`}>
          <h1 className={styles.title}>
            {expired ? 'This link has expired' : "We couldn't verify you"}
          </h1>
          <p className={styles.lead} role="alert">
            {verify.error?.message ?? 'This verification link is missing its token.'}
          </p>
        </div>
        <section aria-label="Resend verification link">
          <p className={styles.lead}>Enter your SJSU email and we'll send a new link:</p>
          <ResendLinkForm />
        </section>
        <p className={styles.footer}>
          New here? <Link to="/register">Create account</Link>
        </p>
      </>
    );
  }

  if (verify.isSuccess) {
    return (
      <>
        <div className={styles.statusIcon} aria-hidden="true">
          <CheckIcon width={32} height={32} />
        </div>
        <div className={`${styles.intro} ${styles.center}`}>
          <h1 className={styles.title}>You're verified, Spartan!</h1>
          <p className={styles.lead} role="status">
            {verify.data.message}
          </p>
        </div>
        <LinkButton to="/" fullWidth>
          Continue
        </LinkButton>
      </>
    );
  }

  return (
    <p className={`${styles.lead} ${styles.center}`} role="status">
      Verifying your email…
    </p>
  );
}
