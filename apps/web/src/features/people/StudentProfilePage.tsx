import { Navigate, useParams } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { Avatar } from '../../components/Avatar.js';
import { Button, LinkButton } from '../../components/Button.js';
import { Card } from '../../components/Card.js';
import { EmptyState } from '../../components/EmptyState.js';
import { UserIcon } from '../../components/icons.js';
import { ApiError } from '../../lib/apiClient.js';
import { useCurrentUser } from '../auth/api.js';
import { useStudentProfile } from '../profile/api.js';
import { AvailabilityList } from '../profile/AvailabilityList.js';
import { InterestTags } from '../profile/InterestTags.js';
import styles from '../profile/profile.module.css';

/**
 * Another student's profile (FR13): name, interests (shared ones highlighted) and availability.
 * Never their email. Connect, Report and Block actions arrive in Milestones 9, 11 and 12.
 */
export function StudentProfilePage() {
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const isMe = id === me.id;
  const student = useStudentProfile(id, { enabled: !isMe });

  if (isMe) return <Navigate to="/profile" replace />;

  if (student.isPending) return <EmptyState title="Loading profile…" />;
  if (student.isError) {
    const notFound = student.error instanceof ApiError && student.error.status === 404;
    return (
      <EmptyState
        icon={<UserIcon />}
        title={notFound ? "We couldn't find that student." : "We couldn't load this profile."}
        description={notFound ? undefined : student.error.message}
        action={
          notFound ? (
            <LinkButton to="/" variant="secondary">
              Back to Discover
            </LinkButton>
          ) : (
            <Button onClick={() => void student.refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const profile = student.data;
  const sharedCount = profile.interests.filter((interest) => interest.shared).length;
  return (
    <>
      <PageHeader title={profile.displayName} />
      <div className={styles.layout}>
        <Card className={styles.summary}>
          <Avatar name={profile.displayName} seed={profile.id} size="lg" />
          <h2 className={styles.name}>{profile.displayName}</h2>
          {profile.connectionState === 'connected' && (
            <span className={styles.badge}>Connected</span>
          )}
          <p className={styles.muted}>
            {sharedCount === 0
              ? 'No interests in common yet.'
              : `${sharedCount} interest${sharedCount === 1 ? '' : 's'} in common`}
          </p>
          <p className={styles.muted}>
            Connecting, reporting and blocking arrive in later milestones.
          </p>
        </Card>

        <div className={styles.details}>
          <Card>
            <h2 className={styles.sectionTitle}>Interests</h2>
            <InterestTags interests={profile.interests} />
          </Card>
          <Card>
            <h2 className={styles.sectionTitle}>Usually free</h2>
            <AvailabilityList slots={profile.availability} />
          </Card>
        </div>
      </div>
    </>
  );
}
