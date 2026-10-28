import { PageHeader } from '../../app/layouts/PageHeader.js';
import { LinkButton } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { CompassIcon, PlusIcon } from '../../components/icons.js';

// Recommended activities and search arrive in Milestone 5 (FR14–FR17).
export function DiscoverPage() {
  return (
    <>
      <PageHeader
        title="Hey, Spartan!"
        subtitle="A little plan. A new connection."
        actions={
          <LinkButton to="/activities/new">
            <PlusIcon width={20} height={20} aria-hidden="true" /> Create
          </LinkButton>
        }
      />
      <EmptyState
        icon={<CompassIcon />}
        title="Activities are on the way"
        description="Recommended activities and search arrive in Milestone 5. You can already create one."
      />
    </>
  );
}
