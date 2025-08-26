import React from 'react';
import { PayrollBreadcrumb } from '../components/PayrollBreadcrumb';
import PayrollBonusConfig from '../components/PayrollBonusConfig';
import { useActiveContract } from '../contexts/ActiveContractContext';

export function PayrollBonusSettingsPage() {
  const { activeContract } = useActiveContract();

  const breadcrumbItems = [
    { label: 'Folha de Pagamento', href: '/personal/payroll' },
    { label: 'Bónus e Prémios', href: '/personal/payroll/bonus' },
    { label: 'Configurações', href: '/personal/payroll/settings/bonus' }
  ];

  return (
    <div className="space-y-6">
      <PayrollBreadcrumb items={breadcrumbItems} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configurações de Bónus</h1>
            <p className="text-muted-foreground">
              Configure os diferentes tipos de bónus e prémios para os seus funcionários.
            </p>
          </div>
        </div>
        
        <div className="grid gap-6">
          <PayrollBonusConfig 
            bonusType="mandatory" 
            contractId={activeContract?.id || ''} 
            onSave={(data) => {
              console.log('Mandatory bonus saved:', data);
            }} 
          />
          
          <PayrollBonusConfig 
            bonusType="performance" 
            contractId={activeContract?.id || ''} 
            onSave={(data) => {
              console.log('Performance bonus saved:', data);
            }} 
          />
          
          <PayrollBonusConfig 
            bonusType="custom" 
            contractId={activeContract?.id || ''} 
            onSave={(data) => {
              console.log('Custom bonus saved:', data);
            }} 
          />
        </div>
      </div>
    </div>
  );
}

export default PayrollBonusSettingsPage;