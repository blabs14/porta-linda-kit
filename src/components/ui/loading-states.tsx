import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-primary',
        sizeClasses[size],
        className
      )} 
    />
  );
};

// Skeleton Loading Component
interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  height = 'h-4', 
  width = 'w-full' 
}) => {
  return (
    <div 
      className={cn(
        'animate-pulse rounded-md bg-muted',
        height,
        width,
        className
      )} 
    />
  );
};

// Card Skeleton Component
export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
};

// Table Row Skeleton Component
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ 
  columns = 4 
}) => {
  return (
    <div className="flex items-center space-x-4 p-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton 
          key={index} 
          className="h-4 flex-1" 
        />
      ))}
    </div>
  );
};

// Button Loading State Component
interface ButtonLoadingProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({ 
  children, 
  loading = false, 
  loadingText = 'Carregando...',
  className 
}) => {
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center gap-2',
        className
      )}
      disabled={loading}
    >
      {loading && <LoadingSpinner size="sm" />}
      {loading ? loadingText : children}
    </button>
  );
};

// Page Loading Component
export const PageLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
};

// Content Loading Component
export const ContentLoading: React.FC<{ 
  children: React.ReactNode;
  loading: boolean;
  skeleton?: React.ReactNode;
}> = ({ children, loading, skeleton }) => {
  if (loading) {
    return skeleton || <PageLoading />;
  }
  
  return <>{children}</>;
};

// List Loading Component
export const ListLoading: React.FC<{ 
  loading: boolean;
  itemCount?: number;
  children: React.ReactNode;
}> = ({ loading, itemCount = 3, children }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }
  
  return <>{children}</>;
}; 