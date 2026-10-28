import { DAYS_OF_WEEK } from '@sh/shared';
import { Button } from '../../components/Button.js';
import { PlusIcon, XIcon } from '../../components/icons.js';
import type { FieldErrors } from '../../lib/zodForm.js';
import styles from './ProfileFields.module.css';

/** One editable availability row; times are "HH:mm" from <input type="time">. */
export interface SlotDraft {
  dayOfWeek: number;
  start: string;
  end: string;
}

export const emptySlot = (): SlotDraft => ({ dayOfWeek: 1, start: '', end: '' });

interface AvailabilityEditorProps {
  value: SlotDraft[];
  onChange: (slots: SlotDraft[]) => void;
  /** Errors keyed like the API: `availability`, `availability.0.end`, … */
  errors: FieldErrors;
}

/** Weekly availability slots: a day plus start and end times (FR02, FR05). */
export function AvailabilityEditor({ value, onChange, errors }: AvailabilityEditorProps) {
  function update(index: number, patch: Partial<SlotDraft>) {
    onChange(value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>When are you usually free?</legend>
      <p className={styles.hint}>
        Add the times you're free each week. We use them to recommend activities.
      </p>

      <ul className={styles.slots}>
        {value.map((slot, i) => {
          const dayError = errors[`availability.${i}.dayOfWeek`];
          const startError = errors[`availability.${i}.start`];
          const endError = errors[`availability.${i}.end`];
          const rowError = dayError ?? startError ?? endError;
          const n = i + 1;
          return (
            <li key={i} className={styles.slot}>
              <div className={styles.slotRow}>
                <select
                  className={styles.control}
                  value={slot.dayOfWeek}
                  onChange={(e) => update(i, { dayOfWeek: Number(e.target.value) })}
                  aria-label={`Day for time ${n}`}
                  aria-invalid={dayError ? true : undefined}
                >
                  {DAYS_OF_WEEK.map((day, dayIndex) => (
                    <option key={day} value={dayIndex}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className={styles.control}
                  value={slot.start}
                  onChange={(e) => update(i, { start: e.target.value })}
                  aria-label={`Start time for time ${n}`}
                  aria-invalid={startError ? true : undefined}
                />
                <span className={styles.to} aria-hidden="true">
                  to
                </span>
                <input
                  type="time"
                  className={styles.control}
                  value={slot.end}
                  onChange={(e) => update(i, { end: e.target.value })}
                  aria-label={`End time for time ${n}`}
                  aria-invalid={endError ? true : undefined}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Remove time ${n}`}
                >
                  <XIcon width={20} height={20} />
                </button>
              </div>
              {rowError && <p className={styles.error}>{rowError}</p>}
            </li>
          );
        })}
      </ul>

      {errors.availability && <p className={styles.error}>{errors.availability}</p>}

      <Button variant="ghost" onClick={() => onChange([...value, emptySlot()])}>
        <PlusIcon width={20} height={20} /> Add a time
      </Button>
    </fieldset>
  );
}
