import { LIMITS, REPORT_REASON_LABELS, REPORT_REASONS, reportSchema } from '@sh/shared';
import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { TextArea } from '../../components/TextArea.js';
import { validateForm, type FieldErrors } from '../../lib/zodForm.js';
import { useSubmitReport } from './api.js';
import styles from './moderation.module.css';

interface ReportActionProps {
  /** What is being reported, in exactly one of the two fields. */
  target: { targetUserId: string } | { targetActivityId: string };
  /** "student" or "activity", for the wording. */
  noun: string;
}

/**
 * FR50–FR52: a Report button and its dialog, with a required reason and an optional description.
 * The reporter sees the confirmation; the reported party is never told.
 */
export function ReportAction({ target, noun }: ReportActionProps) {
  const submit = useSubmitReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  function close() {
    setOpen(false);
    setReason('');
    setDescription('');
    setErrors({});
    submit.reset();
  }

  function handleConfirm() {
    const validation = validateForm(reportSchema, { ...target, reason, description });
    if (!validation.success) return setErrors(validation.errors);
    setErrors({});
    submit.mutate(validation.data, { onSuccess: () => setOpen(false) });
  }

  if (submit.isSuccess) {
    return (
      <p className={styles.confirmation} role="status">
        {submit.data.message}
      </p>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        fullWidth
        className={styles.reportButton}
        onClick={() => setOpen(true)}
      >
        Report this {noun}
      </Button>

      <ConfirmDialog
        open={open}
        title={`Report this ${noun}`}
        confirmLabel="Submit report"
        busy={submit.isPending}
        error={submit.error?.message}
        onCancel={close}
        onConfirm={handleConfirm}
      >
        <p>Only administrators see reports. Nobody is told who reported them.</p>
        <fieldset className={styles.reasons}>
          <legend className={styles.legend}>Reason</legend>
          {REPORT_REASONS.map((option) => (
            <label key={option} className={styles.reason}>
              <input
                type="radio"
                name="report-reason"
                value={option}
                checked={reason === option}
                onChange={() => {
                  setReason(option);
                  setErrors({});
                }}
              />
              {REPORT_REASON_LABELS[option]}
            </label>
          ))}
          {errors.reason && <p className={styles.error}>{errors.reason}</p>}
        </fieldset>
        <TextArea
          label="Description (optional)"
          maxLength={LIMITS.reportDescriptionMaxLength}
          rows={3}
          value={description}
          error={errors.description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
