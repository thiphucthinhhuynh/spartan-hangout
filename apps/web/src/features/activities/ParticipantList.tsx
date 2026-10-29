import { LIMITS, MESSAGES, type ParticipantDto } from '@sh/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar.js';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { TextArea } from '../../components/TextArea.js';
import { useCurrentUser } from '../auth/api.js';
import styles from './activities.module.css';
import { useParticipants, useRemoveParticipant } from './api.js';

interface ParticipantListProps {
  activityId: string;
  /** FR33: the organizer, while the activity is Open or Full and hasn't started. */
  canRemove: boolean;
}

/** FR19: everyone taking part, the organizer labeled; names open profiles. */
export function ParticipantList({ activityId, canRemove }: ParticipantListProps) {
  const me = useCurrentUser();
  const participants = useParticipants(activityId);
  const remove = useRemoveParticipant(activityId);
  const [target, setTarget] = useState<ParticipantDto | null>(null);
  const [reason, setReason] = useState('');

  function close() {
    setTarget(null);
    setReason('');
    remove.reset();
  }

  if (participants.isPending) return <p className={styles.fieldHint}>Loading participants…</p>;
  if (participants.isError) {
    return <p className={styles.fieldError}>We couldn't load the participants.</p>;
  }

  return (
    <>
      <ul className={styles.people}>
        {participants.data.map((person) => {
          const isMe = person.userId === me.id;
          return (
            <li key={person.userId} className={styles.person}>
              <Avatar name={person.displayName} seed={person.userId} size="sm" />
              <Link
                to={isMe ? '/profile' : `/users/${person.userId}`}
                className={styles.personName}
              >
                {isMe ? `${person.displayName} (you)` : person.displayName}
              </Link>
              {person.isOrganizer && (
                <span className={styles.organizerLabel}>{MESSAGES.organizerLabel}</span>
              )}
              {canRemove && !person.isOrganizer && (
                <Button
                  variant="ghost"
                  className={styles.removeButton}
                  onClick={() => setTarget(person)}
                >
                  Remove<span className="sr-only"> {person.displayName}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={target !== null}
        title={`Remove ${target?.displayName ?? ''}?`}
        confirmLabel="Remove"
        busy={remove.isPending}
        error={remove.error?.message}
        onCancel={close}
        onConfirm={() =>
          target && remove.mutate({ userId: target.userId, reason }, { onSuccess: close })
        }
      >
        <p>
          They'll be told they were removed, and they won't be able to join this activity again.
        </p>
        <TextArea
          label="Reason (optional)"
          hint="Shown to the student in their notification."
          maxLength={LIMITS.reasonMaxLength}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
