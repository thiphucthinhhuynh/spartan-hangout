import { resendVerificationSchema } from '@sh/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button.js';
import { MailIcon } from '../../components/icons.js';
import { TextField } from '../../components/TextField.js';
import { ApiError } from '../../lib/apiClient.js';
import { validateForm, type FieldErrors } from '../../lib/zodForm.js';
import { useResendVerification } from './api.js';
import styles from './auth.module.css';

/** "Send me a new link" (FR03). Used after registering, on expired links, and for taken emails. */
export function ResendLinkForm({ defaultEmail = '' }: { defaultEmail?: string | undefined }) {
  const [email, setEmail] = useState(defaultEmail);
  const [errors, setErrors] = useState<FieldErrors>({});
  const resend = useResendVerification();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateForm(resendVerificationSchema, { email });
    if (!result.success) return setErrors(result.errors);
    setErrors({});
    resend.mutate(result.data, {
      onError: (err) => setErrors(err instanceof ApiError && err.fields ? err.fields : {}),
    });
  }

  const unexpectedError =
    resend.isError && !(resend.error instanceof ApiError && resend.error.fields);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="SJSU email"
        type="email"
        autoComplete="email"
        placeholder="you@sjsu.edu"
        icon={<MailIcon width={20} height={20} />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <Button type="submit" variant="secondary" disabled={resend.isPending}>
        {resend.isPending ? 'Sending…' : 'Send a new verification link'}
      </Button>
      {resend.isSuccess && (
        <p className={styles.success} role="status">
          {resend.data.message}
        </p>
      )}
      {unexpectedError && (
        <p className={styles.alert} role="alert">
          {resend.error.message}
        </p>
      )}
    </form>
  );
}
