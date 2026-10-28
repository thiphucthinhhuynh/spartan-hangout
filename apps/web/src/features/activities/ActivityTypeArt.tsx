import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@sh/shared';
import type { ComponentType, SVGProps } from 'react';
import { BallIcon, BookIcon, CoffeeIcon, GamepadIcon, UsersIcon } from '../../components/icons.js';
import styles from './activities.module.css';

const ICONS: Record<ActivityType, ComponentType<SVGProps<SVGSVGElement>>> = {
  STUDY: BookIcon,
  SPORTS: BallIcon,
  FOOD: CoffeeIcon,
  SOCIAL: UsersIcon,
  GAMING: GamepadIcon,
};

/**
 * The built-in illustration for an activity type, used where the mockups show a photo
 * (open question Q6). Decorative: the type is always written out nearby.
 */
export function ActivityTypeArt({
  type,
  variant = 'banner',
}: {
  type: ActivityType;
  variant?: 'banner' | 'thumb';
}) {
  const Icon = ICONS[type];
  return (
    <div className={`${styles.art} ${styles[variant]}`} data-type={type} aria-hidden="true">
      <Icon className={styles.artIcon} />
      {variant === 'banner' && (
        <span className={styles.artPill}>
          <Icon width={16} height={16} /> {ACTIVITY_TYPE_LABELS[type]} together
        </span>
      )}
    </div>
  );
}

/** The type label pill from the mockups ("Study"). */
export function TypeChip({ type }: { type: ActivityType }) {
  return <span className={styles.typeChip}>{ACTIVITY_TYPE_LABELS[type]}</span>;
}
