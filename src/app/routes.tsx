//router
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AuthGuard } from "../features/auth/components/AuthGuard";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ExpensesPage } from "../features/expenses/pages/ExpensesPage";
import { CategoriesPage } from "../features/categories/pages/CategoriesPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/app/dashboard" replace />,
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/app',
        element: (
            <AuthGuard>
                <AppLayout />
            </AuthGuard>
        ),
        children: [
            { path: 'dashboard', element: <DashboardPage /> },
            { path: 'expenses', element: <ExpensesPage /> },
            { path: 'categories', element: <CategoriesPage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: '*', element: <Navigate to="/app/dashboard" replace /> },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/app/dashboard" replace />,
    },
]);

