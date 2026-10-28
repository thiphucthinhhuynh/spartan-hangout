import { EmptyState } from '../../components/EmptyState.js';
import { CompassIcon } from '../../components/icons.js';
import { PageHeader } from '../../app/layouts/PageHeader.js';

// Placeholder. Recommended activities and search arrive in Milestone 5 (FR14–FR17).
export function DiscoverPage() {
  return (
    <>
      <PageHeader title="Hey, Spartan!" subtitle="A little plan. A new connection." />
      <EmptyState
        icon={<CompassIcon />}
        title="Activities are on the way"
        description="Recommended activities and search arrive in Milestone 5."
      />
    </>
  );
}
