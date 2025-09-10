import { supabase } from '../lib/supabaseClient';
import { 
  SubsidyConfig, 
  SubsidyType, 
  SubsidyCalculation,
  VacationSubsidyConfig,
  ChristmasSubsidyConfig 
} from '../features/payroll/types/subsidies';
import { logger } from '@/shared/lib/logger';

// Validation functions
const validateSubsidyConfig = (config: Partial<SubsidyConfig>): config is SubsidyConfig => {
  return !!(
    config.id &&
    config.user_id &&
    config.contract_id &&
    config.type &&
    typeof config.enabled === 'boolean' &&
    config.payment_method &&
    config.created_at &&
    config.updated_at
  );
};

const validateSubsidyType = (type: string): type is SubsidyType => {
  return ['vacation', 'christmas'].includes(type);
};

// Load subsidy configurations from database
export const loadSubsidyConfigs = async (userId: string): Promise<SubsidyConfig[]> => {
  try {
    logger.info('[SubsidyDB] Loading subsidy configs', { userId });
    
    const { data, error } = await supabase
      .from('subsidy_configs')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('[SubsidyDB] Error loading subsidy configs:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      logger.info('[SubsidyDB] No subsidy configs found for user', { userId });
      return [];
    }
    
    const validConfigs = data.filter(validateSubsidyConfig);
    
    if (validConfigs.length !== data.length) {
      logger.warn('[SubsidyDB] Some subsidy configs failed validation', {
        total: data.length,
        valid: validConfigs.length
      });
    }
    
    logger.info('[SubsidyDB] Successfully loaded subsidy configs', {
      userId,
      count: validConfigs.length
    });
    
    return validConfigs;
  } catch (error) {
    logger.error('[SubsidyDB] Failed to load subsidy configs:', error);
    throw error;
  }
};

// Calculate subsidy amounts
export const calculateSubsidyAmounts = (config: SubsidyConfig): SubsidyCalculation => {
  // This function should be implemented based on the specific subsidy type
  // For now, returning a placeholder structure
  return {
    id: `calc_${config.id}`,
    user_id: config.user_id,
    contract_id: config.contract_id,
    type: config.type,
    reference_year: new Date().getFullYear(),
    base_salary_cents: 0,
    worked_months: 12,
    entitled_amount_cents: 0,
    proportional_amount_cents: 0,
    advance_paid_cents: 0,
    final_amount_cents: 0,
    calculation_date: new Date().toISOString(),
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

// Main service object
export const subsidyDatabaseService = {
  loadSubsidyConfigs,
  calculateSubsidyAmounts,
  validateSubsidyConfig,
  validateSubsidyType
};