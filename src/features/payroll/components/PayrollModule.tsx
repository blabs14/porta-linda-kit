import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PayrollSummaryPage from '../pages/PayrollSummaryPage';
import PayrollHoursPage from '../pages/PayrollHoursPage';
import PayrollMileagePage from '../pages/PayrollMileagePage';
import PayrollConfigPage from '../pages/PayrollConfigPage';
import { PayrollOnboardingWizard, PayrollSetupPage } from './index';
import { PayrollNavigation } from './PayrollNavigation';
import { usePayrollOnboarding } from '../hooks/usePayrollOnboarding';
import { LoadingSpinner } from '../../../components/ui/loading-states';

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
        <Route path="horas" element={<PayrollHoursPage />} />
        <Route path="km" element={<PayrollMileagePage />} />
        <Route path="config" element={<PayrollConfigPage />} />
        <Route path="contratos" element={<PayrollSetupPage />} />
        <Route path="onboarding" element={<PayrollOnboardingWizard />} />
      </Routes>
    </>
  );
}

export function PayrollModule() {
  return <PayrollContent />;
}

export default PayrollModule;