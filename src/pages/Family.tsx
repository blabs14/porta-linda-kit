import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FamilyProvider } from '../features/family/FamilyProvider';
import FamilyHeader from '../features/family/FamilyHeader';
import FamilySidebar from '../features/family/FamilySidebar';
import FamilyTabBar from '../features/family/FamilyTabBar';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { useRouteChange } from '../hooks/useRouteChange';

// Lazy load das páginas
const FamilyDashboard = React.lazy(() => import('../features/family/FamilyDashboard'));
const FamilyGoals = React.lazy(() => import('../features/family/FamilyGoals'));
const FamilyBudgets = React.lazy(() => import('../features/family/FamilyBudgets'));
const FamilyAccounts = React.lazy(() => import('../features/family/FamilyAccounts'));
const FamilyTransactions = React.lazy(() => import('../features/family/FamilyTransactions'));
const FamilyMembers = React.lazy(() => import('../features/family/FamilyMembers'));
const FamilySettings = React.lazy(() => import('../features/family/FamilySettings'));

const FamilyPage: React.FC = () => {
  // Hook para atualizar dados automaticamente quando a rota muda
  useRouteChange();

  return (
    <FamilyProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar para Desktop */}
        <FamilySidebar />
        
        {/* Conteúdo Principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <FamilyHeader />
          
          {/* Conteúdo das Páginas */}
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/family/dashboard" replace />} />
                <Route path="/dashboard" element={<FamilyDashboard />} />
                <Route path="/goals" element={<FamilyGoals />} />
                <Route path="/budgets" element={<FamilyBudgets />} />
                <Route path="/accounts" element={<FamilyAccounts />} />
                <Route path="/transactions" element={<FamilyTransactions />} />
                <Route path="/members" element={<FamilyMembers />} />
                <Route path="/settings" element={<FamilySettings />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        
        {/* TabBar para Mobile */}
        <FamilyTabBar />
      </div>
    </FamilyProvider>
  );
};

export default FamilyPage;