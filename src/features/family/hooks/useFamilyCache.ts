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
  family: unknown;
  accounts: unknown[];
  goals: unknown[];
  budgets: unknown[];
  transactions: unknown[];
  members: unknown[];
  invites: unknown[];
  kpis: unknown;
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
  const getCacheKey = useCallback((dataType: string, familyIdParam: string | null, userId: string | null) => {
    return ['family', dataType, familyIdParam, userId].filter(Boolean);
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
            return [] as unknown[];
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

    Object.keys(metricsRef.current).forEach(fid => {
      const metrics = metricsRef.current[fid];
      if (now.getTime() - metrics.lastAccess.getTime() > maxAge) {
        delete metricsRef.current[fid];
        
        // Limpar queries antigas
        queryClient.removeQueries({
          queryKey: ['family'],
          predicate: (query) => {
            const queryKey = query.queryKey as unknown[];
            return Array.isArray(queryKey) && queryKey.includes(fid);
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
      logger.error('Erro ao sincronizar cache:', error);
    }
  }, [familyId, user?.id, queryClient, getCacheKey, preloadCriticalData, invalidateCache]);

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
    invalidateCache,
    preloadCriticalData,
    getCacheMetrics,
    syncCacheWithServer,
    cleanupOldCache,
  };
};

// Hook para otimização de performance
export const useFamilyPerformanceOptimizer = (familyId: string | null) => {
  const { getCacheMetrics } = useFamilyCache(familyId);
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
    measureRenderPerformance,
    getPerformanceMetrics,
  };
};

// Hooks exportados para queries/mutações com cache (fora de callbacks)
export function useFamilyCachedQuery<TData>(
  familyId: string | null,
  dataType: string,
  queryFn: () => Promise<TData>,
  options?: Partial<CacheConfig> & {
    enabled?: boolean;
  }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = { ...(CACHE_CONFIGS[dataType] || CACHE_CONFIGS.family), ...(options || {}) };
  const key = ['family', dataType, familyId, user?.id].filter(Boolean);

  return useQuery<TData>({
    queryKey: key,
    queryFn: async () => {
      const data = await queryFn();
      return data;
    },
    enabled: (!!familyId && !!user?.id) && (options?.enabled ?? true),
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnMount: config.refetchOnMount,
    refetchOnReconnect: config.refetchOnReconnect,
  });
}

export function useFamilyCachedMutation<TVars, TData = unknown>(
  mutateFn: (vars: TVars) => Promise<TData>,
  options?: {
    dataType?: string;
    operation?: 'create' | 'update' | 'delete';
    onSuccess?: (data: TData, vars: TVars) => void;
    onError?: (err: unknown, vars: TVars) => void;
  }
) {
  const queryClient = useQueryClient();
  const invalidate = (types: string[]) => types.forEach(t => queryClient.invalidateQueries({ queryKey: ['family', t] }));

  return useMutation<TData, unknown, TVars>({
    mutationFn: mutateFn,
    onSuccess: (data, vars) => {
      const op = options?.operation || 'update';
      const dt = options?.dataType || 'family';
      if (op === 'create' || op === 'delete') invalidate([dt, 'kpis']);
      else invalidate([dt]);
      options?.onSuccess?.(data, vars);
    },
    onError: (err, vars) => {
      options?.onError?.(err, vars);
    },
  });
}