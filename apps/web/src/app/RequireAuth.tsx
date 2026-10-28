import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../components/Button.js';
import { EmptyState } from '../components/EmptyState.js';
import { useMe } from '../features/auth/api.js';

/** FR10: everything except registration and login needs a logged-in student. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) {
    return <EmptyState title="Loading…" />;
  }
  if (me.isError) {
    return (
      <EmptyState
        title="We couldn't reach Spartan Hangout."
        description="Check your connection and try again."
        action={<Button onClick={() => void me.refetch()}>Try again</Button>}
      />
    );
  }
  if (!me.data) {
    const here = location.pathname + location.search;
    const to = here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`;
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}
