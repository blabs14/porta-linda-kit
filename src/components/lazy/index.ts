import { lazy } from 'react';

// Lazy loading para formulários menos usados
export const LazyFormularioOrcamento = lazy(() => import('../FormularioOrcamento'));
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
export const LazyListaContas = lazy(() => import('../ListaContas'));
export const LazyListaTransacoes = lazy(() => import('../ListaTransacoes'));
export const LazyTabelaOrcamentos = lazy(() => import('../TabelaOrcamentos'));
export const LazyFixedExpensesList = lazy(() => import('../FixedExpensesList')); 