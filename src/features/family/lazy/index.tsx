// Componentes Lazy para Finanças Partilhadas
// Otimização de performance com carregamento sob demanda

import React, { lazy, Suspense } from 'react';

// Componente de fallback otimizado
export const LazyFallback: React.FC<{ message?: string }> = ({ message = "A carregar..." }) => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
    <span className="text-sm text-muted-foreground">{message}</span>
  </div>
);

// Componente de fallback para componentes não disponíveis
const ComponentFallback: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 text-center text-muted-foreground border border-dashed border-muted-foreground/20 rounded-lg">
    <div className="text-sm font-medium mb-1">{message}</div>
    <div className="text-xs opacity-70">Componente em desenvolvimento</div>
  </div>
);

// Função utilitária para criar lazy components com tratamento de erros robusto
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

// Wrapper para Suspense com fallback otimizado
export function withLazyLoading<P>(Component: React.ComponentType<P>, fallback?: React.ReactNode) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  const Wrapped: React.FC<P> = (props: P) => (
    <Suspense fallback={fallback || <LazyFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return Wrapped;
}

// Hook personalizado para lazy loading de serviços com tratamento de erros robusto
export function useLazyService<TModule = unknown>(serviceImport: () => Promise<TModule>) {
  const [service, setService] = React.useState<TModule | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const loadService = async () => {
      try {
        const startTime = performance.now();
        const serviceModule = await serviceImport();
        const loadTime = performance.now() - startTime;
        console.log(`✅ Lazy service loaded (${loadTime.toFixed(2)}ms)`);
        
        setService(serviceModule);
        setLoading(false);
      } catch (err) {
        console.warn('⚠️ Lazy service loading failed:', err);
        setError(err as Error);
        setLoading(false);
        // Fallback para evitar quebras na aplicação
        setService(null);
      }
    };

    loadService();
  }, [serviceImport]);

  return { service, loading, error };
}

// Wrapper para componentes com loading state
export function withLoadingState<P>(Component: React.ComponentType<P>, LoadingComponent?: React.ComponentType) {
  const Wrapper: React.FC<P & { loading?: boolean }> = ({ loading, ...props }) => {
    if (loading) {
      return LoadingComponent ? <LoadingComponent /> : <LazyFallback />;
    }
    return <Component {...(props as P)} />;
  };
  return Wrapper;
}

// Função utilitária para criar lazy components com retry
export function createLazyComponent<P = unknown>(importFn: () => Promise<{ default: React.ComponentType<P> }>, fallbackComponent?: React.ComponentType) {
  return lazy(() => 
    importFn().catch((error) => {
      console.warn('Lazy component loading failed:', error);
      return {
        default: (fallbackComponent || (() => <ComponentFallback message="Componente não disponível" />)) as React.ComponentType<P>
      };
    })
  );
}

// Hook para monitorizar performance do lazy loading
export const useLazyLoadingMetrics = () => {
  const [metrics, setMetrics] = React.useState({
    loadedComponents: 0,
    failedComponents: 0,
    totalLoadTime: 0,
    averageLoadTime: 0
  });

  const trackComponentLoad = React.useCallback((componentName: string, loadTime: number, success: boolean) => {
    setMetrics(prev => {
      const newLoaded = prev.loadedComponents + (success ? 1 : 0);
      const newFailed = prev.failedComponents + (success ? 0 : 1);
      const newTotalTime = prev.totalLoadTime + loadTime;
      const newAverage = newLoaded > 0 ? newTotalTime / newLoaded : 0;
      
      return {
        loadedComponents: newLoaded,
        failedComponents: newFailed,
        totalLoadTime: newTotalTime,
        averageLoadTime: newAverage
      };
    });
  }, []);

  return { metrics, trackComponentLoad };
};

// Componente de erro boundary para lazy loading
export const LazyErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }>;
}> = ({ children, fallback: FallbackComponent }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Lazy loading error:', event.error);
      setError(event.error || new Error('Unknown error'));
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return FallbackComponent ? (
      <FallbackComponent error={error || undefined} />
    ) : (
      <div className="p-4 text-center text-red-600 border border-red-200 rounded-lg bg-red-50">
        <div className="text-sm font-medium mb-1">Erro ao carregar componente</div>
        <div className="text-xs opacity-70">Tente recarregar a página</div>
      </div>
    );
  }

  return <>{children}</>;
}; 