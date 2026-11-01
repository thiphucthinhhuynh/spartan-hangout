import { Role } from '@sh/shared';
import { Outlet } from 'react-router';
import { useCurrentUser } from '../features/auth/api.js';
import { NotFoundPage } from './NotFoundPage.js';

/** FR53: administrator pages look like they don't exist to everyone else. The API checks too. */
export function RequireAdmin() {
  const me = useCurrentUser();
  return me.role === Role.ADMIN ? <Outlet /> : <NotFoundPage />;
}
