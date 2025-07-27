import { lazy } from 'react';

// Lazy loading de componentes pesados
export const Dashboard = lazy(() => import('../../pages/Dashboard'));
export const Transactions = lazy(() => import('../../pages/Transactions'));
export const Reports = lazy(() => import('../../pages/reports'));
export const Goals = lazy(() => import('../../pages/Goals'));
export const Family = lazy(() => import('../../pages/Family'));
export const Insights = lazy(() => import('../../pages/Insights'));
export const AccountsPage = lazy(() => import('../../pages/accounts'));
export const BudgetsPage = lazy(() => import('../../pages/budgets'));

// Lazy loading de componentes de formulários
export const TransactionForm = lazy(() => import('../TransactionForm'));
export const AccountForm = lazy(() => import('../AccountForm'));
export const CategoryForm = lazy(() => import('../CategoryForm'));

// Lazy loading de componentes de listas
export const TransactionList = lazy(() => import('../TransactionList'));
export const AccountList = lazy(() => import('../AccountList'));

// Lazy loading de componentes de relatórios
export const ReportChart = lazy(() => import('../ReportChart')); 