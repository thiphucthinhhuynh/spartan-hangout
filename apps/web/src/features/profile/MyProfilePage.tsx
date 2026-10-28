import { EmptyState } from '../../components/EmptyState.js';
import { UserIcon } from '../../components/icons.js';
import { PageHeader } from '../../app/layouts/PageHeader.js';

// Placeholder. Registration, login and profiles arrive in Milestones 1–3.
export function MyProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <EmptyState
        icon={<UserIcon />}
        title="Sign-in is coming"
        description="Accounts and profiles arrive in Milestones 1–3."
      />
    </>
  );
}
