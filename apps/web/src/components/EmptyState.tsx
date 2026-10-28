import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Centered message for empty lists ("No activities found.") and not-yet-built screens. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  );
}
