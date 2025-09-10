import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { payrollService } from '../services/payrollService';
import { deductionInferenceService } from '../services/deductionInferenceService';
import { holidayAutoService } from '../services/holidayAutoService';
import { toast } from '@/hooks/use-toast';
import { useActiveContract } from '../hooks/useActiveContract';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface PayrollContract {
  id: string;
  employee_id: string;
  salary: number;
  currency: string;
  start_date: string;
  end_date?: string;
  workplace_location?: string;
  contract_type: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface PayrollDeduction {
  id: string;
  contract_id: string;
  type: string;
  amount: number;
  percentage?: number;
  is_automatic: boolean;
  conditions?: any;
}

export interface PayrollOTPolicy {
  id: string;
  contract_id: string;
  type: string;
  rate_multiplier: number;
  max_hours_per_day?: number;
  max_hours_per_week?: number;
}

export interface PayrollMealAllowance {
  id: string;
  contract_id: string;
  daily_amount: number;
  payment_method: string;
  excluded_months: string[];
  tax_exempt_limit: number;
}

export interface PayrollBonus {
  id: string;
  contract_id: string;
  type: 'mandatory' | 'performance' | 'custom';
  amount: number;
  calculation_method: string;
  payment_month?: number;
}

export interface ConfigurationStatus {
  contract: boolean;
  deductions: boolean;
  overtime: boolean;
  meal_allowance: boolean;
  bonuses: boolean;
  holidays: boolean;
}

interface PayrollConfigState {
  // Data (contracts and activeContract now managed by ActiveContractContext)
  deductions: PayrollDeduction[];
  otPolicies: PayrollOTPolicy[];
  mealAllowances: PayrollMealAllowance[];
  bonuses: PayrollBonus[];
  
  // Status
  configurationStatus: ConfigurationStatus;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  
  // Errors
  errors: Record<string, string>;
  validationErrors: Record<string, string[]>;
}

type PayrollConfigAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_DEDUCTIONS'; payload: PayrollDeduction[] }
  | { type: 'SET_OT_POLICIES'; payload: PayrollOTPolicy[] }
  | { type: 'SET_MEAL_ALLOWANCES'; payload: PayrollMealAllowance[] }
  | { type: 'SET_BONUSES'; payload: PayrollBonus[] }
  | { type: 'SET_CONFIGURATION_STATUS'; payload: ConfigurationStatus }
  | { type: 'SET_ERROR'; payload: { key: string; message: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'SET_VALIDATION_ERRORS'; payload: { key: string; errors: string[] } }
  | { type: 'CLEAR_VALIDATION_ERRORS'; payload: string }
  | { type: 'UPDATE_LAST_SYNC'; payload: Date };

const initialState: PayrollConfigState = {
  deductions: [],
  otPolicies: [],
  mealAllowances: [],
  bonuses: [],
  configurationStatus: {
    contract: false,
    deductions: false,
    overtime: false,
    meal_allowance: false,
    bonuses: false,
    holidays: false,
  },
  isLoading: false,
  isSyncing: false,
  lastSyncTime: null,
  errors: {},
  validationErrors: {},
};

function payrollConfigReducer(state: PayrollConfigState, action: PayrollConfigAction): PayrollConfigState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'SET_DEDUCTIONS':
      return { ...state, deductions: action.payload };
    case 'SET_OT_POLICIES':
      return { ...state, otPolicies: action.payload };
    case 'SET_MEAL_ALLOWANCES':
      return { ...state, mealAllowances: action.payload };
    case 'SET_BONUSES':
      return { ...state, bonuses: action.payload };
    case 'SET_CONFIGURATION_STATUS':
      return { ...state, configurationStatus: action.payload };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.message },
      };
    case 'CLEAR_ERROR':
      const { [action.payload]: _, ...restErrors } = state.errors;
      return { ...state, errors: restErrors };
    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: { ...state.validationErrors, [action.payload.key]: action.payload.errors },
      };
    case 'CLEAR_VALIDATION_ERRORS':
      const { [action.payload]: __, ...restValidationErrors } = state.validationErrors;
      return { ...state, validationErrors: restValidationErrors };
    case 'UPDATE_LAST_SYNC':
      return { ...state, lastSyncTime: action.payload };
    default:
      return state;
  }
}

interface PayrollConfigContextType extends PayrollConfigState {
  // Contract data from ActiveContractContext
  contracts: PayrollContract[];
  activeContract: PayrollContract | null;
  
  // Actions
  loadAllConfigurations: () => Promise<void>;
  loadContractConfigurations: (contractId: string) => Promise<void>;
  setActiveContract: (contract: PayrollContract | null) => void;
  
  // Contract operations
  saveContract: (contractData: Partial<PayrollContract>) => Promise<PayrollContract>;
  
