import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth && styles.fullWidth, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...props} />;
}
