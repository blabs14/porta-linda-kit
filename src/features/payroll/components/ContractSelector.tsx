import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { useActiveContract } from '../hooks/useActiveContract';
import { useToast } from '../../../hooks/use-toast';
import { FileText, AlertCircle } from 'lucide-react';
import { PayrollContract } from '../types';
import { useTranslation } from 'react-i18next';

interface ContractSelectorProps {
  className?: string;
}

export function ContractSelector({ className }: ContractSelectorProps) {
  const { activeContract, contracts, loading, setActiveContract } = useActiveContract();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleContractChange = (contractId: string) => {
    const selectedContract = contracts.find(c => c.id === contractId);
    
    if (selectedContract) {
      if (!selectedContract.is_active) {
        toast({
          title: t('payroll.contract.selector.inactive'),
          description: 'Este contrato não está ativo. Por favor, selecione um contrato ativo.',
          variant: 'destructive',
        });
        return;
      }
      
      setActiveContract(selectedContract);
      
      toast({
        title: 'Contrato alterado',
        description: t('payroll.contract.selector.switchedTo', { name: selectedContract.job_title }),
        variant: 'default',
      });
    }
  };

  const activeContracts = contracts.filter(c => c.is_active);
  const hasActiveContracts = activeContracts.length > 0;

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded"></div>
          <div className="h-4 w-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!hasActiveContracts) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{t('payroll.contract.selector.noContracts')}</span>
      </div>
    );
  }

  if (activeContracts.length === 1) {
    const contract = activeContracts[0];
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{contract.job_title}</span>
        <Badge variant="outline" className="text-xs">
          {contract.company_name}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Label htmlFor="contract-selector" className="sr-only">
        {t('payroll.contract.selector.label')}
      </Label>
      <FileText className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeContract?.id || ''}
        onValueChange={handleContractChange}
      >
        <SelectTrigger 
          id="contract-selector"
          className="w-auto min-w-[200px] h-8 text-sm"
          aria-label={t('payroll.contract.selector.label')}
        >
          <SelectValue 
            placeholder={t('payroll.contract.selector.placeholder')}
            className="text-sm"
          >
            {activeContract && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{activeContract.job_title}</span>
                <Badge variant="outline" className="text-xs">
                  {activeContract.company_name}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeContracts.map((contract) => (
            <SelectItem 
              key={contract.id} 
              value={contract.id}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{contract.job_title}</span>
                  <span className="text-xs text-muted-foreground">
                    {contract.company_name}
                  </span>
                </div>
                {contract.id === activeContract?.id && (
                  <Badge variant="default" className="text-xs ml-2">
                    {t('payroll.contract.selector.active')}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default ContractSelector;