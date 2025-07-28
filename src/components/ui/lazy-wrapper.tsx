import { Suspense, ReactNode } from 'react';
import { LoadingSpinner } from './loading-states';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export const LazyWrapper = ({ 
  children, 
  fallback, 
  className = '' 
}: LazyWrapperProps) => {
  const defaultFallback = (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <LoadingSpinner size="lg" />
      <span className="ml-2">A carregar...</span>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}; 