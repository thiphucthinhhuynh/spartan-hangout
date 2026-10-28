import { EmptyState } from '../../components/EmptyState.js';
import { MessageIcon } from '../../components/icons.js';
import { PageHeader } from '../../app/layouts/PageHeader.js';

// Placeholder. Conversations arrive in Milestone 10; see open question Q21.
export function InboxPage() {
  return (
    <>
      <PageHeader title="Inbox" />
      <EmptyState
        icon={<MessageIcon />}
        title="No messages yet"
        description="Conversations with your connections will appear here (Milestone 10)."
      />
    </>
  );
}
