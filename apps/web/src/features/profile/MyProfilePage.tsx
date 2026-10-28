import { LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { UserIcon } from '../../components/icons.js';
import { PageHeader } from '../../app/layouts/PageHeader.js';

// Placeholder until login (M2) and profiles (M3). Registration is available from here.
export function MyProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <EmptyState
        icon={<UserIcon />}
        title="Join Spartan Hangout"
        description="Create an account with your SJSU email. Logging in arrives in Milestone 2."
        action={<LinkButton to="/register">Create account</LinkButton>}
      />
    </>
  );
}
