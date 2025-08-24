import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PayrollSummaryPage from '../pages/PayrollSummaryPage';

import PayrollMileagePage from '../pages/PayrollMileagePage';
import PayrollConfigPage from '../pages/PayrollConfigPage';
import { PayrollOnboardingWizard, PayrollSetupPage, WeeklyTimesheetForm } from './index';
import { PayrollNavigation } from './PayrollNavigation';
import { ActiveContractProvider } from '../contexts/ActiveContractContext';
import { usePayrollOnboarding } from '../hooks/usePayrollOnboarding';
import { LoadingSpinner } from '../../../components/ui/loading-states';

// Função para obter a segunda-feira da semana atual
function getMondayOfCurrentWeek(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Se for domingo, subtrair 6 dias
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0); // Definir para início do dia
  return monday;
}

function PayrollContent() {
  const { needsOnboarding, isLoading } = usePayrollOnboarding();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PayrollNavigation />
      <Routes>
        <Route index element={<PayrollSummaryPage />} />

        <Route path="timesheet" element={<WeeklyTimesheetForm initialWeekStart={getMondayOfCurrentWeek()} />} />
        <Route path="km" element={<PayrollMileagePage />} />
        <Route path="config" element={<PayrollConfigPage />} />
        <Route path="contratos" element={<PayrollSetupPage />} />
        <Route path="onboarding" element={<PayrollOnboardingWizard />} />
      </Routes>
    </>
  );
}

export function PayrollModule() {
  return (
    <ActiveContractProvider>
      <PayrollContent />
    </ActiveContractProvider>
  );
}

export default PayrollModule;