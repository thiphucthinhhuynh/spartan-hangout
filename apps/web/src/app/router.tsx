import { createBrowserRouter } from 'react-router';
import { CheckEmailPage } from '../features/auth/CheckEmailPage.js';
import { RegisterPage } from '../features/auth/RegisterPage.js';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.js';
import { DiscoverPage } from '../features/discover/DiscoverPage.js';
import { InboxPage } from '../features/inbox/InboxPage.js';
import { MyPlansPage } from '../features/plans/MyPlansPage.js';
import { MyProfilePage } from '../features/profile/MyProfilePage.js';
import { AppShell } from './layouts/AppShell.js';
import { AuthLayout } from './layouts/AuthLayout.js';
import { NotFoundPage } from './NotFoundPage.js';

// Route table (docs/architecture.md §12.2). Login and the auth guard arrive in M2.
export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: 'register', element: <RegisterPage /> },
      { path: 'register/check-email', element: <CheckEmailPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
    ],
  },
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
