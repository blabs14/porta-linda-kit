import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { payrollService } from '../services/payrollService';
import { PayrollContract } from '../types';
import { useToast } from '../../../hooks/use-toast';

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

  // Função para carregar contratos
  const loadContracts = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const contractsData = await payrollService.getContracts(user.id);
      setContracts(contractsData);
      return contractsData;
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
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
    if (contractsData.length === 0) {
      setActiveContractState(null);
      return;
    }

    // 1. Verificar query param
    const urlParams = new URLSearchParams(window.location.search);
    const contractIdFromUrl = urlParams.get('contract');
    if (contractIdFromUrl) {
      const contractFromUrl = contractsData.find(c => c.id === contractIdFromUrl);
      if (contractFromUrl && contractFromUrl.is_active) {
        setActiveContractState(contractFromUrl);
        // Salvar no localStorage
        localStorage.setItem('payroll_active_contract_id', contractFromUrl.id);
        return;
      }
    }

    // 2. Verificar localStorage
    const contractIdFromStorage = localStorage.getItem('payroll_active_contract_id');
    if (contractIdFromStorage) {
      const contractFromStorage = contractsData.find(c => c.id === contractIdFromStorage);
      if (contractFromStorage && contractFromStorage.is_active) {
        setActiveContractState(contractFromStorage);
        return;
      }
    }

    // 3. Usar primeiro contrato ativo
    const firstActiveContract = contractsData.find(c => c.is_active);
    if (firstActiveContract) {
      setActiveContractState(firstActiveContract);
      localStorage.setItem('payroll_active_contract_id', firstActiveContract.id);
    } else {
      setActiveContractState(null);
      localStorage.removeItem('payroll_active_contract_id');
    }
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
    const contractsData = await loadContracts();
    if (contractsData) {
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