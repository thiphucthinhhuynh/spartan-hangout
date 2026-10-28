import type { AvailabilitySlotDto } from '@sh/shared';
import { formatSlot } from '../../lib/format.js';
import styles from './profile.module.css';

/** Weekly availability, one row per slot (already ordered by day by the API). */
export function AvailabilityList({ slots }: { slots: AvailabilitySlotDto[] }) {
  if (slots.length === 0) return <p className={styles.muted}>No times added.</p>;
  return (
    <ul className={styles.slots}>
      {slots.map((slot, i) => {
        const { day, time } = formatSlot(slot);
        return (
          <li key={i} className={styles.slot}>
            <span className={styles.slotDay}>{day}</span>
            <span className={styles.slotTime}>{time}</span>
          </li>
        );
      })}
    </ul>
  );
}
