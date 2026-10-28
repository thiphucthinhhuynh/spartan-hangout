import { initials } from '../lib/format.js';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  /** Picks the blue or gold tint, so the same student always gets the same color. */
  seed?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Initials in a tinted circle, as in the mockups ("MC", "AR"). Decorative: show the name nearby. */
export function Avatar({ name, seed = name, size = 'md' }: AvatarProps) {
  const tint = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ? 'gold' : 'blue';
  return (
    <span className={`${styles.avatar} ${styles[size]} ${styles[tint]}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
