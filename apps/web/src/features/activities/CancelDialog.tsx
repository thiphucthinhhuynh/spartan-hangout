import { LIMITS } from '@sh/shared';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { TextArea } from '../../components/TextArea.js';
import { useCancelActivity } from './api.js';

interface CancelDialogProps {
  activityId: string;
  open: boolean;
  onClose: () => void;
}

/** FR31: the organizer confirms the cancellation, with an optional reason for participants. */
export function CancelDialog({ activityId, open, onClose }: CancelDialogProps) {
  const cancel = useCancelActivity(activityId);
  const [reason, setReason] = useState('');

  function close() {
    setReason('');
    cancel.reset();
    onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      title="Cancel this activity?"
      confirmLabel="Cancel activity"
      busy={cancel.isPending}
      error={cancel.error?.message}
      onCancel={close}
      onConfirm={() => cancel.mutate(reason, { onSuccess: close })}
    >
      <p>
        Everyone who joined will be notified, and the group chat becomes read-only. This can't be
        undone.
      </p>
      <TextArea
        label="Reason (optional)"
        hint="Shown to participants in their notification."
        maxLength={LIMITS.reasonMaxLength}
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </ConfirmDialog>
  );
}