  // Deduction operations
  saveDeductions: (contractId: string, deductions: Partial<PayrollDeduction>[]) => Promise<void>;
  toggleAutoDeductions: (contractId: string, enabled: boolean) => Promise<void>;
  
  // OT Policy operations
  saveOTPolicy: (contractId: string, policy: Partial<PayrollOTPolicy>) => Promise<void>;
  
  // Meal Allowance operations
  saveMealAllowance: (contractId: string, allowance: Partial<PayrollMealAllowance>) => Promise<void>;
  
  // Bonus operations
  saveBonuses: (contractId: string, bonuses: Partial<PayrollBonus>[]) => Promise<void>;
  
  // Sync operations
  syncHolidays: (contractId: string) => Promise<void>;
  syncDeductions: (contractId: string) => Promise<void>;
  syncAllConfigurations: (contractId: string) => Promise<void>;
  
  // Validation
  validateConfiguration: (contractId: string) => Promise<boolean>;
  
  // Error handling
  clearError: (key: string) => void;
  clearValidationErrors: (key: string) => void;
}

const PayrollConfigContext = createContext<PayrollConfigContextType | undefined>(undefined);

export function PayrollConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(payrollConfigReducer, initialState);
  const { activeContract, contracts, setActiveContract } = useActiveContract();
  const { user } = useAuth();

  // Load all configurations (now just loads contract configurations for active contract)
  const loadAllConfigurations = useCallback(async () => {
    if (!activeContract) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR', payload: 'general' });

    try {
      if (!activeContract?.id) {
        throw new Error('Nenhum contrato ativo selecionado');
      }
      await loadContractConfigurations(activeContract.id);
    } catch (error) {
      console.error('Error loading configurations:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'general', message: 'Erro ao carregar configurações' } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [activeContract]);

  // Load configurations for specific contract
  const loadContractConfigurations = useCallback(async (contractId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR', payload: 'contract' });

    if (!contractId || typeof contractId !== 'string') {
      throw new Error('ID do contrato inválido');
    }

    try {
      if (!user?.id) {
        throw new Error('Utilizador não autenticado');
      }

      const [deductions, otPolicies, mealAllowances, bonuses] = await Promise.all([
        payrollService.getDeductionConfigs(user.id),
        payrollService.getOTPoliciesByContract(contractId),
        payrollService.getMealAllowancesByContract(contractId),
        payrollService.getBonusesByContract(contractId),
      ]);

      dispatch({ type: 'SET_DEDUCTIONS', payload: deductions });
      dispatch({ type: 'SET_OT_POLICIES', payload: otPolicies });
      dispatch({ type: 'SET_MEAL_ALLOWANCES', payload: mealAllowances });
      dispatch({ type: 'SET_BONUSES', payload: bonuses });

      // Update configuration status
      const status: ConfigurationStatus = {
        contract: true,
        deductions: deductions.length > 0,
        overtime: otPolicies.length > 0,
        meal_allowance: mealAllowances.length > 0,
        bonuses: bonuses.length > 0,
        holidays: false, // Will be updated by holiday sync
      };
      dispatch({ type: 'SET_CONFIGURATION_STATUS', payload: status });
    } catch (error) {
      console.error('Error loading contract configurations:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'contract', message: 'Erro ao carregar configurações do contrato' } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // When active contract changes, load its configurations
  useEffect(() => {
    if (activeContract?.id) {
      loadContractConfigurations(activeContract.id);
    }
  }, [activeContract, loadContractConfigurations]);

  // Save contract
  const saveContract = useCallback(async (contractData: Partial<PayrollContract>): Promise<PayrollContract> => {
    dispatch({ type: 'CLEAR_ERROR', payload: 'contract' });
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS', payload: 'contract' });

    try {
      const savedContract = await payrollService.saveContract(contractData);
      
      // Set as active contract (this will trigger contracts refresh in ActiveContractContext)
      setActiveContract(savedContract);
      
      toast({
        title: 'Sucesso',
        description: 'Contrato guardado com sucesso',
      });
      
      return savedContract;
    } catch (error: any) {
      console.error('Error saving contract:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'contract', message: error.message || 'Erro ao guardar contrato' } });
      throw error;
    }
  }, [setActiveContract]);

  // Save deductions
  const saveDeductions = useCallback(async (contractId: string, deductions: Partial<PayrollDeduction>[]) => {
    dispatch({ type: 'CLEAR_ERROR', payload: 'deductions' });
    
    if (!contractId || typeof contractId !== 'string') {
      throw new Error('ID do contrato inválido');
    }
    
    try {
      const savedDeductions = await payrollService.saveDeductions(contractId, deductions);
      dispatch({ type: 'SET_DEDUCTIONS', payload: savedDeductions });
      
      // Update configuration status
      const newStatus = { ...state.configurationStatus, deductions: savedDeductions.length > 0 };
      dispatch({ type: 'SET_CONFIGURATION_STATUS', payload: newStatus });
      
      toast({
        title: 'Sucesso',
        description: 'Deduções guardadas com sucesso',
      });
    } catch (error: any) {
      console.error('Error saving deductions:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'deductions', message: error.message || 'Erro ao guardar deduções' } });
      throw error;
    }
  }, [state.configurationStatus]);

  // Toggle auto deductions
  const toggleAutoDeductions = useCallback(async (contractId: string, enabled: boolean) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    
    try {
      if (enabled) {
        await syncDeductions(contractId);
      }
      
      toast({
        title: enabled ? 'Deduções automáticas ativadas' : 'Deduções automáticas desativadas',
        description: enabled ? 'As deduções serão calculadas automaticamente' : 'As deduções devem ser configuradas manualmente',
      });
    } catch (error: any) {
      console.error('Error toggling auto deductions:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'deductions', message: error.message || 'Erro ao alterar deduções automáticas' } });
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, []);

  // Save OT policy
  const saveOTPolicy = useCallback(async (contractId: string, policy: Partial<PayrollOTPolicy>) => {
    dispatch({ type: 'CLEAR_ERROR', payload: 'overtime' });
    
    try {
      const savedPolicy = await payrollService.saveOTPolicy(contractId, policy);
      const updatedPolicies = policy.id
        ? state.otPolicies.map(p => p.id === policy.id ? savedPolicy : p)
        : [...state.otPolicies, savedPolicy];
      
      dispatch({ type: 'SET_OT_POLICIES', payload: updatedPolicies });
      
      // Update configuration status
      const newStatus = { ...state.configurationStatus, overtime: updatedPolicies.length > 0 };
      dispatch({ type: 'SET_CONFIGURATION_STATUS', payload: newStatus });
      
      toast({
        title: 'Sucesso',
        description: 'Política de horas extras guardada com sucesso',
      });
    } catch (error: any) {
      console.error('Error saving OT policy:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'overtime', message: error.message || 'Erro ao guardar política de horas extras' } });
      throw error;
    }
  }, [state.otPolicies, state.configurationStatus]);

  // Save meal allowance
  const saveMealAllowance = useCallback(async (contractId: string, allowance: Partial<PayrollMealAllowance>) => {
    dispatch({ type: 'CLEAR_ERROR', payload: 'meal_allowance' });
    
    try {
      const savedAllowance = await payrollService.saveMealAllowance(contractId, allowance);
      const updatedAllowances = allowance.id
        ? state.mealAllowances.map(a => a.id === allowance.id ? savedAllowance : a)
        : [...state.mealAllowances, savedAllowance];
      
      dispatch({ type: 'SET_MEAL_ALLOWANCES', payload: updatedAllowances });
      
      // Update configuration status
      const newStatus = { ...state.configurationStatus, meal_allowance: updatedAllowances.length > 0 };
      dispatch({ type: 'SET_CONFIGURATION_STATUS', payload: newStatus });
      
      toast({
        title: 'Sucesso',
        description: 'Subsídio de alimentação guardado com sucesso',
      });
    } catch (error: any) {
      console.error('Error saving meal allowance:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'meal_allowance', message: error.message || 'Erro ao guardar subsídio de alimentação' } });
      throw error;
    }
  }, [state.mealAllowances, state.configurationStatus]);

  // Save bonuses
  const saveBonuses = useCallback(async (contractId: string, bonuses: Partial<PayrollBonus>[]) => {
    dispatch({ type: 'CLEAR_ERROR', payload: 'bonuses' });
    
    try {
      const savedBonuses = await payrollService.saveBonuses(contractId, bonuses);
      dispatch({ type: 'SET_BONUSES', payload: savedBonuses });
      
      // Update configuration status
      const newStatus = { ...state.configurationStatus, bonuses: savedBonuses.length > 0 };
      dispatch({ type: 'SET_CONFIGURATION_STATUS', payload: newStatus });
      
      toast({
        title: 'Sucesso',
        description: 'Bónus guardados com sucesso',
      });
    } catch (error: any) {
      console.error('Error saving bonuses:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'bonuses', message: error.message || 'Erro ao guardar bónus' } });
      throw error;
    }
  }, [state.configurationStatus]);

  // Sync holidays
  const syncHolidays = useCallback(async (contractId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    dispatch({ type: 'CLEAR_ERROR', payload: 'holidays' });
    
    try {
      const contract = state.contracts.find(c => c.id === contractId);
      if (!contract?.workplace_location) {
        throw new Error('Localização do local de trabalho não definida');
      }
      
      await holidayAutoService.syncHolidaysForContract(contractId, contract.workplace_location);
      
      // Update configuration status
      const newStatus = { ...state.configurationStatus, holidays: true };
      dispatch({ type: 'SET_CONFIGURATION_STATUS', payload: newStatus });
      dispatch({ type: 'UPDATE_LAST_SYNC', payload: new Date() });
      
      toast({
        title: 'Sucesso',
        description: 'Feriados sincronizados com sucesso',
      });
    } catch (error: any) {
      console.error('Error syncing holidays:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'holidays', message: error.message || 'Erro ao sincronizar feriados' } });
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [state.contracts, state.configurationStatus]);

  // Sync deductions
  const syncDeductions = useCallback(async (contractId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    dispatch({ type: 'CLEAR_ERROR', payload: 'deductions' });
    
    try {
      const contract = state.contracts.find(c => c.id === contractId);
      if (!contract) {
        throw new Error('Contrato não encontrado');
      }
      
      const inferredDeductions = await deductionInferenceService.inferDeductionRates({
        salary: contract.salary,
        location: contract.workplace_location || 'Portugal',
        contractType: contract.contract_type,
      });
      
      // Convert inferred deductions to PayrollDeduction format
      const deductionsToSave = inferredDeductions.deductions.map(d => ({
        contract_id: contractId,
        type: d.type,
        amount: d.amount,
        percentage: d.percentage,
        is_automatic: true,
        conditions: d.conditions,
      }));
      
      await saveDeductions(contractId, deductionsToSave);
      dispatch({ type: 'UPDATE_LAST_SYNC', payload: new Date() });
      
      toast({
        title: 'Sucesso',
        description: 'Deduções sincronizadas automaticamente',
      });
    } catch (error: any) {
      console.error('Error syncing deductions:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'deductions', message: error.message || 'Erro ao sincronizar deduções' } });
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [state.contracts, saveDeductions]);

  // Sync all configurations
  const syncAllConfigurations = useCallback(async (contractId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    
    try {
      await Promise.all([
        syncHolidays(contractId),
        syncDeductions(contractId),
      ]);
      
      toast({
        title: 'Sucesso',
        description: 'Todas as configurações foram sincronizadas',
      });
    } catch (error: any) {
      console.error('Error syncing all configurations:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'general', message: 'Erro ao sincronizar configurações' } });
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [syncHolidays, syncDeductions]);

  // Validate configuration
  const validateConfiguration = useCallback(async (contractId: string): Promise<boolean> => {
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS', payload: 'general' });
    
    if (!contractId || typeof contractId !== 'string') {
      throw new Error('ID do contrato inválido');
    }
    
    const errors: string[] = [];
    
    // Validate contract
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      errors.push('Contrato não encontrado');
    } else {
      if (!contract.salary || contract.salary <= 0) {
        errors.push('Salário deve ser maior que zero');
      }
      if (!contract.currency) {
        errors.push('Moeda deve ser especificada');
      }
      if (!contract.start_date) {
        errors.push('Data de início deve ser especificada');
      }
    }
    
    // Validate deductions
    const contractDeductions = state.deductions.filter(d => d.contract_id === contractId);
    if (contractDeductions.length === 0) {
      errors.push('Pelo menos uma dedução deve ser configurada');
    }
    
    // Validate OT policies
    const contractOTPolicies = state.otPolicies.filter(p => p.contract_id === contractId);
    contractOTPolicies.forEach((policy, index) => {
      if (!policy.rate_multiplier || policy.rate_multiplier <= 1) {
        errors.push(`Política de horas extras ${index + 1}: multiplicador deve ser maior que 1`);
      }
    });
    
    if (errors.length > 0) {
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: { key: 'general', errors } });
      return false;
    }
    
    return true;
  }, [contracts, state.deductions, state.otPolicies]);

  // Error handling
  const clearError = useCallback((key: string) => {
    dispatch({ type: 'CLEAR_ERROR', payload: key });
  }, []);

  const clearValidationErrors = useCallback((key: string) => {
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS', payload: key });
  }, []);

  // Load initial data
  useEffect(() => {
    loadAllConfigurations();
  }, [loadAllConfigurations]);

  const contextValue: PayrollConfigContextType = {
    ...state,
    // Add contracts and activeContract from ActiveContractContext
    contracts,
    activeContract,
    loadAllConfigurations,
    loadContractConfigurations,
    setActiveContract,
    saveContract,
    saveDeductions,
    toggleAutoDeductions,
    saveOTPolicy,
    saveMealAllowance,
    saveBonuses,
    syncHolidays,
    syncDeductions,
    syncAllConfigurations,
    validateConfiguration,
    clearError,
    clearValidationErrors,
  };

  return (
    <PayrollConfigContext.Provider value={contextValue}>
      {children}
    </PayrollConfigContext.Provider>
  );
}

export function usePayrollConfig() {
  const context = useContext(PayrollConfigContext);
  if (context === undefined) {
    throw new Error('usePayrollConfig must be used within a PayrollConfigProvider');
  }
  return context;
}