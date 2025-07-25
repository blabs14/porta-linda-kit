import React from 'react';
import { showError } from '../lib/utils';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    showError('Ocorreu um erro inesperado. Por favor, tente novamente.');
    // Aqui podes enviar logs para um serviço externo se quiseres
    // ex: logErrorToService(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Ocorreu um erro inesperado</h2>
          <p className="mb-4 text-muted-foreground">Por favor, tente recarregar a página ou contacte o suporte se o problema persistir.</p>
          <button className="bg-primary text-white rounded px-4 py-2" onClick={() => window.location.reload()}>Recarregar página</button>
        </div>
      );
    }
    return this.props.children;
  }
} 