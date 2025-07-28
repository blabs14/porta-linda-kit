import { ReactNode } from 'react';
import { ListTransition } from './transition-wrapper';

interface AnimatedListProps {
  children: ReactNode;
  isVisible?: boolean;
  className?: string;
}

export const AnimatedList = ({ children, isVisible = true, className = '' }: AnimatedListProps) => {
  return (
    <ListTransition isVisible={isVisible} className={className}>
      {children}
    </ListTransition>
  );
}; 