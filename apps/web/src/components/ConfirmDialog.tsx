import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button.js';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Extra explanation or fields (e.g. an optional reason). */
  children?: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  /** A failure to show inside the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal confirmation (FR24 "after confirming", FR33). Built on the native <dialog>, which
 * traps focus, closes on Escape and returns focus to the button that opened it.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      // Escape closes the dialog natively; keep React's state in step.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {children}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
