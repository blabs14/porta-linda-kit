import { useMemo, useCallback } from 'react';
import { usePayrollConfig as usePayrollConfigContext } from '../contexts/PayrollConfigContext';
import type {
  PayrollContract,
  PayrollDeduction,
  PayrollOTPolicy,
  PayrollMealAllowance,
  PayrollBonus,
  ConfigurationStatus,
} from '../contexts/PayrollConfigContext';

// Specialized hooks for different configuration aspects

/**
 * Hook for contract-specific operations
 */
export function useContractConfig(contractId?: string) {
  const context = usePayrollConfigContext();
  
  const contract = useMemo(() => {
    if (!contractId) return context.activeContract;
    return context.contracts.find(c => c.id === contractId) || null;
  }, [context.contracts, context.activeContract, contractId]);
  
  const isActive = useMemo(() => {
    return contract?.status === 'active';
  }, [contract]);
  
  const canEdit = useMemo(() => {
    return contract && (contract.status === 'active' || contract.status === 'pending');
  }, [contract]);
  
  const saveContract = useCallback(async (data: Partial<PayrollContract>) => {
    const contractData = contract ? { ...contract, ...data } : data;
    return context.saveContract(contractData);
  }, [context.saveContract, contract]);
  
  return {
    contract,
    isActive,
    canEdit,
    isLoading: context.isLoading,
    error: context.errors.contract,
    validationErrors: context.validationErrors.contract || [],
    saveContract,
    clearError: () => context.clearError('contract'),
    clearValidationErrors: () => context.clearValidationErrors('contract'),
  };
}

/**
 * Hook for deduction-specific operations
 */
export function useDeductionConfig(contractId?: string) {
  const context = usePayrollConfigContext();
  
  const deductions = useMemo(() => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) return [];
    return context.deductions.filter(d => d.contract_id === targetContractId);
  }, [context.deductions, contractId, context.activeContract]);
  
  const automaticDeductions = useMemo(() => {
    return deductions.filter(d => d.is_automatic);
  }, [deductions]);
  
  const manualDeductions = useMemo(() => {
    return deductions.filter(d => !d.is_automatic);
  }, [deductions]);
  
  const hasAutoDeductions = useMemo(() => {
    return automaticDeductions.length > 0;
  }, [automaticDeductions]);
  
  const totalDeductionAmount = useMemo(() => {
    return deductions.reduce((total, d) => total + (d.amount || 0), 0);
  }, [deductions]);
  
  const totalDeductionPercentage = useMemo(() => {
    return deductions.reduce((total, d) => total + (d.percentage || 0), 0);
  }, [deductions]);
  
  const saveDeductions = useCallback(async (deductionData: Partial<PayrollDeduction>[]) => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) throw new Error('No contract selected');
    return context.saveDeductions(targetContractId, deductionData);
  }, [context.saveDeductions, contractId, context.activeContract]);
  
  const toggleAutoDeductions = useCallback(async (enabled: boolean) => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) throw new Error('No contract selected');
    return context.toggleAutoDeductions(targetContractId, enabled);
  }, [context.toggleAutoDeductions, contractId, context.activeContract]);
  
  const syncDeductions = useCallback(async () => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) throw new Error('No contract selected');
    return context.syncDeductions(targetContractId);
  }, [context.syncDeductions, contractId, context.activeContract]);
  
  return {
    deductions,
    automaticDeductions,
    manualDeductions,
    hasAutoDeductions,
    totalDeductionAmount,
    totalDeductionPercentage,
    isLoading: context.isLoading,
    isSyncing: context.isSyncing,
    error: context.errors.deductions,
    validationErrors: context.validationErrors.deductions || [],
    saveDeductions,
    toggleAutoDeductions,
    syncDeductions,
    clearError: () => context.clearError('deductions'),
    clearValidationErrors: () => context.clearValidationErrors('deductions'),
  };
}

/**
 * Hook for overtime policy operations
 */
