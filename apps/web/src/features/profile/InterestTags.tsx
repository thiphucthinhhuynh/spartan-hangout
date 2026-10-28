import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@sh/shared';
import { CheckIcon } from '../../components/icons.js';
import styles from './profile.module.css';

interface InterestTagsProps {
  interests: { type: ActivityType; shared?: boolean }[];
}

/** Read-only interest pills; interests shared with the viewer are highlighted (FR13). */
export function InterestTags({ interests }: InterestTagsProps) {
  return (
    <ul className={styles.tags}>
      {interests.map(({ type, shared }) => (
        <li key={type} className={shared ? `${styles.tag} ${styles.tagShared}` : styles.tag}>
          {shared && <CheckIcon width={16} height={16} aria-hidden="true" />}
          {ACTIVITY_TYPE_LABELS[type]}
          {shared && <span className="sr-only"> (shared with you)</span>}
        </li>
      ))}
    </ul>
  );
}
