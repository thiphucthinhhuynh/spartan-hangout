import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  activityCreateSchema,
  campusDateTimeToUtc,
  LIMITS,
  START_IN_PAST_MESSAGE,
  utcToCampusParts,
  type ActivityCreateInput,
  type ActivityType,
} from '@sh/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Chip } from '../../components/Chip.js';
import { MapPinIcon } from '../../components/icons.js';
import { TextArea } from '../../components/TextArea.js';
import { TextField } from '../../components/TextField.js';
import { focusFirstInvalidField, validateForm, type FieldErrors } from '../../lib/zodForm.js';
import styles from './activities.module.css';
import { LimitStepper } from './LimitStepper.js';

export interface ActivityFormValues {
  title: string;
  description: string;
  type: ActivityType | '';
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  participantLimit: number;
}

export const emptyActivityForm: ActivityFormValues = {
  title: '',
  description: '',
  type: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  participantLimit: 8,
};

interface ActivityFormProps {
  initialValues: ActivityFormValues;
  /** Field errors from the API (VALIDATION_FAILED, LIMIT_BELOW_COUNT). */
  serverErrors: FieldErrors;
  /** An error that isn't about one field. */
  formError: string | null;
  onChange: () => void;
  onSubmit: (values: ActivityCreateInput) => void;
  /** The submit button and anything under it. */
  footer: ReactNode;
}

/** Create and Edit activity form (FR26–FR27): mockup p.3 plus description and end time (Q2). */
export function ActivityForm({
  initialValues,
  serverErrors,
  formError,
  onChange,
  onSubmit,
  footer,
}: ActivityFormProps) {
  const [values, setValues] = useState(initialValues);
  const [attempted, setAttempted] = useState(false);

  const validation = validateForm(activityCreateSchema, values);
  const clientErrors: FieldErrors = !attempted
    ? {}
    : !validation.success
      ? validation.errors
      : isStartInPast(validation.data)
        ? { startTime: START_IN_PAST_MESSAGE }
        : {};
  const errors = { ...clientErrors, ...serverErrors };

  function set<K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    onChange();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!validation.success || isStartInPast(validation.data)) return focusFirstInvalidField();
    onSubmit(validation.data);
  }

  const today = utcToCampusParts(new Date()).date;
  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="Activity title"
        maxLength={LIMITS.activityTitle.max}
        placeholder="Midterm Study Group"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
      />

      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldLabel}>Category</legend>
        <div className={styles.chips} role="radiogroup" aria-label="Category">
          {ACTIVITY_TYPES.map((type) => (
            <Chip
              key={type}
              role="radio"
              aria-checked={values.type === type}
              aria-pressed={undefined}
              selected={values.type === type}
              onClick={() => set('type', type)}
            >
              {ACTIVITY_TYPE_LABELS[type]}
            </Chip>
          ))}
        </div>
        {errors.type && <p className={styles.fieldError}>{errors.type}</p>}
      </fieldset>

      <div className={styles.whenRow}>
        <TextField
          label="Date"
          type="date"
          min={today}
          value={values.date}
          onChange={(e) => set('date', e.target.value)}
          error={errors.date}
        />
        <TextField
          label="Start time"
          type="time"
          value={values.startTime}
          onChange={(e) => set('startTime', e.target.value)}
          error={errors.startTime}
        />
        <TextField
          label="End time"
          type="time"
          value={values.endTime}
          onChange={(e) => set('endTime', e.target.value)}
          error={errors.endTime}
        />
      </div>
      <p className={styles.fieldHint}>Times are in San José (campus) time.</p>

      <TextField
        label="Location"
        maxLength={LIMITS.activityLocation.max}
        placeholder="King Library, 2nd floor"
        icon={<MapPinIcon width={20} height={20} />}
        value={values.location}
        onChange={(e) => set('location', e.target.value)}
        error={errors.location}
      />

      <TextArea
        label="Description"
        maxLength={LIMITS.activityDescription.max}
        placeholder="What will you do? What should people bring?"
        rows={4}
        value={values.description}
        onChange={(e) => set('description', e.target.value)}
        error={errors.description}
      />

      <LimitStepper
        value={values.participantLimit}
        onChange={(limit) => set('participantLimit', limit)}
        error={errors.participantLimit}
      />

      {(formError || Object.keys(errors).length > 0) && (
        <p className={styles.alert} role="alert">
          {formError ?? 'Please fix the highlighted fields.'}
        </p>
      )}

      {footer}
    </form>
  );
}

/** FR27: the start must be in the future (the API checks this too). */
function isStartInPast(values: ActivityCreateInput): boolean {
  return campusDateTimeToUtc(values.date, values.startTime).getTime() <= Date.now();
}
