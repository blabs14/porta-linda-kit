import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PayrollSummaryPage from '../pages/PayrollSummaryPage';
import PayrollMileagePage from '../pages/PayrollMileagePage';
import PayrollConfigPage from '../pages/PayrollConfigPage';
import { PayrollBonusPage } from '../pages/PayrollBonusPage';
import { PayrollBonusSettingsPage } from '../pages/PayrollBonusSettingsPage';
import PayrollSubsidiesViewPage from '../pages/PayrollSubsidiesViewPage';
import { PerformanceBonusConfig } from './PerformanceBonusConfig';
import { PerformanceBonusResults } from './PerformanceBonusResults';
import PayrollVacationCalendarPage from '../pages/PayrollVacationCalendarPage';
import PayrollContractsPage from '../pages/PayrollContractsPage';

import { PayrollOnboardingWizard } from './PayrollOnboardingWizard';
import { PayrollSetupPage } from './PayrollSetupPage';
import { WeeklyTimesheetForm } from './WeeklyTimesheetForm';
import { PayrollNavigation } from './PayrollNavigation';
import { PayrollPeriodsManager } from './PayrollPeriodsManager';
import { ActiveContractProvider } from '../contexts/ActiveContractContext';
import { PayrollConfigProvider } from '../contexts/PayrollConfigContext';
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
        <Route path="bonus" element={<PayrollBonusPage />} />
        <Route path="performance-bonus" element={<PerformanceBonusConfig />} />
        <Route path="performance-results" element={<PerformanceBonusResults />} />
        <Route path="subsidies" element={<PayrollSubsidiesViewPage />} />
        <Route path="vacations" element={<PayrollVacationCalendarPage />} />
        <Route path="contracts" element={<PayrollContractsPage />} />
        <Route path="settings/bonus" element={<PayrollBonusSettingsPage />} />
        <Route path="config" element={<PayrollConfigPage />} />
        <Route path="periods" element={<PayrollPeriodsManager />} />
        <Route path="onboarding" element={<PayrollOnboardingWizard />} />
      </Routes>
    </>
  );
}

export function PayrollModule() {
  return (
    <ActiveContractProvider>
      <PayrollConfigProvider>
        <PayrollContent />
      </PayrollConfigProvider>
    </ActiveContractProvider>
  );
}

export default PayrollModule;