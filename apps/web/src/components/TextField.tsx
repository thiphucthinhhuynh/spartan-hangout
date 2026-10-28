import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation message shown under the field (FR02/FR06/FR27 "identify each invalid field"). */
  error?: string | undefined;
  hint?: string;
  icon?: ReactNode;
}

export function TextField({ label, error, hint, icon, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={[styles.control, error && styles.invalid].filter(Boolean).join(' ')}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...props}
        />
      </div>
      {message && (
        <p id={messageId} className={error ? styles.error : styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
}
