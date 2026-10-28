import { useId, type TextareaHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
  /** Shows "120 / 500" under the field. */
  maxLength?: number;
}

/** Multi-line version of TextField, with an optional character counter. */
export function TextArea({ label, error, hint, id, maxLength, value, ...props }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div
        className={[styles.control, styles.multiline, error && styles.invalid]
          .filter(Boolean)
          .join(' ')}
      >
        <textarea
          id={inputId}
          className={`${styles.input} ${styles.textarea}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          maxLength={maxLength}
          value={value}
          {...props}
        />
      </div>
      <div className={styles.footer}>
        {message ? (
          <p id={messageId} className={error ? styles.error : styles.hint}>
            {message}
          </p>
        ) : (
          <span />
        )}
        {maxLength !== undefined && (
          <span className={styles.counter} aria-hidden="true">
            {length} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
