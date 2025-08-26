import React from 'react';
import { PayrollBreadcrumb } from '../components/PayrollBreadcrumb';
import { PayrollBonusView } from '../components/PayrollBonusView';

export function PayrollBonusPage() {
  const breadcrumbItems = [
    { label: 'Folha de Pagamento', href: '/personal/payroll' },
    { label: 'Bónus e Prémios', href: '/personal/payroll/bonus' }
  ];

  return (
    <div className="space-y-6">
      <PayrollBreadcrumb items={breadcrumbItems} />
      <PayrollBonusView />
    </div>
  );
}

export default PayrollBonusPage;