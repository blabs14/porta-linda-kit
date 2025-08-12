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
import { GlobalShortcuts } from './components/GlobalShortcuts';

// Lazy loading de páginas
import {
  Dashboard,
  ProfilePage,
} from './components/lazy/index';

// Página da Área Pessoal
import PersonalPage from './pages/Personal';
import FamilyPage from './pages/Family';

// Páginas de autenticação (não lazy loading para melhor UX)
import Index from './pages/Index';
import Login from './pages/login';
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
          <GlobalShortcuts />
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


              <Route path="profile" element={
                <Suspense fallback={<PageLoading />}>
                  <ProfilePage />
                </Suspense>
              } />
            </Route>
            
            {/* Área Pessoal */}
            <Route path="/personal/*" element={<RequireAuth><PersonalPage /></RequireAuth>} />
            
            {/* Finanças Partilhadas */}
            <Route path="/family/*" element={<RequireAuth><FamilyPage /></RequireAuth>} />
            
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
