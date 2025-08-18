import React, { useEffect } from 'react';
import { CashflowView } from '../components/cashflow/CashflowView';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function CashflowPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const prevTitle = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    document.title = 'Calendário de Fluxos & Previsões - Porta Linda';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Visualize e gerencie suas previsões de fluxo de caixa com calendário interativo e análises detalhadas.');
    }

    return () => {
      document.title = prevTitle;
      if (meta) meta.setAttribute('content', prevDesc);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <CashflowView />
      </div>
    </>
  );
}