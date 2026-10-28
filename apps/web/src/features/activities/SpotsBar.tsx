import { formatOpenSpots } from '../../lib/format.js';
import styles from './activities.module.css';

const MAX_SEGMENTS = 12;

/** "5 of 8 Spartans going" with a spots-left pill and a progress bar (mockup p.4). */
export function SpotsBar({ count, limit }: { count: number; limit: number }) {
  const open = limit - count;
  return (
    <div className={styles.spots}>
      <div className={styles.spotsHeader}>
        <p className={styles.spotsCount}>
          {count} of {limit} Spartans going
        </p>
        <span className={styles.spotsPill}>{formatOpenSpots(open)}</span>
      </div>
      {limit <= MAX_SEGMENTS ? (
        <div className={styles.segments} aria-hidden="true">
          {Array.from({ length: limit }, (_, i) => (
            <span key={i} className={i < count ? styles.segmentFilled : styles.segment} />
          ))}
        </div>
      ) : (
        <div className={styles.track} aria-hidden="true">
          <span className={styles.trackFill} style={{ width: `${(count / limit) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
