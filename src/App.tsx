import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Family from "./pages/Family";
import Insights from "./pages/Insights";
import NotFound from "./pages/NotFound";
import RequireAuth from './components/RequireAuth';
import Login from './pages/login';
import Register from './pages/register';
import AccountsPage from './pages/accounts';
import TransactionsPage from './pages/transactions';
import BudgetsPage from './pages/budgets';
import ReportsPage from './pages/reports';
import AuthTest from './pages/AuthTest';
import ForgotPassword from './pages/forgot-password';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="objetivos" element={<Goals />} />
              <Route path="familia" element={<Family />} />
              <Route path="insights" element={<Insights />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/auth-test" element={<AuthTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
