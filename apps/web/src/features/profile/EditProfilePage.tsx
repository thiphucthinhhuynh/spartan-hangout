import { profileUpdateSchema, type ActivityType, type OwnProfileDto } from '@sh/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Button, LinkButton } from '../../components/Button.js';
import { Card } from '../../components/Card.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ArrowLeftIcon, LockIcon } from '../../components/icons.js';
import { TextField } from '../../components/TextField.js';
import { ApiError } from '../../lib/apiClient.js';
import { focusFirstInvalidField, validateForm, type FieldErrors } from '../../lib/zodForm.js';
import { useMyProfile, useUpdateProfile } from './api.js';
import { AvailabilityEditor, type SlotDraft } from './AvailabilityEditor.js';
import { InterestPicker } from './InterestPicker.js';
import styles from './profile.module.css';

/** Edit display name, interests and availability (FR05–FR06). The SJSU email can't change. */
export function EditProfilePage() {
  const profile = useMyProfile();

  if (profile.isPending) return <EmptyState title="Loading your profile…" />;
  if (profile.isError) {
    return (
      <EmptyState
        title="We couldn't load your profile."
        description={profile.error.message}
        action={<Button onClick={() => void profile.refetch()}>Try again</Button>}
      />
    );
  }
  return <EditProfileForm profile={profile.data} />;
}

interface FormValues {
  displayName: string;
  interests: ActivityType[];
  availability: SlotDraft[];
}

function EditProfileForm({ profile }: { profile: OwnProfileDto }) {
  const navigate = useNavigate();
  const update = useUpdateProfile();
  const [values, setValues] = useState<FormValues>({
    displayName: profile.displayName,
    interests: profile.interests,
    availability: profile.availability.map((slot) => ({ ...slot })),
  });
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});

  const validation = validateForm(profileUpdateSchema, values);
  const errors = {
    ...(attempted && !validation.success ? validation.errors : {}),
    ...serverErrors,
  };
  const unexpectedError =
    update.isError && !(update.error instanceof ApiError && update.error.fields);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setServerErrors({});
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    // FR06: nothing is sent, and nothing saved, until every field is valid.
    if (!validation.success) return focusFirstInvalidField();
    update.mutate(validation.data, {
      onSuccess: () => navigate('/profile'),
      onError: (err) => {
        if (err instanceof ApiError && err.fields) setServerErrors(err.fields);
        focusFirstInvalidField();
      },
    });
  }

  return (
    <>
      <Link to="/profile" className={styles.backLink}>
        <ArrowLeftIcon width={18} height={18} aria-hidden="true" /> Back to profile
      </Link>
      <PageHeader title="Edit profile" subtitle="Keep your interests and free times current." />

      <Card className={styles.formCard}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="SJSU email"
            value={profile.email}
            readOnly
            disabled
            icon={<LockIcon width={18} height={18} />}
            hint="Your SJSU email can't be changed, and only you can see it."
          />
          <TextField
            label="Display name"
            autoComplete="nickname"
            maxLength={50}
            value={values.displayName}
            onChange={(e) => set('displayName', e.target.value)}
            error={errors.displayName}
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
              {unexpectedError
                ? update.error.message
                : 'Please fix the highlighted fields. Nothing was saved.'}
            </p>
          )}

          <div className={styles.formActions}>
            <LinkButton to="/profile" variant="secondary">
              Cancel
            </LinkButton>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

function firstErrorWithPrefix(errors: FieldErrors, prefix: string) {
  return Object.entries(errors).find(([key]) => key.startsWith(prefix))?.[1];
}
