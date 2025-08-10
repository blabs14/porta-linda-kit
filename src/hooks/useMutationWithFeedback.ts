import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { showError, showSuccess } from '../lib/utils';

interface MutationWithFeedbackOptions<TData, TError, TVariables, TContext = unknown> extends Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn' | 'onSuccess' | 'onError'
> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: TError, variables: TVariables, context: TContext) => void;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export function useMutationWithFeedback<TData, TError, TVariables, TContext = unknown>(
  options: MutationWithFeedbackOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showToast = true,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: options.mutationFn,
    onSuccess: (data, variables, context) => {
      if (showToast && successMessage) {
        showSuccess(successMessage);
      }
      onSuccess?.(data, variables, context as TContext);
    },
    onError: (error, variables, context) => {
      if (showToast) {
        const message = errorMessage || (error instanceof Error ? error.message : 'Ocorreu um erro inesperado');
        showError(message);
      }
      onError?.(error, variables, context as TContext);
    },
  });
}

// Hook específico para operações CRUD com mensagens padrão
export function useCrudMutation<TData, TError, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    operation: 'create' | 'update' | 'delete';
    entityName: string;
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: TError, variables: TVariables, context: TContext) => void;
    showToast?: boolean;
  }
) {
  const { operation, entityName, onSuccess, onError, showToast = true } = options;

  const getSuccessMessage = () => {
    switch (operation) {
      case 'create':
        return `${entityName} criado com sucesso!`;
      case 'update':
        return `${entityName} atualizado com sucesso!`;
      case 'delete':
        return `${entityName} eliminado com sucesso!`;
      default:
        return 'Operação realizada com sucesso!';
    }
  };

  const getErrorMessage = () => {
    switch (operation) {
      case 'create':
        return `Erro ao criar ${entityName.toLowerCase()}`;
      case 'update':
        return `Erro ao atualizar ${entityName.toLowerCase()}`;
      case 'delete':
        return `Erro ao eliminar ${entityName.toLowerCase()}`;
      default:
        return 'Ocorreu um erro inesperado';
    }
  };

  return useMutationWithFeedback<TData, TError, TVariables, TContext>({
    mutationFn,
    successMessage: getSuccessMessage(),
    errorMessage: getErrorMessage(),
    showToast,
    onSuccess,
    onError,
  });
} 