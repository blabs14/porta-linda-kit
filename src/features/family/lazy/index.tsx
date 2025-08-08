// Componentes Lazy para Finanças Partilhadas
// Otimização de performance com carregamento sob demanda

import React, { lazy } from 'react';

// Componente de fallback para componentes não disponíveis
const ComponentFallback: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 text-center text-muted-foreground border border-dashed border-muted-foreground/20 rounded-lg">
    <div className="text-sm font-medium mb-1">{message}</div>
    <div className="text-xs opacity-70">Componente em desenvolvimento</div>
  </div>
);

// Função utilitária local (apenas para este ficheiro) para criar lazy components com tratamento de erros
const createSafeLazyComponent = (importPath: string, fallbackMessage: string) => {
  return lazy(() => 
    import(/* @vite-ignore */ importPath).catch(() => ({
      default: () => <ComponentFallback message={fallbackMessage} />
    }))
  );
};

// Componentes de Formulários Pesados - com tratamento de erros robusto
export const LazyTransactionForm = createSafeLazyComponent(
  '../../components/TransactionForm',
  'Formulário de Transação'
);

export const LazyGoalAllocationModal = createSafeLazyComponent(
  '../../components/GoalAllocationModal',
  'Modal de Alocação'
);

export const LazyGoalForm = createSafeLazyComponent(
  '../../components/GoalForm',
  'Formulário de Objetivo'
);

export const LazyAccountForm = createSafeLazyComponent(
  '../../components/AccountForm',
  'Formulário de Conta'
);

export const LazyRegularAccountForm = createSafeLazyComponent(
  '../../components/RegularAccountForm',
  'Formulário de Conta Regular'
);

export const LazyBudgetForm = createSafeLazyComponent(
  '../../components/BudgetForm',
  'Formulário de Orçamento'
);

// Componentes de Diálogos e Modais - com tratamento de erros robusto
export const LazyConfirmationDialog = createSafeLazyComponent(
  '../../components/ui/confirmation-dialog',
  'Diálogo de Confirmação'
);

export const LazyTransferModal = createSafeLazyComponent(
  '../../components/TransferModal',
  'Modal de Transferência'
);

// Componentes de UI Pesados - com tratamento de erros robusto
export const LazyTooltip = createSafeLazyComponent(
  '../../components/ui/tooltip',
  'Tooltip'
);

export const LazySelect = createSafeLazyComponent(
  '../../components/ui/select',
  'Select'
);

export const LazyDialog = createSafeLazyComponent(
  '../../components/ui/dialog',
  'Dialog'
);

export const LazySheet = createSafeLazyComponent(
  '../../components/ui/sheet',
  'Sheet'
);

// Componentes de Gráficos e Visualizações - com tratamento de erros robusto
export const LazyReportChart = createSafeLazyComponent(
  '../../components/ReportChart',
  'Gráfico de Relatório'
);

export const LazyChart = createSafeLazyComponent(
  '../../components/ui/chart',
  'Chart'
);

// Componentes de Notificações - com tratamento de erros robusto
export const LazyRealTimeNotifications = createSafeLazyComponent(
  '../../components/RealTimeNotifications',
  'Notificações em Tempo Real'
); 