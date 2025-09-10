import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useActiveContract } from '../hooks/useActiveContract';
import { useToast } from '../../../hooks/use-toast';
import { FileText, AlertCircle } from 'lucide-react';
import { PayrollContract } from '../types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import { toast } from '@/hooks/use-toast';
import { QuickContractForm } from './QuickContractForm';

interface SyncedContractSelectorProps {
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showLabel?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Componente de seleção de contrato sincronizado que usa o contexto global
 * para manter todos os seletores em sincronia.
 */
export function SyncedContractSelector({ 
  className,
  variant = 'default',
  showLabel = true,
  placeholder,
  disabled = false
}: SyncedContractSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeContract, contracts, loading, setActiveContract, refreshContracts } = useActiveContract();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleContractChange = (contractId: string) => {
    if (contractId === 'create-new') {
      setShowCreateForm(true);
      return;
    }
    
    const selectedContract = contracts.find(c => c.id === contractId);
    if (selectedContract) {
      setActiveContract(selectedContract);
      toast({
        title: t('payroll.contract.selector.switched'),
        description: t('payroll.contract.selector.switchedTo', { name: selectedContract.name }),
        variant: 'default',
      });
    }
  };

  const handleContractCreated = async (contract: PayrollContract) => {
    setShowCreateForm(false);
    await refreshContracts();
    setActiveContract(contract);
    toast({
      title: "Contrato criado com sucesso",
      description: `O contrato "${contract.name}" foi criado e está agora ativo.`,
      variant: "default",
    });
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  const hasContracts = contracts.length > 0;

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded"></div>
          <div className="h-4 w-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Se não existir nenhum contrato, mostrar apenas "Criar novo contrato"
  if (!hasContracts) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>Criar novo contrato</span>
        </button>
      </div>
    );
  }

  // Variante minimal - apenas o nome do contrato sem seletor
  if (variant === 'minimal' && contracts.length === 1) {
    const contract = contracts[0];
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{contract.name}</span>
        {!contract.is_active && (
          <Badge variant="secondary" className="text-xs">
            Inativo
          </Badge>
        )}
      </div>
    );
  }

  // Variante compact - layout mais compacto
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showLabel && (
          <Label htmlFor="synced-contract-selector" className="text-xs text-muted-foreground">
            Contrato:
          </Label>
        )}
        <Select
          value={activeContract?.id || ''}
          onValueChange={handleContractChange}
          disabled={disabled}
        >
          <SelectTrigger 
            id="synced-contract-selector"
            className="w-auto min-w-[200px] h-8 text-xs"
          >
            <SelectValue 
              placeholder={placeholder || t('payroll.contract.selector.placeholder')}
            >
              {activeContract && (
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{activeContract.name}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{activeContract.job_category || 'Categoria não definida'}</span>
                    <span>•</span>
                    <span>{activeContract.workplace_location || 'Local não definido'}</span>
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
          {/* Opção para criar novo contrato */}
          <SelectItem value="create-new">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Criar novo contrato</span>
            </div>
          </SelectItem>
          
          {/* Separador se existirem contratos */}
          {contracts.length > 0 && (
            <div className="px-2 py-1">
              <div className="h-px bg-border" />
            </div>
          )}
          
          {/* Contratos ativos */}
          {contracts.filter(c => c.is_active).map((contract) => (
            <SelectItem 
              key={contract.id} 
              value={contract.id}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{contract.name}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{contract.job_category || 'Categoria não definida'}</span>
                    <span>•</span>
                    <span>{contract.workplace_location || 'Local não definido'}</span>
                  </div>
                </div>
                {contract.id === activeContract?.id && (
                  <Badge variant="default" className="text-[10px] ml-2">
                    {t('payroll.contract.selector.active')}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
          
          {/* Contratos inativos */}
          {contracts.filter(c => !c.is_active).length > 0 && (
            <>
              <div className="px-2 py-1">
                <div className="text-xs text-muted-foreground font-medium">Contratos Inativos</div>
              </div>
              {contracts.filter(c => !c.is_active).map((contract) => (
                <SelectItem 
                  key={contract.id} 
                  value={contract.id}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-muted-foreground">{contract.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Inativo
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>{contract.job_category || 'Categoria não definida'}</span>
                        <span>•</span>
                        <span>{contract.workplace_location || 'Local não definido'}</span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
        </Select>
        
        {/* Dialog para criação de novo contrato */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Contrato</DialogTitle>
            </DialogHeader>
            <QuickContractForm
              onContractCreated={handleContractCreated}
              onCancel={handleCancelCreate}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Variante default - layout completo
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <Label htmlFor="synced-contract-selector" className="sr-only">
          {t('payroll.contract.selector.label')}
        </Label>
      )}
      <FileText className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeContract?.id || ''}
        onValueChange={handleContractChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id="synced-contract-selector"
          className="w-auto min-w-[200px] h-8 text-sm"
          aria-label={t('payroll.contract.selector.label')}
        >
          <SelectValue 
            placeholder={placeholder || t('payroll.contract.selector.placeholder')}
            className="text-sm"
          >
            {activeContract && (
              <div className="flex flex-col">
                <span className="font-medium">{activeContract.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{activeContract.job_category || 'Categoria não definida'}</span>
                  <span>•</span>
                  <span>{activeContract.workplace_location || 'Local não definido'}</span>
                </div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Opção para criar novo contrato */}
          <SelectItem value="create-new">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Criar novo contrato</span>
            </div>
          </SelectItem>
          
          {/* Separador se existirem contratos */}
          {contracts.length > 0 && (
            <div className="px-2 py-1">
              <div className="h-px bg-border" />
            </div>
          )}
          
          {/* Contratos ativos */}
          {contracts.filter(c => c.is_active).map((contract) => (
            <SelectItem 
              key={contract.id} 
              value={contract.id}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{contract.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{contract.job_category || 'Categoria não definida'}</span>
                    <span>•</span>
                    <span>{contract.workplace_location || 'Local não definido'}</span>
                  </div>
                </div>
                {contract.id === activeContract?.id && (
                  <Badge variant="default" className="text-xs ml-2">
                    {t('payroll.contract.selector.active')}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
          
          {/* Contratos inativos */}
          {contracts.filter(c => !c.is_active).length > 0 && (
            <>
              <div className="px-2 py-1">
                <div className="text-xs text-muted-foreground font-medium">Contratos Inativos</div>
              </div>
              {contracts.filter(c => !c.is_active).map((contract) => (
                <SelectItem 
                  key={contract.id} 
                  value={contract.id}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{contract.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          Inativo
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{contract.job_category || 'Categoria não definida'}</span>
                        <span>•</span>
                        <span>{contract.workplace_location || 'Local não definido'}</span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      
      {/* Dialog para criação de novo contrato */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Contrato</DialogTitle>
          </DialogHeader>
          <QuickContractForm
            onContractCreated={handleContractCreated}
            onCancel={handleCancelCreate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SyncedContractSelector;