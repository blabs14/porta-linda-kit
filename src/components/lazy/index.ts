import { lazy } from 'react';

// Lazy loading de páginas
export const Dashboard = lazy(() => import('../../pages/Dashboard'));
export const Transactions = lazy(() => import('../../pages/Transactions'));
export const Reports = lazy(() => import('../../pages/reports'));
export const Goals = lazy(() => import('../../pages/Goals'));
export const Family = lazy(() => import('../../pages/Family'));
export const Insights = lazy(() => import('../../pages/Insights'));
export const AccountsPage = lazy(() => import('../../pages/accounts'));
export const BudgetsPage = lazy(() => import('../../pages/budgets'));
export const ProfilePage = lazy(() => import('../../pages/Profile'));

// Lazy loading para formulários menos usados
export const LazyBudgetForm = lazy(() => import('../BudgetForm'));
export const LazyFamilyInviteForm = lazy(() => import('../FamilyInviteForm'));
export const LazyFixedExpensesForm = lazy(() => import('../FixedExpensesForm'));
export const LazyNotificationForm = lazy(() => import('../NotificationForm'));
export const LazyProfileForm = lazy(() => import('../ProfileForm'));
export const LazyReminderForm = lazy(() => import('../ReminderForm'));
export const LazySettingsForm = lazy(() => import('../SettingsForm'));
export const LazyWebhookForm = lazy(() => import('../WebhookForm'));

// Lazy loading para modais
export const LazyGoalAllocationModal = lazy(() => import('../GoalAllocationModal'));
export const LazyTransferModal = lazy(() => import('../TransferModal'));

// Lazy loading para componentes de lista
export const LazyAccountList = lazy(() => import('../AccountList'));
export const LazyTransactionList = lazy(() => import('../TransactionList'));
export const LazyBudgetTable = lazy(() => import('../BudgetTable'));
export const LazyFixedExpensesList = lazy(() => import('../FixedExpensesList')); 