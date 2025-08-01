import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import RequireAuth from './components/RequireAuth';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/loading-states';
import { Toaster } from './components/ui/toaster';

// Lazy loading de páginas
import {
  Dashboard,
  Transactions,
  Reports,
  Goals,
  Family,
  Insights,
  AccountsPage,
  BudgetsPage,
  ProfilePage,
} from './components/lazy/index';

// Página da Área Pessoal
import PersonalPage from './pages/Personal';

// Páginas de autenticação (não lazy loading para melhor UX)
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/register';
import ForgotPassword from './pages/forgot-password';
import NotFound from './pages/NotFound';
import TestPage from './pages/TestPage';

// Componente de loading para Suspense
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Páginas públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Páginas protegidas com lazy loading */}
            <Route path="/app" element={<RequireAuth><MainLayout /></RequireAuth>}>
              <Route index element={
                <Suspense fallback={<PageLoading />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="transactions" element={
                <Suspense fallback={<PageLoading />}>
                  <Transactions />
                </Suspense>
              } />
              <Route path="accounts" element={
                <Suspense fallback={<PageLoading />}>
                  <AccountsPage />
                </Suspense>
              } />
              <Route path="budgets" element={
                <Suspense fallback={<PageLoading />}>
                  <BudgetsPage />
                </Suspense>
              } />
              <Route path="reports" element={
                <Suspense fallback={<PageLoading />}>
                  <Reports />
                </Suspense>
              } />
              <Route path="goals" element={
                <Suspense fallback={<PageLoading />}>
                  <Goals />
                </Suspense>
              } />
              <Route path="family" element={
                <Suspense fallback={<PageLoading />}>
                  <Family />
                </Suspense>
              } />
              <Route path="insights" element={
                <Suspense fallback={<PageLoading />}>
                  <Insights />
                </Suspense>
              } />
              <Route path="profile" element={
                <Suspense fallback={<PageLoading />}>
                  <ProfilePage />
                </Suspense>
              } />
            </Route>
            
            {/* Área Pessoal */}
            <Route path="/personal/*" element={<RequireAuth><PersonalPage /></RequireAuth>} />
            
            {/* Página 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
      <Toaster />
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

export default App;
