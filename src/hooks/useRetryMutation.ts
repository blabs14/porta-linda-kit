import { useState, useCallback } from 'react';
import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { showError, showSuccess } from '../lib/utils';

interface RetryOptions<TError = unknown> {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: TError) => boolean;
}

interface UseRetryMutationOptions<TData, TError, TVariables, TContext = unknown> extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  retryOptions?: RetryOptions<TError>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: TError, variables: TVariables, context: TContext) => void;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export const useRetryMutation = <TData, TError = unknown, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseRetryMutationOptions<TData, TError, TVariables, TContext> = {}
): UseMutationResult<TData, TError, TVariables, TContext> & { retryCount: number; isRetrying: boolean } => {
  const { retryOptions = {}, onSuccess, onError, successMessage, errorMessage, showToast = true, ...mutationOptions } = options;
  const { maxRetries = 3, retryDelay = 1000, retryCondition } = retryOptions;
  
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const shouldRetry = useCallback((error: TError) => {
    if (retryCount >= maxRetries) return false;
    if (retryCondition) return retryCondition(error);
    
    const err = error as unknown as { message?: string; code?: string; status?: number };
    // Retry por padrão em erros de rede
    return Boolean(
      err?.message?.includes('network') || 
      err?.message?.includes('fetch') ||
      err?.code === 'NETWORK_ERROR' ||
      (typeof err?.status === 'number' && err.status >= 500)
    );
  }, [retryCount, maxRetries, retryCondition]);

  const retry = useCallback(async (variables: TVariables): Promise<TData> => {
    let lastError: TError | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 0);
        setRetryCount(attempt);
        
        const result = await mutationFn(variables);
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error: unknown) {
        lastError = error as TError;
        
        if (attempt === maxRetries || !shouldRetry(lastError)) {
          setRetryCount(0);
          setIsRetrying(false);
          throw lastError;
        }
        
        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
    
    throw lastError as TError;
  }, [mutationFn, maxRetries, retryDelay, shouldRetry]);

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    mutationFn: retry,
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (showToast && successMessage) {
        showSuccess(successMessage);
      }
      onSuccess?.(data, variables, context as TContext);
    },
    onError: (error, variables, context) => {
      if (showToast && errorMessage) {
        showError(errorMessage);
      }
      onError?.(error, variables, context as TContext);
    },
  });

  return {
    ...mutation,
    retryCount,
    isRetrying,
  };
};

// Hook específico para operações CRUD com retry
export const useRetryCrudMutation = <TData, TError = unknown, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    operation: 'create' | 'update' | 'delete';
    entityName: string;
    retryConfig?: RetryOptions<TError>;
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: TError, variables: TVariables, context: TContext) => void;
  }
) => {
  const { operation, entityName, retryConfig, onSuccess, onError } = options;
  
  const messages = {
    create: {
      success: `${entityName} criado com sucesso`,
      error: `Erro ao criar ${entityName}`,
    },
    update: {
      success: `${entityName} atualizado com sucesso`,
      error: `Erro ao atualizar ${entityName}`,
    },
    delete: {
      success: `${entityName} eliminado com sucesso`,
      error: `Erro ao eliminar ${entityName}`,
    },
  } as const;

  return useRetryMutation<TData, TError, TVariables, TContext>(mutationFn, {
    retryOptions: retryConfig,
    successMessage: messages[operation].success,
    errorMessage: messages[operation].error,
    onSuccess,
    onError,
  });
}; 