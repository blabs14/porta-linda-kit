import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

// Tipos para cache inteligente
interface CacheConfig {
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnMount: boolean;
  refetchOnReconnect: boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  lastAccess: Date;
  size: number;
}

interface FamilyCacheData {
  family: any;
  accounts: any[];
  goals: any[];
  budgets: any[];
  transactions: any[];
  members: any[];
  invites: any[];
  kpis: any;
}

// Configurações de cache por tipo de dados
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  family: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  accounts: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  goals: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  budgets: {
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  transactions: {
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  members: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  invites: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  kpis: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
};

// Hook principal para cache inteligente
export const useFamilyCache = (familyId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const metricsRef = useRef<Record<string, CacheMetrics>>({});
  const lastSyncRef = useRef<Date>(new Date());

  // Inicializar métricas
  useEffect(() => {
    if (!metricsRef.current[familyId || 'default']) {
      metricsRef.current[familyId || 'default'] = {
        hits: 0,
        misses: 0,
        invalidations: 0,
        lastAccess: new Date(),
        size: 0,
      };
    }
  }, [familyId]);

  // Função para obter configuração de cache
  const getCacheConfig = useCallback((dataType: string): CacheConfig => {
    return CACHE_CONFIGS[dataType] || CACHE_CONFIGS.family;
  }, []);

  // Função para gerar chave de cache
  const getCacheKey = useCallback((dataType: string, familyId: string | null, userId: string | null) => {
    return ['family', dataType, familyId, userId].filter(Boolean);
  }, []);

  // Função para invalidar cache seletivamente
  const invalidateCache = useCallback((dataTypes: string[] = []) => {
    if (!familyId || !user?.id) return;

    const typesToInvalidate = dataTypes.length > 0 ? dataTypes : Object.keys(CACHE_CONFIGS);
    
    typesToInvalidate.forEach(dataType => {
      const cacheKey = getCacheKey(dataType, familyId, user.id);
      queryClient.invalidateQueries({ queryKey: cacheKey });
      
      // Atualizar métricas
      if (metricsRef.current[familyId]) {
        metricsRef.current[familyId].invalidations++;
        metricsRef.current[familyId].lastAccess = new Date();
      }
    });

    lastSyncRef.current = new Date();
  }, [familyId, user?.id, queryClient, getCacheKey]);

  // Função para pré-carregar dados importantes
  const preloadCriticalData = useCallback(async () => {
    if (!familyId || !user?.id) return;

    const criticalTypes = ['family', 'accounts', 'kpis'];
    
    await Promise.all(
      criticalTypes.map(async (dataType) => {
        const cacheKey = getCacheKey(dataType, familyId, user.id);
        await queryClient.prefetchQuery({
          queryKey: cacheKey,
          queryFn: async () => {
            // Mock - será implementado com funções reais
            return [];
          },
          ...getCacheConfig(dataType),
        });
      })
    );
  }, [familyId, user?.id, queryClient, getCacheKey, getCacheConfig]);

  // Função para limpar cache antigo
  const cleanupOldCache = useCallback(() => {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    Object.keys(metricsRef.current).forEach(familyId => {
      const metrics = metricsRef.current[familyId];
      if (now.getTime() - metrics.lastAccess.getTime() > maxAge) {
        delete metricsRef.current[familyId];
        
        // Limpar queries antigas
        queryClient.removeQueries({
          queryKey: ['family'],
          predicate: (query) => {
            const queryKey = query.queryKey as string[];
            return queryKey.includes(familyId);
          },
        });
      }
    });
  }, [queryClient]);

  // Função para obter métricas de cache
  const getCacheMetrics = useCallback(() => {
    return metricsRef.current[familyId || 'default'] || {
      hits: 0,
      misses: 0,
      invalidations: 0,
      lastAccess: new Date(),
      size: 0,
    };
  }, [familyId]);

  // Função para sincronizar cache com servidor
  const syncCacheWithServer = useCallback(async () => {
    if (!familyId || !user?.id) return;

    try {
      // Verificar se há dados desatualizados
      const cacheData = queryClient.getQueryData<FamilyCacheData>(
        getCacheKey('family', familyId, user.id)
      );

      if (!cacheData) {
        // Cache vazio, carregar dados
        await preloadCriticalData();
        return;
      }

      // Verificar se os dados estão muito antigos
      const now = new Date();
      const lastSync = lastSyncRef.current;
      const maxStaleTime = 10 * 60 * 1000; // 10 minutos

      if (now.getTime() - lastSync.getTime() > maxStaleTime) {
        // Dados desatualizados, invalidar e recarregar
        invalidateCache(['family', 'accounts', 'kpis']);
        await preloadCriticalData();
      }
    } catch (error) {
      console.error('Erro ao sincronizar cache:', error);
    }
  }, [familyId, user?.id, queryClient, getCacheKey, preloadCriticalData, invalidateCache]);

  // Hook para dados com cache inteligente
  const useCachedFamilyData = useCallback((
    dataType: string,
    queryFn: () => Promise<any>,
    options: any = {}
  ) => {
    if (!familyId || !user?.id) {
      return {
        data: null,
        isLoading: false,
        error: null,
        refetch: () => Promise.resolve(),
      };
    }

    const cacheKey = getCacheKey(dataType, familyId, user.id);
    const config = getCacheConfig(dataType);

    return useQuery({
      queryKey: cacheKey,
      queryFn,
      enabled: !!familyId && !!user?.id,
      ...config,
      ...options,
      onSuccess: (data) => {
        // Atualizar métricas
        if (metricsRef.current[familyId]) {
          metricsRef.current[familyId].hits++;
          metricsRef.current[familyId].lastAccess = new Date();
          metricsRef.current[familyId].size = JSON.stringify(data).length;
        }
      },
      onError: () => {
        // Atualizar métricas
        if (metricsRef.current[familyId]) {
          metricsRef.current[familyId].misses++;
          metricsRef.current[familyId].lastAccess = new Date();
        }
      },
    });
  }, [familyId, user?.id, getCacheKey, getCacheConfig]);

  // Hook para mutações com cache inteligente
  const useCachedFamilyMutation = useCallback((
    mutationFn: (data: any) => Promise<any>,
    options: any = {}
  ) => {
    return useMutation({
      mutationFn,
      onSuccess: (data, variables) => {
        // Invalidar cache relevante baseado na operação
        const operation = options.operation || 'update';
        const dataType = options.dataType || 'family';
        
        if (operation === 'create' || operation === 'delete') {
          invalidateCache([dataType, 'kpis']);
        } else {
          invalidateCache([dataType]);
        }

        // Chamar callback de sucesso se fornecido
        if (options.onSuccess) {
          options.onSuccess(data, variables);
        }
      },
      onError: (error, variables) => {
        // Chamar callback de erro se fornecido
        if (options.onError) {
          options.onError(error, variables);
        }
      },
      ...options,
    });
  }, [invalidateCache]);

  // Efeito para limpeza automática
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldCache, 60 * 60 * 1000); // 1 hora
    const syncInterval = setInterval(syncCacheWithServer, 5 * 60 * 1000); // 5 minutos

    return () => {
      clearInterval(cleanupInterval);
      clearInterval(syncInterval);
    };
  }, [cleanupOldCache, syncCacheWithServer]);

  // Efeito para sincronização inicial
  useEffect(() => {
    if (familyId && user?.id) {
      syncCacheWithServer();
    }
  }, [familyId, user?.id, syncCacheWithServer]);

  return {
    useCachedFamilyData,
    useCachedFamilyMutation,
    invalidateCache,
    preloadCriticalData,
    getCacheMetrics,
    syncCacheWithServer,
    cleanupOldCache,
  };
};

// Hook para otimização de performance
export const useFamilyPerformanceOptimizer = (familyId: string | null) => {
  const { useCachedFamilyData, getCacheMetrics } = useFamilyCache(familyId);
  const performanceRef = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });

  // Função para medir performance de renderização
  const measureRenderPerformance = useCallback(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      performanceRef.current.renderCount++;
      performanceRef.current.lastRenderTime = renderTime;
      performanceRef.current.averageRenderTime = 
        (performanceRef.current.averageRenderTime * (performanceRef.current.renderCount - 1) + renderTime) / 
        performanceRef.current.renderCount;
    };
  }, []);

  // Função para obter métricas de performance
  const getPerformanceMetrics = useCallback(() => {
    return {
      ...performanceRef.current,
      cacheMetrics: getCacheMetrics(),
    };
  }, [getCacheMetrics]);

  return {
    useCachedFamilyData,
    measureRenderPerformance,
    getPerformanceMetrics,
  };
}; 