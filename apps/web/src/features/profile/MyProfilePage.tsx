import { useNavigate } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Button } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { UserIcon } from '../../components/icons.js';
import { useCurrentUser, useLogout } from '../auth/api.js';

// Placeholder until profiles arrive in Milestone 3. Log Out lives here (FR10).
export function MyProfilePage() {
  const me = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Profile" subtitle={`Signed in as ${me.displayName}`} />
      <EmptyState
        icon={<UserIcon />}
        title="Your profile is on the way"
        description="Viewing and editing your interests and availability arrives in Milestone 3."
        action={
          <Button
            variant="secondary"
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
            }
          >
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </Button>
        }
      />
    </>
  );
}
