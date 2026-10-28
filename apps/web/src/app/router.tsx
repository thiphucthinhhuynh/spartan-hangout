import { createBrowserRouter } from 'react-router';
import { DiscoverPage } from '../features/discover/DiscoverPage.js';
import { InboxPage } from '../features/inbox/InboxPage.js';
import { MyPlansPage } from '../features/plans/MyPlansPage.js';
import { MyProfilePage } from '../features/profile/MyProfilePage.js';
import { AppShell } from './layouts/AppShell.js';
import { NotFoundPage } from './NotFoundPage.js';

// Route table (docs/architecture.md §12.2). Auth routes and the auth guard arrive in M1–M2.
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'plans', element: <MyPlansPage /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'profile', element: <MyProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
