import React from 'react';
import { PayrollBreadcrumb } from '../components/PayrollBreadcrumb';
import PayrollBonusConfig from '../components/PayrollBonusConfig';

import { useActiveContract } from '../hooks/useActiveContract';
import { logger } from '@/shared/lib/logger';
import { useToast } from '@/hooks/use-toast';

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
              Configure os bónus de performance e prémios personalizados para os seus funcionários.
            </p>
          </div>
        </div>
        

        
        <div className="grid gap-6">
          <PayrollBonusConfig 
            bonusType="performance" 
            onSave={(data) => {
              logger.debug('Performance bonus saved:', data);
            }} 
          />
          
          <PayrollBonusConfig 
            bonusType="custom" 
            onSave={(data) => {
              logger.debug('Custom bonus saved:', data);
            }} 
          />
        </div>
      </div>
    </div>
  );
}

export default PayrollBonusSettingsPage;