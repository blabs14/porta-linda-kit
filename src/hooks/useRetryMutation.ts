import { useState, useCallback } from 'react';
import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { showError, showSuccess } from '../lib/utils';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
}

interface UseRetryMutationOptions<TData, TError, TVariables> extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  retryOptions?: RetryOptions;
  onSuccess?: (data: TData, variables: TVariables, context: any) => void;
  onError?: (error: TError, variables: TVariables, context: any) => void;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export const useRetryMutation = <TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseRetryMutationOptions<TData, TError, TVariables> = {}
): UseMutationResult<TData, TError, TVariables> & { retryCount: number; isRetrying: boolean } => {
  const { retryOptions = {}, onSuccess, onError, successMessage, errorMessage, showToast = true, ...mutationOptions } = options;
  const { maxRetries = 3, retryDelay = 1000, retryCondition } = retryOptions;
  
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const shouldRetry = useCallback((error: any) => {
    if (retryCount >= maxRetries) return false;
    if (retryCondition) return retryCondition(error);
    
    // Retry por padrão em erros de rede
    return error?.message?.includes('network') || 
           error?.message?.includes('fetch') ||
           error?.code === 'NETWORK_ERROR' ||
           error?.status >= 500;
  }, [retryCount, maxRetries, retryCondition]);

  const retry = useCallback(async (variables: TVariables): Promise<TData> => {
    let lastError: TError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 0);
        setRetryCount(attempt);
        
        const result = await mutationFn(variables);
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          setRetryCount(0);
          setIsRetrying(false);
          throw error;
        }
        
        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
    
    throw lastError!;
  }, [mutationFn, maxRetries, retryDelay, shouldRetry]);

  const mutation = useMutation({
    mutationFn: retry,
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (showToast && successMessage) {
        showSuccess(successMessage);
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (showToast && errorMessage) {
        showError(errorMessage);
      }
      onError?.(error, variables, context);
    },
  });

  return {
    ...mutation,
    retryCount,
    isRetrying,
  };
};

// Hook específico para operações CRUD com retry
export const useRetryCrudMutation = <TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    operation: 'create' | 'update' | 'delete';
    entityName: string;
    retryConfig?: RetryOptions;
    onSuccess?: (data: TData, variables: TVariables, context: any) => void;
    onError?: (error: TError, variables: TVariables, context: any) => void;
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
  };

  return useRetryMutation(mutationFn, {
    retryOptions: retryConfig,
    successMessage: messages[operation].success,
    errorMessage: messages[operation].error,
    onSuccess,
    onError,
  });
}; 