import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState.js';
import { PageHeader } from './layouts/PageHeader.js';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="We couldn't find that page."
        action={<Link to="/">Back to Discover</Link>}
      />
    </>
  );
}
