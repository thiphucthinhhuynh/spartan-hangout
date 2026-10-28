import { utcToCampusParts, type ActivityDetailDto } from '@sh/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Button, LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { ArrowLeftIcon } from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { focusFirstInvalidField, type FieldErrors } from '../../lib/zodForm.js';
import styles from './activities.module.css';
import { ActivityForm, type ActivityFormValues } from './ActivityForm.js';
import { useActivity, useUpdateActivity } from './api.js';

/** Edit an activity (FR29–FR30): organizer only, while Open or Full and before it starts. */
export function EditActivityPage() {
  const { id = '' } = useParams();
  const activity = useActivity(id);

  if (activity.isPending) return <EmptyState title="Loading activity…" />;
  if (activity.isError) {
    return (
      <EmptyState
        title="We couldn't load this activity."
        description={activity.error.message}
        action={
          <LinkButton to="/" variant="secondary">
            Back to Discover
          </LinkButton>
        }
      />
    );
  }
  if (!activity.data.canEdit) {
    return (
      <EmptyState
        title="This activity can't be edited."
        description="Only the organizer can edit an open activity, and only before it starts."
        action={
          <LinkButton to={`/activities/${id}`} variant="secondary">
            Back to activity
          </LinkButton>
        }
      />
    );
  }
  return <EditActivityForm activity={activity.data} />;
}

function toFormValues(activity: ActivityDetailDto): ActivityFormValues {
  const start = utcToCampusParts(new Date(activity.startAt));
  return {
    title: activity.title,
    description: activity.description,
    type: activity.type,
    date: start.date,
    startTime: start.time,
    endTime: utcToCampusParts(new Date(activity.endAt)).time,
    location: activity.location,
    participantLimit: activity.participantLimit,
  };
}

function EditActivityForm({ activity }: { activity: ActivityDetailDto }) {
  const navigate = useNavigate();
  const update = useUpdateActivity(activity.id);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const detailPath = `/activities/${activity.id}`;

  return (
    <div className={styles.formPage}>
      <Link to={detailPath} className={styles.backLink}>
        <ArrowLeftIcon width={18} height={18} aria-hidden="true" /> Back to activity
      </Link>
      <PageHeader
        title="Edit activity"
        subtitle={`${activity.participantCount} going. Changes to the title, category, date, times or location notify them.`}
      />
      <div className={styles.formCard}>
        <ActivityForm
          initialValues={toFormValues(activity)}
          serverErrors={serverErrors}
          formError={formError}
          onChange={() => {
            setServerErrors({});
            setFormError(null);
          }}
          onSubmit={(values) =>
            update.mutate(values, {
              onSuccess: () => navigate(detailPath),
              onError: (err) => {
                // VALIDATION_FAILED and LIMIT_BELOW_COUNT point at fields; the rest don't.
                if (err instanceof ApiError && err.fields) {
                  setServerErrors(err.fields);
                  focusFirstInvalidField();
                } else {
                  setFormError(err.message);
                }
              },
            })
          }
          footer={
            <div className={styles.formActions}>
              <LinkButton to={detailPath} variant="secondary">
                Cancel
              </LinkButton>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
