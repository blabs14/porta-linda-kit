import React from 'react';

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className = "h-6 w-6" }) => {
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${className}`} />
  );
}; 