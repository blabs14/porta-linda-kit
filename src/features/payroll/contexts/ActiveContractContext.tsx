import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { payrollService } from '../services/payrollService';
import { PayrollContract } from '../types';
import { useToast } from '../../../hooks/use-toast';
import { logger } from '../../../shared/lib/logger';

export interface ActiveContractContextType {
  activeContract: PayrollContract | null;
  contracts: PayrollContract[];
  loading: boolean;
  setActiveContract: (contract: PayrollContract | null) => void;
  refreshContracts: () => Promise<void>;
}

export const ActiveContractContext = createContext<ActiveContractContextType | undefined>(undefined);

interface ActiveContractProviderProps {
  children: ReactNode;
}

export function ActiveContractProvider({ children }: ActiveContractProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeContract, setActiveContractState] = useState<PayrollContract | null>(null);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [loading, setLoading] = useState(true);

  // Debug: log do estado do provider (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 ActiveContractProvider - Estado:', {
      userId: user?.id,
      loading,
      contractsCount: contracts.length,
      activeContract: activeContract ? { id: activeContract.id, name: activeContract.name } : null
    });
  }

  // Função para carregar contratos
  const loadContracts = async () => {
    console.log('🔧 loadContracts - Iniciando carregamento para userId:', user?.id);
    if (!user?.id) {
      console.log('🔧 loadContracts - Sem userId, retornando');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔧 loadContracts - Chamando payrollService.getContracts com userId:', user.id);
      console.log('🔧 loadContracts - Tipo do userId:', typeof user.id);
      const contractsData = await payrollService.getContracts(user.id);
      console.log('🔧 loadContracts - Contratos carregados:', contractsData);
      console.log('🔧 loadContracts - Número de contratos:', contractsData?.length || 0);
      setContracts(contractsData);
      return contractsData;
    } catch (error) {
      logger.error('Erro ao carregar contratos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os contratos.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Função para resolver o contrato ativo inicial
  const resolveActiveContract = (contractsData: PayrollContract[]) => {
    console.log('🔧 resolveActiveContract - Iniciando com contratos:', contractsData);
    console.log('🔧 resolveActiveContract - Número de contratos:', contractsData.length);
    
    if (contractsData.length === 0) {
      console.log('🔧 resolveActiveContract - Nenhum contrato encontrado, definindo activeContract como null');
      setActiveContractState(null);
      return;
    }

    // 1. Verificar query param
    const urlParams = new URLSearchParams(window.location.search);
    const contractIdFromUrl = urlParams.get('contract');
    console.log('🔧 resolveActiveContract - Contract ID da URL:', contractIdFromUrl);
    
    if (contractIdFromUrl) {
      const contractFromUrl = contractsData.find(c => c.id === contractIdFromUrl);
      console.log('🔧 resolveActiveContract - Contrato encontrado na URL:', contractFromUrl);
      if (contractFromUrl && contractFromUrl.is_active) {
        console.log('🔧 resolveActiveContract - Usando contrato da URL:', contractFromUrl.name);
        setActiveContractState(contractFromUrl);
        // Salvar no localStorage
        localStorage.setItem('payroll_active_contract_id', contractFromUrl.id);
        return;
      }
    }

    // 2. Verificar localStorage
    const contractIdFromStorage = localStorage.getItem('payroll_active_contract_id');
    console.log('🔧 resolveActiveContract - Contract ID do localStorage:', contractIdFromStorage);
    
    if (contractIdFromStorage) {
      const contractFromStorage = contractsData.find(c => c.id === contractIdFromStorage);
      console.log('🔧 resolveActiveContract - Contrato encontrado no localStorage:', contractFromStorage);
      if (contractFromStorage && contractFromStorage.is_active) {
        console.log('🔧 resolveActiveContract - Usando contrato do localStorage:', contractFromStorage.name);
        setActiveContractState(contractFromStorage);
        return;
      }
    }

    // 3. Usar primeiro contrato ativo com múltiplas abordagens
    // Tentar múltiplas abordagens para encontrar o contrato ativo
    let firstActiveContract = contractsData.find(c => c.is_active === true);
    
    // Se não encontrou, tentar com conversão booleana
    if (!firstActiveContract) {
      firstActiveContract = contractsData.find(c => Boolean(c.is_active) === true);
    }
    
    // Se ainda não encontrou, tentar com string 'true'
    if (!firstActiveContract) {
      firstActiveContract = contractsData.find(c => String(c.is_active) === 'true');
    }
    
    // Se ainda não encontrou, pegar o primeiro contrato como fallback
    if (!firstActiveContract && contractsData.length > 0) {
      logger.warn('resolveActiveContract', 'Nenhum contrato ativo encontrado, usando fallback', { contractsCount: contractsData.length });
      firstActiveContract = contractsData[0];
    }
    
    logger.debug('resolveActiveContract', 'Contrato ativo resolvido', { 
      contractId: firstActiveContract?.id, 
      contractName: firstActiveContract?.name,
      isActive: firstActiveContract?.is_active 
    });
    
    if (firstActiveContract) {
      console.log('🔧 resolveActiveContract - Usando primeiro contrato ativo:', firstActiveContract.name);
      setActiveContractState(firstActiveContract);
      localStorage.setItem('payroll_active_contract_id', firstActiveContract.id);
    } else {
      console.log('🔧 resolveActiveContract - Nenhum contrato ativo encontrado, definindo activeContract como null');
      setActiveContractState(null);
      localStorage.removeItem('payroll_active_contract_id');
    }
    console.log('🔧 resolveActiveContract - Finalizado');
  };

  // Função para definir contrato ativo
  const setActiveContract = (contract: PayrollContract | null) => {
    setActiveContractState(contract);
    
    if (contract) {
      localStorage.setItem('payroll_active_contract_id', contract.id);
      
      // Atualizar URL sem recarregar a página
      const url = new URL(window.location.href);
      url.searchParams.set('contract', contract.id);
      window.history.replaceState({}, '', url.toString());
    } else {
      localStorage.removeItem('payroll_active_contract_id');
      
      // Remover parâmetro da URL
      const url = new URL(window.location.href);
      url.searchParams.delete('contract');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Função para atualizar contratos
  const refreshContracts = async () => {
    try {
      logger.debug('refreshContracts', 'Iniciando refresh', { userId: user?.id, currentContractsCount: contracts.length });
      const contractsData = await loadContracts();
      
      if (contractsData) {
        logger.debug('refreshContracts', 'Contratos obtidos', { count: contractsData.length, contracts: contractsData.map(c => ({ id: c.id, name: c.name, is_active: c.is_active })) });
        
        // Verificar se o contrato ativo ainda é válido
        if (activeContract) {
          const updatedActiveContract = contractsData.find(c => c.id === activeContract.id);
          if (updatedActiveContract && updatedActiveContract.is_active) {
            setActiveContractState(updatedActiveContract);
          } else {
            // Contrato ativo não é mais válido, resolver novamente
            resolveActiveContract(contractsData);
          }
        } else {
          // Não há contrato ativo, resolver
          resolveActiveContract(contractsData);
        }
        
        // Encontrar primeiro contrato ativo para log
        const firstActiveContract = contractsData.find(c => c.is_active);
        if (firstActiveContract) {
          logger.debug('refreshContracts', 'Contrato ativo definido', {
            id: firstActiveContract.id,
            name: firstActiveContract.name,
            is_active: firstActiveContract.is_active
          });
        } else {
          logger.warn('refreshContracts', 'Nenhum contrato ativo encontrado');
        }
      }
    } catch (error) {
      logger.error('refreshContracts', 'Erro ao carregar contratos', { error });
    }
  };

  // Carregar contratos quando o usuário muda
  useEffect(() => {
    if (user?.id) {
      loadContracts().then((contractsData) => {
        if (contractsData) {
          resolveActiveContract(contractsData);
        }
      });
    } else {
      setContracts([]);
      setActiveContractState(null);
      setLoading(false);
    }
  }, [user?.id]);

  const value: ActiveContractContextType = {
    activeContract,
    contracts,
    loading,
    setActiveContract,
    refreshContracts,
  };

  return (
    <ActiveContractContext.Provider value={value}>
      {children}
    </ActiveContractContext.Provider>
  );
}