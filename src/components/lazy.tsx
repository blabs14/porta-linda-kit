import { lazy } from 'react';

// Lazy loading das páginas
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const Transactions = lazy(() => import('../pages/Transactions'));
export const Reports = lazy(() => import('../pages/reports'));
export const Goals = lazy(() => import('../pages/Goals'));
export const Family = lazy(() => import('../pages/Family'));
export const Insights = lazy(() => import('../pages/Insights'));
export const AccountsPage = lazy(() => import('../pages/accounts'));
export const BudgetsPage = lazy(() => import('../pages/budgets')); 