import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { useBlockStudent } from './api.js';
import styles from './moderation.module.css';

interface BlockActionProps {
  studentId: string;
  displayName: string;
}

/**
 * FR54–FR56: a Block button and its confirmation. Their profile can't be opened afterwards (FR57),
 * so this leaves the page. Blocking can't be undone (open question Q11).
 */
export function BlockAction({ studentId, displayName }: BlockActionProps) {
  const navigate = useNavigate();
  const block = useBlockStudent(studentId);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        fullWidth
        className={styles.blockButton}
        onClick={() => setOpen(true)}
      >
        Block {displayName}
      </Button>

      <ConfirmDialog
        open={open}
        title={`Block ${displayName}?`}
        confirmLabel="Block"
        busy={block.isPending}
        error={block.error?.message}
        onCancel={() => {
          setOpen(false);
          block.reset();
        }}
        onConfirm={() =>
          block.mutate(undefined, { onSuccess: () => navigate('/people', { replace: true }) })
        }
      >
        <p>They won't be told. This can't be undone.</p>
        <ul className={styles.effects}>
          <li>Your connection and any pending request between you end.</li>
          <li>They can't message you or send you requests.</li>
          <li>They're removed from your upcoming activities and can't join your activities.</li>
          <li>You won't see their group chat messages.</li>
          <li>You won't see each other in Discover, search or Recommended.</li>
        </ul>
      </ConfirmDialog>
    </>
  );
}
