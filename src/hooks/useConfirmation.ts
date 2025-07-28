import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    options: {},
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback((
    options: ConfirmationOptions,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setState({
      isOpen: true,
      options: {
        title: 'Confirmar ação',
        message: 'Tem a certeza que deseja continuar?',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        variant: 'default',
        ...options,
      },
      onConfirm: () => {
        setState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setState(prev => ({ ...prev, isOpen: false }));
        onCancel?.();
      },
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...state,
    confirm,
    close,
  };
}; 