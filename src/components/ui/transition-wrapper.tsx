import React from 'react';

interface TransitionWrapperProps {
  children: React.ReactNode;
  isVisible?: boolean;
  animation?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown';
  duration?: number;
  delay?: number;
  className?: string;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  children,
  isVisible = true,
  animation = 'fade',
  duration = 0.2,
  delay = 0,
  className = '',
}) => {
  if (!isVisible) return null;

  const baseClasses = 'transition-all ease-in-out';
  const animationClasses = {
    fade: 'opacity-0 animate-in fade-in',
    slide: 'translate-x-[-20px] opacity-0 animate-in slide-in-from-left',
    scale: 'scale-95 opacity-0 animate-in zoom-in',
    slideUp: 'translate-y-[20px] opacity-0 animate-in slide-in-from-bottom',
    slideDown: 'translate-y-[-20px] opacity-0 animate-in slide-in-from-top',
  };

  const style = {
    transitionDuration: `${duration}s`,
    transitionDelay: `${delay}s`,
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

// Componente específico para formulários
export const FormTransition: React.FC<{
  children: React.ReactNode;
  isVisible?: boolean;
  className?: string;
}> = ({ children, isVisible = true, className = '' }) => {
  return (
    <TransitionWrapper
      isVisible={isVisible}
      animation="slideUp"
      duration={0.3}
      className={className}
    >
      {children}
    </TransitionWrapper>
  );
};

// Componente específico para modais
export const ModalTransition: React.FC<{
  children: React.ReactNode;
  isVisible?: boolean;
  className?: string;
}> = ({ children, isVisible = true, className = '' }) => {
  return (
    <TransitionWrapper
      isVisible={isVisible}
      animation="scale"
      duration={0.2}
      className={className}
    >
      {children}
    </TransitionWrapper>
  );
};

// Componente específico para listas
export const ListTransition: React.FC<{
  children: React.ReactNode;
  isVisible?: boolean;
  className?: string;
  staggerDelay?: number;
}> = ({ children, isVisible = true, className = '', staggerDelay = 0.1 }) => {
  return (
    <TransitionWrapper
      isVisible={isVisible}
      animation="fade"
      duration={0.2}
      className={className}
    >
      {children}
    </TransitionWrapper>
  );
};

// Componente para itens de lista com animação individual
export const ListItemTransition: React.FC<{
  children: React.ReactNode;
  index?: number;
  className?: string;
}> = ({ children, index = 0, className = '' }) => {
  const style = {
    transitionDelay: `${index * 0.05}s`,
  };

  return (
    <div
      className={`transition-all duration-200 ease-in-out opacity-0 animate-in fade-in ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}; 