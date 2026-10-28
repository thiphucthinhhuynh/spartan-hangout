import type { ButtonHTMLAttributes } from 'react';
import styles from './Chip.module.css';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Pill-shaped toggle used for categories and interests. */
export function Chip({ selected = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[styles.chip, selected && styles.selected, className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
