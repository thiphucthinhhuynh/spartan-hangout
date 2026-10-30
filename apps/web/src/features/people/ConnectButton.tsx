import type { ConnectionState } from '@sh/shared';
import { Button, LinkButton } from '../../components/Button.js';
import { CheckIcon, PlusIcon } from '../../components/icons.js';
import { useSendConnectionRequest } from './api.js';
import styles from './people.module.css';

interface ConnectButtonProps {
  studentId: string;
  state: ConnectionState;
  fullWidth?: boolean;
}

/** FR45: Connect, or the state of an existing request or connection. */
export function ConnectButton({ studentId, state, fullWidth = false }: ConnectButtonProps) {
  const send = useSendConnectionRequest();

  if (state === 'connected') {
    return (
      <span className={styles.connected}>
        <CheckIcon width={16} height={16} aria-hidden="true" /> Connected
      </span>
    );
  }
  if (state === 'pending_outgoing') {
    return (
      <Button variant="secondary" fullWidth={fullWidth} disabled>
        Request sent
      </Button>
    );
  }
  if (state === 'pending_incoming') {
    return (
      <LinkButton to="/people/requests" fullWidth={fullWidth}>
        Respond to request
      </LinkButton>
    );
  }
  return (
    <div className={styles.connectAction}>
      <Button
        fullWidth={fullWidth}
        disabled={send.isPending}
        onClick={() => send.mutate({ recipientId: studentId })}
      >
        <PlusIcon width={18} height={18} aria-hidden="true" />
        {send.isPending ? 'Sending…' : 'Connect'}
      </Button>
      {send.isError && (
        <p className={styles.error} role="alert">
          {send.error.message}
        </p>
      )}
    </div>
  );
}
