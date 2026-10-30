import { MESSAGES } from '@sh/shared';
import { PageHeader } from '../../app/layouts/PageHeader.js';
import { LinkButton } from '../../components/Button.js';
import { UsersIcon } from '../../components/icons.js';
import { useDiscoverStudents } from './api.js';
import { StudentList } from './StudentList.js';

/**
 * Discover students (FR43–FR44): active students who share at least one interest, most shared
 * first, then by name. At /people, reached from the Discover tab (open question Q1).
 */
export function DiscoverStudentsPage() {
  const students = useDiscoverStudents();
  return (
    <>
      <PageHeader
        title="Meet Spartans"
        subtitle="Students who share your interests."
        actions={
          <LinkButton to="/people/requests" variant="secondary">
            <UsersIcon width={20} height={20} aria-hidden="true" /> Connections
          </LinkButton>
        }
      />
      <StudentList
        query={students}
        emptyTitle={MESSAGES.noStudents}
        emptyDescription="Add more interests to your profile to meet more Spartans."
      />
    </>
  );
}