export function useOvertimeConfig(contractId?: string) {
  const context = usePayrollConfigContext();
  
  const otPolicies = useMemo(() => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) return [];
    return context.otPolicies.filter(p => p.contract_id === targetContractId);
  }, [context.otPolicies, contractId, context.activeContract]);
  
  const hasOvertimePolicies = useMemo(() => {
    return otPolicies.length > 0;
  }, [otPolicies]);
  
  const getOvertimeRate = useCallback((type: string) => {
    const policy = otPolicies.find(p => p.type === type);
    return policy?.rate_multiplier || 1;
  }, [otPolicies]);
  
  const saveOTPolicy = useCallback(async (policyData: Partial<PayrollOTPolicy>) => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) throw new Error('No contract selected');
    return context.saveOTPolicy(targetContractId, policyData);
  }, [context.saveOTPolicy, contractId, context.activeContract]);
  
  return {
    otPolicies,
    hasOvertimePolicies,
    getOvertimeRate,
    isLoading: context.isLoading,
    error: context.errors.overtime,
    validationErrors: context.validationErrors.overtime || [],
    saveOTPolicy,
    clearError: () => context.clearError('overtime'),
    clearValidationErrors: () => context.clearValidationErrors('overtime'),
  };
}

/**
 * Hook for meal allowance operations
 */
export function useMealAllowanceConfig(contractId?: string) {
  const context = usePayrollConfigContext();
  
  const mealAllowances = useMemo(() => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) return [];
    return context.mealAllowances.filter(a => a.contract_id === targetContractId);
  }, [context.mealAllowances, contractId, context.activeContract]);
  
  const activeMealAllowance = useMemo(() => {
    return mealAllowances[0] || null; // Assuming one active allowance per contract
  }, [mealAllowances]);
  
  const hasMealAllowance = useMemo(() => {
    return mealAllowances.length > 0;
  }, [mealAllowances]);
  
  const calculateMonthlyAmount = useCallback((dailyAmount: number, excludedMonths: string[] = []) => {
    const workingDaysPerMonth = 22; // Average working days
    const monthsWithAllowance = 12 - excludedMonths.length;
    return (dailyAmount * workingDaysPerMonth * monthsWithAllowance) / 12;
  }, []);
  
  const saveMealAllowance = useCallback(async (allowanceData: Partial<PayrollMealAllowance>) => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) throw new Error('No contract selected');
    return context.saveMealAllowance(targetContractId, allowanceData);
  }, [context.saveMealAllowance, contractId, context.activeContract]);
  
  return {
    mealAllowances,
    activeMealAllowance,
    hasMealAllowance,
    calculateMonthlyAmount,
    isLoading: context.isLoading,
    error: context.errors.meal_allowance,
    validationErrors: context.validationErrors.meal_allowance || [],
    saveMealAllowance,
    clearError: () => context.clearError('meal_allowance'),
    clearValidationErrors: () => context.clearValidationErrors('meal_allowance'),
  };
}

/**
 * Hook for bonus operations
 */
export function useBonusConfig(contractId?: string) {
  const context = usePayrollConfigContext();
  
  const bonuses = useMemo(() => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) return [];
    return context.bonuses.filter(b => b.contract_id === targetContractId);
  }, [context.bonuses, contractId, context.activeContract]);
  
  const mandatoryBonuses = useMemo(() => {
    return bonuses.filter(b => b.type === 'mandatory');
  }, [bonuses]);
  
  const performanceBonuses = useMemo(() => {
    return bonuses.filter(b => b.type === 'performance');
  }, [bonuses]);
  
  const customBonuses = useMemo(() => {
    return bonuses.filter(b => b.type === 'custom');
  }, [bonuses]);
  
  const totalBonusAmount = useMemo(() => {
    return bonuses.reduce((total, b) => total + (b.amount || 0), 0);
  }, [bonuses]);
  
  const hasBonuses = useMemo(() => {
    return bonuses.length > 0;
  }, [bonuses]);
  
  const saveBonuses = useCallback(async (bonusData: Partial<PayrollBonus>[]) => {
    const targetContractId = contractId || context.activeContract?.id;
    if (!targetContractId) throw new Error('No contract selected');
    return context.saveBonuses(targetContractId, bonusData);
  }, [context.saveBonuses, contractId, context.activeContract]);
  
  return {
    bonuses,
    mandatoryBonuses,
    performanceBonuses,
    customBonuses,
    totalBonusAmount,
    hasBonuses,
    isLoading: context.isLoading,
    error: context.errors.bonuses,
    validationErrors: context.validationErrors.bonuses || [],
    saveBonuses,
    clearError: () => context.clearError('bonuses'),
    clearValidationErrors: () => context.clearValidationErrors('bonuses'),
  };
}

