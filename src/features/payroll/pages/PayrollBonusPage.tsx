import React from 'react';
import { PayrollBreadcrumb } from '../components/PayrollBreadcrumb';
import { PayrollBonusView } from '../components/PayrollBonusView';
import { useActiveContract } from '../hooks/useActiveContract';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function PayrollBonusPage() {
  const { activeContract, loading } = useActiveContract();
  
  const breadcrumbItems = [
    { label: 'Folha de Pagamento', href: '/personal/payroll' },
    { label: 'Bónus e Prémios', href: '/personal/payroll/bonus' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PayrollBreadcrumb items={breadcrumbItems} />
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeContract) {
    return (
      <div className="space-y-6">
        <PayrollBreadcrumb items={breadcrumbItems} />
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum contrato ativo encontrado. Por favor, selecione um contrato no cabeçalho.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PayrollBreadcrumb items={breadcrumbItems} />
      <PayrollBonusView />
    </div>
  );
}

export default PayrollBonusPage;