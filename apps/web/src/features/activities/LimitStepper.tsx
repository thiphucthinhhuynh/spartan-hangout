import { LIMITS } from '@sh/shared';
import { useId } from 'react';
import { MinusIcon, PlusIcon, UsersIcon } from '../../components/icons.js';
import styles from './activities.module.css';

const { min, max } = LIMITS.participantLimit;

interface LimitStepperProps {
  value: number;
  onChange: (value: number) => void;
  error?: string | undefined;
}

/** Participant limit "8 people  − +" (mockup p.3). Includes the organizer (FR26). */
export function LimitStepper({ value, onChange, error }: LimitStepperProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={styles.stepperField}>
      <label htmlFor={id} className={styles.fieldLabel}>
        Participant limit
      </label>
      <div className={error ? `${styles.stepper} ${styles.stepperInvalid}` : styles.stepper}>
        <UsersIcon width={20} height={20} aria-hidden="true" className={styles.stepperIcon} />
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          className={styles.stepperInput}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
        />
        <span className={styles.stepperUnit} aria-hidden="true">
          people
        </span>
        <button
          type="button"
          className={styles.stepperButton}
          onClick={() => onChange(Math.max(min, (value || min) - 1))}
          disabled={value <= min}
          aria-label="One fewer person"
        >
          <MinusIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className={`${styles.stepperButton} ${styles.stepperPlus}`}
          onClick={() => onChange(Math.min(max, (value || min) + 1))}
          disabled={value >= max}
          aria-label="One more person"
        >
          <PlusIcon width={18} height={18} />
        </button>
      </div>
      <p id={messageId} className={error ? styles.fieldError : styles.fieldHint}>
        {error ?? 'Including you. Keep it small, make it meaningful.'}
      </p>
    </div>
  );
}
