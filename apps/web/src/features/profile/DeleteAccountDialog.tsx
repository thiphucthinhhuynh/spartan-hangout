import { deleteAccountSchema } from '@sh/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { TextField } from '../../components/TextField.js';
import { ApiError } from '../../lib/apiClient.js';
import { validateForm } from '../../lib/zodForm.js';
import { useDeleteAccount } from './api.js';
import styles from './profile.module.css';

/** FR07: removes the account after a permanent-removal warning and the student's password. */
export function DeleteAccountAction() {
  const navigate = useNavigate();
  const remove = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  // A wrong password belongs under the field; anything else goes at the bottom of the dialog.
  const apiFieldError =
    remove.error instanceof ApiError ? remove.error.fields?.password : undefined;

  function close() {
    setOpen(false);
    setPassword('');
    setFieldError(undefined);
    remove.reset();
  }

  function handleConfirm() {
    const validation = validateForm(deleteAccountSchema, { password });
    if (!validation.success) return setFieldError(validation.errors.password);
    setFieldError(undefined);
    remove.mutate(validation.data, { onSuccess: () => navigate('/login', { replace: true }) });
  }

  return (
    <>
      <Button
        variant="ghost"
        fullWidth
        className={styles.dangerButton}
        onClick={() => setOpen(true)}
      >
        Remove account
      </Button>

      <ConfirmDialog
        open={open}
        title="Remove your account?"
        confirmLabel="Remove my account"
        busy={remove.isPending}
        error={apiFieldError ? null : remove.error?.message}
        onCancel={close}
        onConfirm={handleConfirm}
      >
        <p>
          <strong>This is permanent and can't be undone.</strong>
        </p>
        <ul className={styles.effects}>
          <li>Your profile, connections, conversations and notifications are deleted.</li>
          <li>You leave every activity you joined.</li>
          <li>Upcoming activities you organize are cancelled, and participants are told.</li>
          <li>Your group chat messages stay, shown as “Deleted Student”.</li>
        </ul>
        <TextField
          label="Enter your password to confirm"
          type="password"
          autoComplete="current-password"
          value={password}
          error={fieldError ?? apiFieldError}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldError(undefined);
            if (remove.isError) remove.reset();
          }}
        />
      </ConfirmDialog>
    </>
  );
}
