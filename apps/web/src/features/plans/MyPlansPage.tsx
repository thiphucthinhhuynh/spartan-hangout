import { MY_ACTIVITY_ROLES, MY_ACTIVITY_TIMES } from '@sh/shared';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { LinkButton } from '../../components/Button.js';
import { Chip } from '../../components/Chip.js';
import { PlusIcon } from '../../components/icons.js';
import { ActivityList } from '../activities/ActivityList.js';
import { useMyActivities } from '../activities/api.js';
import styles from './plans.module.css';

type Role = (typeof MY_ACTIVITY_ROLES)[number];
type When = (typeof MY_ACTIVITY_TIMES)[number];

const ROLE_LABELS: Record<Role, string> = { joined: 'Joined', organizing: 'Organizing' };
const WHEN_LABELS: Record<When, string> = { upcoming: 'Upcoming', past: 'Past' };
const EMPTY: Record<Role, Record<When, string>> = {
  joined: {
    upcoming: 'You haven’t joined any upcoming activities.',
    past: 'No past activities yet.',
  },
  organizing: {
    upcoming: 'You aren’t organizing any upcoming activities.',
    past: 'You haven’t organized any activities yet.',
  },
};

function pick<T extends string>(options: readonly T[], value: string | null): T {
  return options.find((option) => option === value) ?? options[0]!;
}

/** My plans: activities the student joined or organizes, upcoming or past (FR18 entry point). */
export function MyPlansPage() {
  const [params, setParams] = useSearchParams();
  const role = pick(MY_ACTIVITY_ROLES, params.get('role'));
  const when = pick(MY_ACTIVITY_TIMES, params.get('when'));
  const plans = useMyActivities({ role, when });

  function show(next: { role?: Role; when?: When }) {
    setParams({ role, when, ...next }, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="My plans"
        actions={
          <LinkButton to="/activities/new">
            <PlusIcon width={20} height={20} aria-hidden="true" /> Create
          </LinkButton>
        }
      />

      <div className={styles.filters}>
        <div className={styles.group} role="group" aria-label="Show activities I">
          {MY_ACTIVITY_ROLES.map((option) => (
            <Chip key={option} selected={role === option} onClick={() => show({ role: option })}>
              {ROLE_LABELS[option]}
            </Chip>
          ))}
        </div>
        <div className={styles.group} role="group" aria-label="When">
          {MY_ACTIVITY_TIMES.map((option) => (
            <Chip key={option} selected={when === option} onClick={() => show({ when: option })}>
              {WHEN_LABELS[option]}
            </Chip>
          ))}
        </div>
      </div>

      <ActivityList
        query={plans}
        emptyTitle={EMPTY[role][when]}
        emptyDescription={
          when === 'upcoming'
            ? role === 'joined'
              ? 'Find something to do on Discover.'
              : 'Create an activity and invite other Spartans.'
            : undefined
        }
      />
    </>
  );
}
