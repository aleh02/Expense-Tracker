//router
import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AuthGuard } from '../features/auth/components/AuthGuard';

const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const ExpensesPage = lazy(() =>
  import('../features/expenses/pages/ExpensesPage').then((m) => ({
    default: m.ExpensesPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('../features/categories/pages/CategoriesPage').then((m) => ({
    default: m.CategoriesPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
);

function withSuspense(page: ReactNode) {
  return <Suspense fallback={<p>Loading...</p>}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { path: 'dashboard', element: withSuspense(<DashboardPage />) },
      { path: 'expenses', element: withSuspense(<ExpensesPage />) },
      { path: 'categories', element: withSuspense(<CategoriesPage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
      { path: '*', element: <Navigate to="/app/dashboard" replace /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/app/dashboard" replace />,
  },
]);
