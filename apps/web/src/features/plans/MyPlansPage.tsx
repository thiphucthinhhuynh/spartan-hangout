import { EmptyState } from '../../components/EmptyState.js';
import { CalendarIcon } from '../../components/icons.js';
import { PageHeader } from '../../app/layouts/PageHeader.js';

// Placeholder. Joined and organized activities arrive in Milestone 6.
export function MyPlansPage() {
  return (
    <>
      <PageHeader title="My plans" />
      <EmptyState
        icon={<CalendarIcon />}
        title="No plans yet"
        description="Activities you join or organize will appear here (Milestone 6)."
      />
    </>
  );
}
