import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Tipos para métricas de performance
interface PerformanceMetrics {
  renderTime: number;
  dataLoadTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkRequests: number;
  errors: number;
  lastUpdate: Date;
}

interface FamilyMetrics {
  familyId: string;
  performance: PerformanceMetrics;
  cache: {
    hits: number;
    misses: number;
    invalidations: number;
    size: number;
  };
  operations: {
    creates: number;
    updates: number;
    deletes: number;
    reads: number;
  };
  errors: {
    network: number;
    validation: number;
    permission: number;
    unknown: number;
  };
  userActivity: {
    pageViews: number;
    actions: number;
    lastActivity: Date;
  };
}

interface MetricsConfig {
  enableRealTime: boolean;
  enablePersistent: boolean;
  enableAnalytics: boolean;
  sampleRate: number; // 0-1, percentagem de eventos a capturar
  maxHistorySize: number;
}

// Configuração padrão
const DEFAULT_CONFIG: MetricsConfig = {
  enableRealTime: true,
  enablePersistent: true,
  enableAnalytics: false,
  sampleRate: 1.0,
  maxHistorySize: 1000,
};

// Hook principal para métricas de família
export const useFamilyMetrics = (familyId: string | null, config: Partial<MetricsConfig> = {}) => {
  const queryClient = useQueryClient();
  const finalConfig = useMemo<MetricsConfig>(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const metricsRef = useRef<Record<string, FamilyMetrics>>({});
  const historyRef = useRef<FamilyMetrics[]>([]);
  const observersRef = useRef<Set<(metrics: FamilyMetrics) => void>>(new Set());
  
  const [currentMetrics, setCurrentMetrics] = useState<FamilyMetrics | null>(null);

  // Inicializar métricas para a família
  useEffect(() => {
    if (!familyId) return;

    if (!metricsRef.current[familyId]) {
      metricsRef.current[familyId] = {
        familyId,
        performance: {
          renderTime: 0,
          dataLoadTime: 0,
          cacheHitRate: 0,
          memoryUsage: 0,
          networkRequests: 0,
          errors: 0,
          lastUpdate: new Date(),
        },
        cache: {
          hits: 0,
          misses: 0,
          invalidations: 0,
          size: 0,
        },
        operations: {
          creates: 0,
          updates: 0,
          deletes: 0,
          reads: 0,
        },
        errors: {
          network: 0,
          validation: 0,
          permission: 0,
          unknown: 0,
        },
        userActivity: {
          pageViews: 0,
          actions: 0,
          lastActivity: new Date(),
        },
      };
    }

    setCurrentMetrics(metricsRef.current[familyId]);
  }, [familyId]);

  // Função para atualizar métricas (declarada cedo para evitar uso antes da definição)
  const updateMetrics = useCallback(() => {
    if (!familyId) return;

    const metrics = metricsRef.current[familyId];
    if (!metrics) return;

    // Adicionar ao histórico
    historyRef.current.push({ ...metrics });
    
    // Limitar tamanho do histórico
    if (historyRef.current.length > finalConfig.maxHistorySize) {
      historyRef.current.shift();
    }

    // Notificar observadores
    observersRef.current.forEach(observer => {
      try {
        observer(metrics);
      } catch (error) {
        console.error('Error in metrics observer:', error);
      }
    });

    // Persistir se ativado
    if (finalConfig.enablePersistent) {
      try {
        localStorage.setItem(`family-metrics-${familyId}`, JSON.stringify(metrics));
      } catch (error) {
        console.error('Error persisting metrics:', error);
      }
    }

    setCurrentMetrics(metrics);
  }, [familyId, finalConfig.enablePersistent, finalConfig.maxHistorySize]);

  // Função para medir tempo de renderização
  const measureRenderTime = useCallback((componentName: string) => {
    if (!familyId || Math.random() > finalConfig.sampleRate) return () => {};

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (metricsRef.current[familyId]) {
        metricsRef.current[familyId].performance.renderTime = renderTime;
        metricsRef.current[familyId].performance.lastUpdate = new Date();
        metricsRef.current[familyId].userActivity.actions++;
        metricsRef.current[familyId].userActivity.lastActivity = new Date();
        
        updateMetrics();
      }
    };
  }, [familyId, finalConfig.sampleRate, updateMetrics]);

  // Função para medir tempo de carregamento de dados
  const measureDataLoadTime = useCallback((operation: string) => {
    if (!familyId || Math.random() > finalConfig.sampleRate) return () => {};

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (metricsRef.current[familyId]) {
        metricsRef.current[familyId].performance.dataLoadTime = loadTime;
        metricsRef.current[familyId].performance.networkRequests++;
        metricsRef.current[familyId].operations.reads++;
        metricsRef.current[familyId].performance.lastUpdate = new Date();
        
        updateMetrics();
      }
    };
  }, [familyId, finalConfig.sampleRate, updateMetrics]);

  // Função para registar operações CRUD
  const recordOperation = useCallback((operation: 'create' | 'update' | 'delete' | 'read') => {
    if (!familyId) return;

    if (metricsRef.current[familyId]) {
      metricsRef.current[familyId].operations[operation + 's']++;
      metricsRef.current[familyId].userActivity.actions++;
      metricsRef.current[familyId].userActivity.lastActivity = new Date();
      
      updateMetrics();
    }
  }, [familyId, updateMetrics]);

  // Função para registar erros
  const recordError = useCallback((errorType: 'network' | 'validation' | 'permission' | 'unknown', error?: Error) => {
    if (!familyId) return;

    if (metricsRef.current[familyId]) {
      metricsRef.current[familyId].errors[errorType]++;
      metricsRef.current[familyId].performance.errors++;
      metricsRef.current[familyId].performance.lastUpdate = new Date();
      
      // Log detalhado do erro se analytics estiver ativo
      if (finalConfig.enableAnalytics && error) {
        console.error(`[FamilyMetrics] Error recorded:`, {
          familyId,
          errorType,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }
      
      updateMetrics();
    }
  }, [familyId, finalConfig.enableAnalytics, updateMetrics]);

  // Função para registar atividade de cache
  const recordCacheActivity = useCallback((activity: 'hit' | 'miss' | 'invalidation', size?: number) => {
    if (!familyId) return;

    if (metricsRef.current[familyId]) {
      metricsRef.current[familyId].cache[activity + 's']++;
      if (size !== undefined) {
        metricsRef.current[familyId].cache.size = size;
      }
      
      // Calcular hit rate
      const { hits, misses } = metricsRef.current[familyId].cache;
      metricsRef.current[familyId].performance.cacheHitRate = 
        hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;
      
      updateMetrics();
    }
  }, [familyId, updateMetrics]);

  // Função para registar visualização de página
  const recordPageView = useCallback((pageName: string) => {
    if (!familyId) return;

    if (metricsRef.current[familyId]) {
      metricsRef.current[familyId].userActivity.pageViews++;
      metricsRef.current[familyId].userActivity.lastActivity = new Date();
      
      updateMetrics();
    }
  }, [familyId, updateMetrics]);

  // Função para medir uso de memória
  const measureMemoryUsage = useCallback(() => {
    if (!familyId || !('memory' in performance)) return;

    try {
      const memory = (performance as any).memory;
      if (memory) {
        if (metricsRef.current[familyId]) {
          metricsRef.current[familyId].performance.memoryUsage = 
            memory.usedJSHeapSize / 1024 / 1024; // MB
          updateMetrics();
        }
      }
    } catch (error) {
      // Ignorar erros de medição de memória
    }
  }, [familyId, updateMetrics]);

  // Função para obter métricas atuais
  const getCurrentMetrics = useCallback(() => {
    if (!familyId) return null;
    return metricsRef.current[familyId] || null;
  }, [familyId]);

  // Função para obter histórico de métricas
  const getMetricsHistory = useCallback(() => {
    return [...historyRef.current];
  }, []);

  // Função para limpar métricas
  const clearMetrics = useCallback(() => {
    if (!familyId) return;

    delete metricsRef.current[familyId];
    historyRef.current = historyRef.current.filter(m => m.familyId !== familyId);
    
    if (finalConfig.enablePersistent) {
      try {
        localStorage.removeItem(`family-metrics-${familyId}`);
      } catch (error) {
        console.error('Error clearing persisted metrics:', error);
      }
    }

    setCurrentMetrics(null);
  }, [familyId, finalConfig.enablePersistent]);

  // Função para exportar métricas
  const exportMetrics = useCallback(() => {
    if (!familyId) return null;

    const metrics = metricsRef.current[familyId];
    if (!metrics) return null;

    return {
      familyId,
      metrics,
      history: historyRef.current.filter(m => m.familyId === familyId),
      exportDate: new Date().toISOString(),
      config: finalConfig,
    };
  }, [familyId, finalConfig]);

  // Função para subscrever a mudanças de métricas
  const subscribeToMetrics = useCallback((observer: (metrics: FamilyMetrics) => void) => {
    observersRef.current.add(observer);
    
    return () => {
      observersRef.current.delete(observer);
    };
  }, []);

  // Efeito para medição periódica de memória
  useEffect(() => {
    if (!finalConfig.enableRealTime || !familyId) return;

    const interval = setInterval(measureMemoryUsage, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [familyId, finalConfig.enableRealTime, measureMemoryUsage]);

  // Efeito para carregar métricas persistentes
  useEffect(() => {
    if (!familyId || !finalConfig.enablePersistent) return;

    try {
      const persisted = localStorage.getItem(`family-metrics-${familyId}`);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        metricsRef.current[familyId] = parsed;
        setCurrentMetrics(parsed);
      }
    } catch (error) {
      console.error('Error loading persisted metrics:', error);
    }
  }, [familyId, finalConfig.enablePersistent]);

  // Efeito para limpeza automática
  useEffect(() => {
    const cleanup = () => {
      const now = new Date();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias

      Object.keys(metricsRef.current).forEach(id => {
        const metrics = metricsRef.current[id];
        if (now.getTime() - metrics.userActivity.lastActivity.getTime() > maxAge) {
          delete metricsRef.current[id];
        }
      });

      historyRef.current = historyRef.current.filter(m => 
        now.getTime() - m.userActivity.lastActivity.getTime() <= maxAge
      );
    };

    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000); // 24 horas
    
    return () => clearInterval(interval);
  }, []);

  return {
    // Métricas atuais
    currentMetrics,
    
    // Funções de medição
    measureRenderTime,
    measureDataLoadTime,
    measureMemoryUsage,
    
    // Funções de registo
    recordOperation,
    recordError,
    recordCacheActivity,
    recordPageView,
    
    // Funções de acesso
    getCurrentMetrics,
    getMetricsHistory,
    clearMetrics,
    exportMetrics,
    
    // Subscrição
    subscribeToMetrics,
    
    // Configuração
    config: finalConfig,
  };
};

// Hook para métricas de performance específicas
export const useFamilyPerformanceMetrics = (familyId: string | null) => {
  const { currentMetrics, measureRenderTime, measureDataLoadTime, recordOperation } = useFamilyMetrics(familyId);
  
  // Função para obter métricas de performance resumidas
  const getPerformanceSummary = useCallback(() => {
    if (!currentMetrics) return null;

    const { performance, cache, operations, errors } = currentMetrics;
    
    return {
      averageRenderTime: performance.renderTime,
      averageLoadTime: performance.dataLoadTime,
      cacheEfficiency: cache.hits / (cache.hits + cache.misses) * 100,
      operationSuccess: (operations.reads + operations.creates + operations.updates + operations.deletes) / 
                       (operations.reads + operations.creates + operations.updates + operations.deletes + errors.network + errors.validation + errors.permission + errors.unknown) * 100,
      memoryUsage: performance.memoryUsage,
      networkEfficiency: operations.reads / performance.networkRequests * 100,
    };
  }, [currentMetrics]);

  // Função para obter alertas de performance
  const getPerformanceAlerts = useCallback(() => {
    if (!currentMetrics) return [];

    const alerts = [];
    const { performance, errors } = currentMetrics;

    if (performance.renderTime > 100) {
      alerts.push({
        type: 'warning',
        message: 'Tempo de renderização elevado',
        value: `${performance.renderTime.toFixed(2)}ms`,
        threshold: 100,
      });
    }

    if (performance.memoryUsage > 50) {
      alerts.push({
        type: 'error',
        message: 'Uso de memória elevado',
        value: `${performance.memoryUsage.toFixed(2)}MB`,
        threshold: 50,
      });
    }

    if (errors.network > 10) {
      alerts.push({
        type: 'error',
        message: 'Muitos erros de rede',
        value: errors.network,
        threshold: 10,
      });
    }

    return alerts;
  }, [currentMetrics]);

  return {
    currentMetrics,
    measureRenderTime,
    measureDataLoadTime,
    recordOperation,
    getPerformanceSummary,
    getPerformanceAlerts,
  };
}; 