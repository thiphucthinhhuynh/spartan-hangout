import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPES, activitySearchSchema } from '@sh/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button.js';
import { Chip } from '../../components/Chip.js';
import { MapPinIcon, SearchIcon } from '../../components/icons.js';
import { TextField } from '../../components/TextField.js';
import { focusFirstInvalidField, validateForm, type FieldErrors } from '../../lib/zodForm.js';
import styles from './discover.module.css';

/** The FR16 criteria, as the form holds them ('' = not set). */
export const CRITERIA_KEYS = [
  'type',
  'fromDate',
  'toDate',
  'earliestStart',
  'latestStart',
  'location',
] as const;
export type CriteriaValues = Record<(typeof CRITERIA_KEYS)[number], string>;

interface SearchFiltersProps {
  initial: CriteriaValues;
  /** Errors for criteria already in the URL (e.g. a hand-edited link). */
  errors: FieldErrors;
  onSearch: (values: CriteriaValues) => void;
  onClear: () => void;
}

/** FR16: type, date range, start-time range and location, in any combination. */
export function SearchFilters({
  initial,
  errors: urlErrors,
  onSearch,
  onClear,
}: SearchFiltersProps) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>(urlErrors);

  function set(key: keyof CriteriaValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateForm(activitySearchSchema, values);
    if (!validation.success) {
      setErrors(validation.errors);
      return focusFirstInvalidField();
    }
    onSearch(values);
  }

  return (
    <form className={styles.filters} onSubmit={handleSubmit} noValidate aria-label="Search filters">
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Category</legend>
        <div className={styles.chips}>
          {ACTIVITY_TYPES.map((type) => (
            <Chip
              key={type}
              selected={values.type === type}
              onClick={() => set('type', values.type === type ? '' : type)}
            >
              {ACTIVITY_TYPE_LABELS[type]}
            </Chip>
          ))}
        </div>
        {errors.type && <p className={styles.fieldError}>{errors.type}</p>}
      </fieldset>

      <div className={styles.pair}>
        <TextField
          label="From date"
          type="date"
          value={values.fromDate}
          onChange={(e) => set('fromDate', e.target.value)}
          error={errors.fromDate}
        />
        <TextField
          label="To date"
          type="date"
          value={values.toDate}
          onChange={(e) => set('toDate', e.target.value)}
          error={errors.toDate}
        />
      </div>

      <div className={styles.pair}>
        <TextField
          label="Starts at or after"
          type="time"
          value={values.earliestStart}
          onChange={(e) => set('earliestStart', e.target.value)}
          error={errors.earliestStart}
        />
        <TextField
          label="Starts at or before"
          type="time"
          value={values.latestStart}
          onChange={(e) => set('latestStart', e.target.value)}
          error={errors.latestStart}
        />
      </div>

      <TextField
        label="Location"
        placeholder="e.g. King Library"
        icon={<MapPinIcon width={20} height={20} />}
        value={values.location}
        onChange={(e) => set('location', e.target.value)}
        error={errors.location}
      />

      <div className={styles.filterActions}>
        <Button type="submit" fullWidth>
          <SearchIcon width={20} height={20} aria-hidden="true" /> Search
        </Button>
        <Button variant="secondary" fullWidth onClick={onClear}>
          Clear all
        </Button>
      </div>
    </form>
  );
}
