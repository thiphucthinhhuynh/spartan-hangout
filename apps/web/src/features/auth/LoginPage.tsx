import { ErrorCode, loginSchema } from '@sh/shared';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/Button.js';
import { ArrowRightIcon, MailIcon, MapPinIcon, ShieldCheckIcon } from '../../components/icons.js';
import { TextField } from '../../components/TextField.js';
import { ApiError } from '../../lib/apiClient.js';
import { focusFirstInvalidField, validateForm } from '../../lib/zodForm.js';
import { useLogin, useMe } from './api.js';
import styles from './auth.module.css';
import { ResendLinkForm } from './ResendLinkForm.js';

/** Only same-site paths, so ?next= cannot send students to another website. */
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

/** Sign in (mockup p.1 · FR09–FR11). One form with email and password (open question Q8). */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const me = useMe();
  const login = useLogin();
  const [values, setValues] = useState({ email: '', password: '' });
  const [attempted, setAttempted] = useState(false);

  if (me.data) return <Navigate to={next} replace />;

  const validation = validateForm(loginSchema, values);
  const errors = attempted && !validation.success ? validation.errors : {};
  const apiError = login.error instanceof ApiError ? login.error : null;
  const notVerified = apiError?.code === ErrorCode.EMAIL_NOT_VERIFIED;

  function set(key: 'email' | 'password', value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (login.isError) login.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!validation.success) return focusFirstInvalidField();
    login.mutate(validation.data, { onSuccess: () => navigate(next, { replace: true }) });
  }

  return (
    <>
      <div className={styles.hero} aria-hidden="true">
        <svg className={styles.heroMark} viewBox="0 0 32 32">
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M7 24v-8a9 9 0 0 1 18 0v8zM11 13h10v3h-3.5v8h-3v-8H11z"
          />
        </svg>
        <span className={styles.heroPill}>
          <MapPinIcon width={18} height={18} /> Small campus. Big connections.
        </span>
      </div>

      <div className={styles.intro}>
        <h1 className={styles.title}>
          Your campus. <span className={`${styles.accent} ${styles.line}`}>Your people.</span>
        </h1>
        <p className={styles.lead}>
          Discover activities, find your crew, and make more of your time at SJSU.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Sign in with your SJSU email"
          type="email"
          autoComplete="email"
          placeholder="you@sjsu.edu"
          icon={<MailIcon width={20} height={20} />}
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
        />

        {login.isError && (
          <p className={styles.alert} role="alert">
            {login.error.message}
          </p>
        )}

        <Button type="submit" fullWidth disabled={login.isPending}>
          {login.isPending ? (
            'Signing in…'
          ) : (
            <>
              <ArrowRightIcon width={20} height={20} /> Continue with SJSU email
            </>
          )}
        </Button>
      </form>

      {notVerified && (
        <section aria-label="Resend verification link">
          <p className={styles.lead}>Need a new verification link?</p>
          <ResendLinkForm defaultEmail={values.email} />
        </section>
      )}

      <div className={styles.divider}>
        <span>or</span>
      </div>
      <p className={styles.footer}>
        New here? <Link to="/register">Create account</Link>
      </p>
      <p className={styles.trust}>
        <ShieldCheckIcon width={18} height={18} /> Just Spartans. Verified with your SJSU email.
      </p>
    </>
  );
}
