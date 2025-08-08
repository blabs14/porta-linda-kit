import React, { lazy, Suspense } from 'react';

export const LazyFallback: React.FC<{ message?: string }> = ({ message = 'A carregar...' }) => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
    <span className="text-sm text-muted-foreground">{message}</span>
  </div>
);

export function withLazyLoading<P>(Component: React.ComponentType<P>, fallback?: React.ReactNode) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  const Wrapped: React.FC<P> = (props: P) => (
    <Suspense fallback={fallback || <LazyFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return Wrapped;
}

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
        setService(null);
      }
    };

    loadService();
  }, [serviceImport]);

  return { service, loading, error };
}

export function withLoadingState<P>(Component: React.ComponentType<P>, LoadingComponent?: React.ComponentType) {
  const Wrapper: React.FC<P & { loading?: boolean }> = ({ loading, ...props }) => {
    if (loading) {
      return LoadingComponent ? <LoadingComponent /> : <LazyFallback />;
    }
    return <Component {...(props as P)} />;
  };
  return Wrapper;
}

export function createLazyComponent<P = unknown>(importFn: () => Promise<{ default: React.ComponentType<P> }>, fallbackComponent?: React.ComponentType) {
  return lazy(() => 
    importFn().catch((error) => {
      console.warn('Lazy component loading failed:', error);
      return {
        default: (fallbackComponent || (() => (
          <div className="p-4 text-center text-muted-foreground border border-dashed border-muted-foreground/20 rounded-lg">
            <div className="text-sm font-medium mb-1">Componente não disponível</div>
            <div className="text-xs opacity-70">Tente novamente mais tarde</div>
          </div>
        ))) as React.ComponentType<P>
      };
    })
  );
}

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