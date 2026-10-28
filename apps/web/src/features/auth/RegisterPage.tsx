import { ErrorCode, registerSchema, type ActivityType } from '@sh/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/Button.js';
import { ArrowRightIcon, MailIcon } from '../../components/icons.js';
import { TextField } from '../../components/TextField.js';
import { ApiError } from '../../lib/apiClient.js';
import { focusFirstInvalidField, validateForm, type FieldErrors } from '../../lib/zodForm.js';
import { AvailabilityEditor, emptySlot, type SlotDraft } from '../profile/AvailabilityEditor.js';
import { InterestPicker } from '../profile/InterestPicker.js';
import { useRegister } from './api.js';
import styles from './auth.module.css';
import { ResendLinkForm } from './ResendLinkForm.js';

interface RegisterFormValues {
  email: string;
  password: string;
  displayName: string;
  interests: ActivityType[];
  availability: SlotDraft[];
}

/** Create account (US01 · FR01–FR03). */
export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [values, setValues] = useState<RegisterFormValues>({
    email: '',
    password: '',
    displayName: '',
    interests: [],
    availability: [emptySlot()],
  });
  // FR02: once the student tries to submit, every invalid field stays highlighted until fixed.
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);

  const validation = validateForm(registerSchema, values);
  const clientErrors = attempted && !validation.success ? validation.errors : {};
  const errors = { ...clientErrors, ...serverErrors };
  const unexpectedError =
    register.isError && !(register.error instanceof ApiError && register.error.fields);

  function set<K extends keyof RegisterFormValues>(key: K, value: RegisterFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setServerErrors({});
    if (key === 'email') setEmailTaken(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!validation.success) return focusFirstInvalidField();

    const email = validation.data.email;
    register.mutate(validation.data, {
      onSuccess: () => navigate('/register/check-email', { state: { email } }),
      onError: (err) => {
        if (!(err instanceof ApiError)) return;
        if (err.code === ErrorCode.EMAIL_TAKEN) {
          setServerErrors({ email: err.message });
          setEmailTaken(true);
        } else if (err.fields) {
          setServerErrors(err.fields);
        }
        focusFirstInvalidField();
      },
    });
  }

  return (
    <>
      <div className={styles.intro}>
        <h1 className={styles.title}>
          Your campus. <span className={styles.accent}>Your people.</span>
        </h1>
        <p className={styles.lead}>Create your account with your SJSU email to get started.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="SJSU email"
          type="email"
          autoComplete="email"
          placeholder="you@sjsu.edu"
          icon={<MailIcon width={20} height={20} />}
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Display name"
          autoComplete="nickname"
          hint="How other Spartans will see you. Your email stays private."
          maxLength={50}
          value={values.displayName}
          onChange={(e) => set('displayName', e.target.value)}
          error={errors.displayName}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
        />
        <InterestPicker
          value={values.interests}
          onChange={(interests) => set('interests', interests)}
          error={errors.interests ?? firstErrorWithPrefix(errors, 'interests.')}
        />
        <AvailabilityEditor
          value={values.availability}
          onChange={(availability) => set('availability', availability)}
          errors={errors}
        />

        {(unexpectedError || Object.keys(errors).length > 0) && (
          <p className={styles.alert} role="alert">
            {unexpectedError ? register.error.message : 'Please fix the highlighted fields.'}
          </p>
        )}

        <Button type="submit" fullWidth disabled={register.isPending}>
          {register.isPending ? (
            'Creating your account…'
          ) : (
            <>
              <ArrowRightIcon width={20} height={20} /> Create account
            </>
          )}
        </Button>
      </form>

      {emailTaken && (
        <section aria-label="Resend verification link">
          <p className={styles.lead}>Waiting on a verification email? Send a new link:</p>
          <ResendLinkForm defaultEmail={values.email} />
        </section>
      )}

      <p className={styles.trust}>Just Spartans. Verified with your SJSU email.</p>
      <p className={styles.footer}>
        <Link to="/">Back to Spartan Hangout</Link>
      </p>
    </>
  );
}

function firstErrorWithPrefix(errors: FieldErrors, prefix: string) {
  return Object.entries(errors).find(([key]) => key.startsWith(prefix))?.[1];
}
