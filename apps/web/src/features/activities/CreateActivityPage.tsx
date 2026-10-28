import { ErrorCode } from '@sh/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Button } from '../../components/Button.js';
import { ArrowLeftIcon, PlusIcon } from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { focusFirstInvalidField, type FieldErrors } from '../../lib/zodForm.js';
import styles from './activities.module.css';
import { ActivityForm, emptyActivityForm } from './ActivityForm.js';
import { useCreateActivity } from './api.js';

/** Create Activity (mockup p.3 · FR26–FR28). */
export function CreateActivityPage() {
  const navigate = useNavigate();
  const create = useCreateActivity();
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className={styles.formPage}>
      <Link to="/" className={styles.backLink}>
        <ArrowLeftIcon width={18} height={18} aria-hidden="true" /> Cancel
      </Link>
      <PageHeader
        title="A little plan. Your people."
        subtitle="Bring Spartans together. Start with the details."
      />
      <div className={styles.formCard}>
        <ActivityForm
          initialValues={emptyActivityForm}
          serverErrors={serverErrors}
          formError={formError}
          onChange={() => {
            setServerErrors({});
            setFormError(null);
          }}
          onSubmit={(values) =>
            create.mutate(values, {
              onSuccess: (activity) => navigate(`/activities/${activity.id}`),
              onError: (err) => {
                if (
                  err instanceof ApiError &&
                  err.code === ErrorCode.VALIDATION_FAILED &&
                  err.fields
                ) {
                  setServerErrors(err.fields);
                  focusFirstInvalidField();
                } else {
                  setFormError(err.message);
                }
              },
            })
          }
          footer={
            <div className={styles.publish}>
              <Button type="submit" fullWidth disabled={create.isPending}>
                {create.isPending ? (
                  'Publishing…'
                ) : (
                  <>
                    <PlusIcon width={20} height={20} aria-hidden="true" /> Publish Activity
                  </>
                )}
              </Button>
              <p className={styles.fieldHint}>
                Your activity will be visible to the SJSU community.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
