import { createBrowserRouter } from 'react-router';
import { ActivityDetailPage } from '../features/activities/ActivityDetailPage.js';
import { ActivityFullPage } from '../features/activities/ActivityFullPage.js';
import { CreateActivityPage } from '../features/activities/CreateActivityPage.js';
import { EditActivityPage } from '../features/activities/EditActivityPage.js';
import { JoinSuccessPage } from '../features/activities/JoinSuccessPage.js';
import { CheckEmailPage } from '../features/auth/CheckEmailPage.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { RegisterPage } from '../features/auth/RegisterPage.js';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.js';
import { DiscoverPage } from '../features/discover/DiscoverPage.js';
import { SearchPage } from '../features/discover/SearchPage.js';
import { InboxPage } from '../features/inbox/InboxPage.js';
import { StudentProfilePage } from '../features/people/StudentProfilePage.js';
import { NotificationsPage } from '../features/notifications/NotificationsPage.js';
import { MyPlansPage } from '../features/plans/MyPlansPage.js';
import { EditProfilePage } from '../features/profile/EditProfilePage.js';
import { MyProfilePage } from '../features/profile/MyProfilePage.js';
import { AppShell } from './layouts/AppShell.js';
import { AuthLayout } from './layouts/AuthLayout.js';
import { NotFoundPage } from './NotFoundPage.js';
import { RequireAuth } from './RequireAuth.js';

// Route table (docs/architecture.md §12.2).
export const router = createBrowserRouter([
  // Public: registration and login (FR10).
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'register/check-email', element: <CheckEmailPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
    ],
  },
  // Everything else needs a logged-in student.
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DiscoverPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'plans', element: <MyPlansPage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'profile', element: <MyProfilePage /> },
          { path: 'profile/edit', element: <EditProfilePage /> },
          { path: 'users/:id', element: <StudentProfilePage /> },
          { path: 'activities/new', element: <CreateActivityPage /> },
          { path: 'activities/:id', element: <ActivityDetailPage /> },
          { path: 'activities/:id/edit', element: <EditActivityPage /> },
          { path: 'activities/:id/joined', element: <JoinSuccessPage /> },
          { path: 'activities/:id/full', element: <ActivityFullPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
