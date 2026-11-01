import { LIMITS, messageSchema, type MessageInput } from '@sh/shared';
import type { UseMutationResult } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button.js';
import { TextArea } from '../../components/TextArea.js';
import { validateForm } from '../../lib/zodForm.js';
import styles from './chat.module.css';

interface MessageComposerProps<T> {
  send: UseMutationResult<T, Error, MessageInput>;
  /** Organizers can also post a labeled update (FR38). */
  update?: UseMutationResult<T, Error, MessageInput> | undefined;
}

/** Writes a message of 1–500 characters; whitespace-only text counts as empty (FR36, FR47, Q18). */
export function MessageComposer<T>({ send, update }: MessageComposerProps<T>) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | undefined>();
  const busy = send.isPending || (update?.isPending ?? false);

  function submit(mutation: UseMutationResult<T, Error, MessageInput>) {
    const validation = validateForm(messageSchema, { body });
    if (!validation.success) return setError(validation.errors.body);
    mutation.mutate(validation.data, {
      onSuccess: () => {
        setBody('');
        setError(undefined);
      },
      onError: (err) => setError(err.message),
    });
  }

  return (
    <form
      className={styles.composer}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        submit(send);
      }}
      noValidate
    >
      <TextArea
        label="Message"
        rows={2}
        maxLength={LIMITS.messageBody.max}
        value={body}
        error={error}
        onChange={(e) => {
          setBody(e.target.value);
          setError(undefined);
        }}
      />
      <div className={styles.actions}>
        {update && (
          <Button variant="secondary" disabled={busy} onClick={() => submit(update)}>
            Post as update
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {send.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {update && (
        <p className={styles.hint}>Updates are labeled “Update” and notify everyone who's going.</p>
      )}
    </form>
  );
}
