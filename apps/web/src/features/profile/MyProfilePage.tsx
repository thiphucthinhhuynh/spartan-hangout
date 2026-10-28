import { useNavigate } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Avatar } from '../../components/Avatar.js';
import { Button, LinkButton } from '../../components/Button.js';
import { Card } from '../../components/Card.js';
import { EmptyState } from '../../components/EmptyState.js';
import { LockIcon, PencilIcon } from '../../components/icons.js';
import { formatDateTime } from '../../lib/format.js';
import { useLogout } from '../auth/api.js';
import { useMyProfile } from './api.js';
import { AvailabilityList } from './AvailabilityList.js';
import { InterestTags } from './InterestTags.js';
import styles from './profile.module.css';

/** The student's own profile (FR12). Removing the account arrives in Milestone 13. */
export function MyProfilePage() {
  const profile = useMyProfile();
  const logout = useLogout();
  const navigate = useNavigate();

  if (profile.isPending) return <EmptyState title="Loading your profile…" />;
  if (profile.isError) {
    return (
      <EmptyState
        title="We couldn't load your profile."
        description={profile.error.message}
        action={<Button onClick={() => void profile.refetch()}>Try again</Button>}
      />
    );
  }

  const me = profile.data;
  return (
    <>
      <PageHeader title="Profile" />
      <div className={styles.layout}>
        <Card className={styles.summary}>
          <Avatar name={me.displayName} seed={me.id} size="lg" />
          <h2 className={styles.name}>{me.displayName}</h2>
          <p className={styles.private}>
            <LockIcon width={16} height={16} aria-hidden="true" />
            <span>
              {me.email}
              <span className="sr-only"> (only you can see your email)</span>
            </span>
          </p>
          <p className={styles.muted} aria-hidden="true">
            Only you can see your email.
          </p>
          <p className={styles.muted}>Last updated {formatDateTime(me.updatedAt)}</p>

          <div className={styles.actions}>
            <LinkButton to="/profile/edit" fullWidth>
              <PencilIcon width={18} height={18} aria-hidden="true" /> Edit profile
            </LinkButton>
            <Button
              variant="secondary"
              fullWidth
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
              }
            >
              {logout.isPending ? 'Logging out…' : 'Log out'}
            </Button>
          </div>
        </Card>

        <div className={styles.details}>
          <Card>
            <h2 className={styles.sectionTitle}>Your interests</h2>
            <InterestTags interests={me.interests.map((type) => ({ type }))} />
          </Card>
          <Card>
            <h2 className={styles.sectionTitle}>When you're usually free</h2>
            <AvailabilityList slots={me.availability} />
          </Card>
        </div>
      </div>
    </>
  );
}