/**
 * Hook for configuration status and validation
 */
export function useConfigurationStatus(contractId?: string) {
  const context = usePayrollConfigContext();
  
  const targetContractId = contractId || context.activeContract?.id;
  
  const isConfigurationComplete = useMemo(() => {
    const status = context.configurationStatus;
    return status.contract && status.deductions && status.overtime;
  }, [context.configurationStatus]);
  
  const isConfigurationValid = useMemo(() => {
    return Object.keys(context.validationErrors).length === 0;
  }, [context.validationErrors]);
  
  const configurationProgress = useMemo(() => {
    const status = context.configurationStatus;
    const completed = Object.values(status).filter(Boolean).length;
    const total = Object.keys(status).length;
    return Math.round((completed / total) * 100);
  }, [context.configurationStatus]);
  
  const missingConfigurations = useMemo(() => {
    const status = context.configurationStatus;
    const missing: string[] = [];
    
    if (!status.contract) missing.push('Contrato');
    if (!status.deductions) missing.push('Deduções');
    if (!status.overtime) missing.push('Horas extras');
    if (!status.meal_allowance) missing.push('Subsídio de alimentação');
    if (!status.bonuses) missing.push('Bónus');
    if (!status.holidays) missing.push('Feriados');
    
    return missing;
  }, [context.configurationStatus]);
  
  const validateConfiguration = useCallback(async () => {
    if (!targetContractId) {
      console.warn('Tentativa de validação sem contrato selecionado');
      return false; // Retorna false em vez de lançar erro
    }
    return context.validateConfiguration(targetContractId);
  }, [context.validateConfiguration, targetContractId]);
  
  const syncAllConfigurations = useCallback(async () => {
    if (!targetContractId) throw new Error('No contract selected');
    return context.syncAllConfigurations(targetContractId);
  }, [context.syncAllConfigurations, targetContractId]);
  
  return {
    configurationStatus: context.configurationStatus,
    isConfigurationComplete,
    isConfigurationValid,
    configurationProgress,
    missingConfigurations,
    isLoading: context.isLoading,
    isSyncing: context.isSyncing,
    lastSyncTime: context.lastSyncTime,
    errors: context.errors,
    validationErrors: context.validationErrors,
    validateConfiguration,
    syncAllConfigurations,
    clearError: context.clearError,
    clearValidationErrors: context.clearValidationErrors,
  };
}

/**
 * Main hook that provides access to all payroll configuration functionality
 */
export function usePayrollConfig(contractId?: string) {
  const context = usePayrollConfigContext();
  
  return {
    // Core state
    ...context,
    
    // Specialized hooks
    contract: useContractConfig(contractId),
    deductions: useDeductionConfig(contractId),
    overtime: useOvertimeConfig(contractId),
    mealAllowance: useMealAllowanceConfig(contractId),
    bonuses: useBonusConfig(contractId),
    status: useConfigurationStatus(contractId),
  };
}

// Re-export the context hook for direct access when needed
export { usePayrollConfig as usePayrollConfigContext } from '../contexts/PayrollConfigContext';