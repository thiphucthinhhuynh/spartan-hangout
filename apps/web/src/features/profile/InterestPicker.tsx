import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPES, type ActivityType } from '@sh/shared';
import { Chip } from '../../components/Chip.js';
import styles from './ProfileFields.module.css';

interface InterestPickerProps {
  value: ActivityType[];
  onChange: (interests: ActivityType[]) => void;
  error?: string | undefined;
}

/** Interest chips from the Activity Type list (FR02, FR05). */
export function InterestPicker({ value, onChange, error }: InterestPickerProps) {
  function toggle(type: ActivityType) {
    onChange(value.includes(type) ? value.filter((t) => t !== type) : [...value, type]);
  }

  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? 'interests-error' : undefined}>
      <legend className={styles.legend}>Your interests</legend>
      <p className={styles.hint}>Pick what you'd like to do with other Spartans.</p>
      <div className={styles.chips}>
        {ACTIVITY_TYPES.map((type) => (
          <Chip key={type} selected={value.includes(type)} onClick={() => toggle(type)}>
            {ACTIVITY_TYPE_LABELS[type]}
          </Chip>
        ))}
      </div>
      {error && (
        <p id="interests-error" className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
