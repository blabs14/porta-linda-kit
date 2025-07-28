import React from 'react';
import { Button, ButtonProps } from './button';
import { LoadingSpinner } from './loading-states';
import { cn } from '../../lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}) => {
  const buttonText = loading ? (loadingText || children) : children;
  
  return (
    <Button
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        className
      )}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {buttonText}
    </Button>
  );
};

// Componente específico para formulários
interface FormSubmitButtonProps extends LoadingButtonProps {
  isSubmitting?: boolean;
  submitText?: string;
  submittingText?: string;
  children?: React.ReactNode;
}

export const FormSubmitButton: React.FC<FormSubmitButtonProps> = ({
  isSubmitting = false,
  submitText = 'Guardar',
  submittingText = 'A guardar...',
  children,
  ...props
}) => {
  return (
    <LoadingButton
      type="submit"
      loading={isSubmitting}
      loadingText={submittingText}
      {...props}
    >
      {children || submitText}
    </LoadingButton>
  );
};

// Componente para ações de eliminação
interface DeleteButtonProps extends LoadingButtonProps {
  isDeleting?: boolean;
  deleteText?: string;
  deletingText?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  isDeleting = false,
  deleteText = 'Eliminar',
  deletingText = 'A eliminar...',
  variant = 'destructive',
  children,
  ...props
}) => {
  return (
    <LoadingButton
      variant={variant}
      loading={isDeleting}
      loadingText={deletingText}
      {...props}
    >
      {children || deleteText}
    </LoadingButton>
  );
}; 