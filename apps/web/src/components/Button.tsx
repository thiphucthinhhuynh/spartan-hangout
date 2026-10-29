import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost';

interface StyleProps {
  variant?: Variant;
  fullWidth?: boolean;
}

function buttonClassName({ variant = 'primary', fullWidth = false }: StyleProps, extra?: string) {
  return [styles.button, styles[variant], fullWidth && styles.fullWidth, extra]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

export function Button({ variant, fullWidth, type = 'button', className, ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, fullWidth }, className)} {...props} />
  );
}

/** A router link that looks like a button (e.g. "Create account"). */
export function LinkButton({ variant, fullWidth, className, ...props }: LinkProps & StyleProps) {
  return <Link className={buttonClassName({ variant, fullWidth }, className)} {...props} />;
}
