import { supabase } from '@/lib/supabase';
import { logger } from '@/shared/lib/logger';
import {
  SubsidyType,
  SubsidyConfig,
  VacationSubsidyConfig,
  ChristmasSubsidyConfig,
  SubsidyCalculation,
  SubsidyCalculationResult,
  SubsidyCalculationInput,
  SubsidyValidationResult,
  SUBSIDY_CONSTANTS
} from '../types';

/**
 * Valida os dados de entrada para cálculo de subsídios
 */
function validateSubsidyCalculationInput(input: SubsidyCalculationInput): SubsidyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.user_id) {
    errors.push('ID do utilizador é obrigatório');
  }

  if (!input.contract_id) {
    errors.push('ID do contrato é obrigatório');
  }

  if (!input.reference_year || input.reference_year < 2020 || input.reference_year > new Date().getFullYear() + 1) {
    errors.push('Ano de referência inválido');
  }

  if (!input.calculation_date) {
    errors.push('Data de cálculo é obrigatória');
  }

  const calculationDate = new Date(input.calculation_date);
  const currentDate = new Date();
  
  if (calculationDate > currentDate) {
    warnings.push('Data de cálculo é futura');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Carrega as configurações de subsídios para um utilizador da base de dados
 */
async function getSubsidyConfigs(userId: string, contractId?: string): Promise<SubsidyConfig[]> {
  try {
    logger.debug('subsidyDatabaseService.getSubsidyConfigs', { userId, contractId });
    
    let query = supabase
      .from('payroll_bonus_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('bonus_type', 'mandatory')
      .eq('is_active', true);
    
    if (contractId) {
      query = query.eq('contract_id', contractId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Erro ao carregar configurações de subsídios:', error);
      throw error;
    }
    
    // Converter dados da base de dados para o formato esperado
    const configs: SubsidyConfig[] = (data || []).map(item => {
      const configData = item.config_data || {};
      
      // Determinar o tipo de subsídio baseado na configuração
      const hasVacationBonus = configData.vacationBonus === true;
      const hasChristmasBonus = configData.christmasBonus === true;
      
      const configs: SubsidyConfig[] = [];
      
      if (hasVacationBonus) {
        configs.push({
          id: `${item.id}-vacation`,
          user_id: item.user_id,
          contract_id: item.contract_id,
          type: 'vacation',
          enabled: true,
          payment_method: configData.paymentType === 'full' ? 'with_salary' : 'separate_payment',
          payment_month: configData.paymentMonth === 'july' ? 7 : 6,
          vacation_days_entitled: 22, // Valor padrão português
          vacation_days_taken: 0, // TODO: Obter dos registos de férias
          proportional_calculation: configData.autoCalculate === true,
          created_at: item.created_at,
          updated_at: item.updated_at
        } as VacationSubsidyConfig);
      }
      
      if (hasChristmasBonus) {
        configs.push({
          id: `${item.id}-christmas`,
          user_id: item.user_id,
          contract_id: item.contract_id,
          type: 'christmas',
          enabled: true,
          payment_method: configData.paymentType === 'full' ? 'with_salary' : 'separate_payment',
          payment_month: 12,
          proportional_calculation: configData.autoCalculate === true,
          reference_salary_months: 12,
          created_at: item.created_at,
          updated_at: item.updated_at
        } as ChristmasSubsidyConfig);
      }
      
      return configs;
    }).flat();
    
    logger.debug('Configurações de subsídios carregadas:', configs);
    return configs;
    
  } catch (error) {
    logger.error('Erro ao carregar configurações de subsídios:', error);
    return [];
  }
}

/**
 * Carrega a configuração de um tipo específico de subsídio
 */
async function getSubsidyConfig(userId: string, contractId: string, type: SubsidyType): Promise<SubsidyConfig | null> {
  const configs = await getSubsidyConfigs(userId, contractId);
  return configs.find(config => config.type === type) || null;
}

/**
 * Calcula o subsídio de férias
 */
function calculateVacationSubsidy(
  config: VacationSubsidyConfig,
  baseSalaryCents: number,
  workedMonths: number,
  referenceYear: number
): SubsidyCalculation {
  const entitledAmount = baseSalaryCents; // 1 mês de salário
  const proportionalAmount = config.proportional_calculation 
    ? Math.round((entitledAmount * workedMonths) / 12)
    : entitledAmount;
  
  return {
    id: `vacation-${config.contract_id}-${referenceYear}`,
    user_id: config.user_id,
    contract_id: config.contract_id,
    type: 'vacation',
    reference_year: referenceYear,
    base_salary_cents: baseSalaryCents,
    worked_months: workedMonths,
    entitled_amount_cents: entitledAmount,
    proportional_amount_cents: proportionalAmount,
    advance_paid_cents: 0, // TODO: Obter dos registos de pagamentos
    final_amount_cents: proportionalAmount,
    calculation_date: new Date().toISOString(),
    status: 'calculated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Calcula o subsídio de Natal
 */
function calculateChristmasSubsidy(
  config: ChristmasSubsidyConfig,
  baseSalaryCents: number,
  workedMonths: number,
  referenceYear: number
): SubsidyCalculation {
  const entitledAmount = baseSalaryCents; // 1 mês de salário
  const proportionalAmount = config.proportional_calculation 
    ? Math.round((entitledAmount * workedMonths) / 12)
    : entitledAmount;
  
  return {
    id: `christmas-${config.contract_id}-${referenceYear}`,
    user_id: config.user_id,
    contract_id: config.contract_id,
    type: 'christmas',
    reference_year: referenceYear,
    base_salary_cents: baseSalaryCents,
    worked_months: workedMonths,
    entitled_amount_cents: entitledAmount,
    proportional_amount_cents: proportionalAmount,
    advance_paid_cents: 0, // TODO: Obter dos registos de pagamentos
    final_amount_cents: proportionalAmount,
    calculation_date: new Date().toISOString(),
    status: 'calculated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Calcula todos os subsídios para um utilizador
 */
async function calculateSubsidies(input: SubsidyCalculationInput): Promise<SubsidyCalculationResult> {
  const validation = validateSubsidyCalculationInput(input);
  
  if (!validation.isValid) {
    return {
      total_subsidies_cents: 0,
      calculation_errors: validation.errors,
      calculation_warnings: validation.warnings
    };
  }

  try {
    const configs = await getSubsidyConfigs(input.user_id, input.contract_id);
    const enabledConfigs = configs.filter(config => config.enabled);
    
    if (enabledConfigs.length === 0) {
      return {
        total_subsidies_cents: 0,
        calculation_warnings: ['Nenhuma configuração de subsídio ativa encontrada']
      };
    }

    // TODO: Obter salário base real do contrato
    const baseSalaryCents = 95000; // €950 - valor temporário
    
    // TODO: Calcular meses trabalhados reais
    const workedMonths = 12; // Valor temporário

    const result: SubsidyCalculationResult = {
      total_subsidies_cents: 0,
      calculation_warnings: validation.warnings
    };

    for (const config of enabledConfigs) {
      if (config.type === 'vacation') {
        result.vacation_subsidy = calculateVacationSubsidy(
          config as VacationSubsidyConfig,
          baseSalaryCents,
          workedMonths,
          input.reference_year
        );
        result.total_subsidies_cents += result.vacation_subsidy.final_amount_cents;
      } else if (config.type === 'christmas') {
        result.christmas_subsidy = calculateChristmasSubsidy(
          config as ChristmasSubsidyConfig,
          baseSalaryCents,
          workedMonths,
          input.reference_year
        );
        result.total_subsidies_cents += result.christmas_subsidy.final_amount_cents;
      }
    }

    return result;
  } catch (error) {
    logger.error('Erro ao calcular subsídios:', error);
    return {
      total_subsidies_cents: 0,
      calculation_errors: ['Erro interno ao calcular subsídios']
    };
  }
}

/**
 * Cria ou atualiza uma configuração de subsídio
 */
async function saveSubsidyConfig(config: SubsidyConfig): Promise<SubsidyConfig> {
  try {
    logger.debug('subsidyDatabaseService.saveSubsidyConfig', config);
    
    // Converter configuração para o formato da base de dados
    const configData = {
      vacationBonus: config.type === 'vacation' || config.type === 'christmas',
      christmasBonus: config.type === 'christmas' || config.type === 'vacation',
      autoCalculate: true,
      paymentType: config.payment_method === 'with_salary' ? 'full' : 'separate',
      paymentMonth: config.payment_month === 7 ? 'july' : 'december'
    };
    
    const { data, error } = await supabase
      .from('payroll_bonus_configs')
      .upsert({
        user_id: config.user_id,
        contract_id: config.contract_id,
        bonus_type: 'mandatory',
        config_data: configData,
        is_active: config.enabled,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Erro ao guardar configuração de subsídio:', error);
      throw error;
    }
    
    return {
      ...config,
      id: data.id,
      updated_at: data.updated_at
    };
    
  } catch (error) {
    logger.error('Erro ao guardar configuração de subsídio:', error);
    throw error;
  }
}

/**
 * Remove uma configuração de subsídio
 */
async function deleteSubsidyConfig(userId: string, configId: string): Promise<boolean> {
  try {
    logger.debug('subsidyDatabaseService.deleteSubsidyConfig', { userId, configId });
    
    const { error } = await supabase
      .from('payroll_bonus_configs')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('id', configId);
    
    if (error) {
      logger.error('Erro ao remover configuração de subsídio:', error);
      throw error;
    }
    
    return true;
    
  } catch (error) {
    logger.error('Erro ao remover configuração de subsídio:', error);
    return false;
  }
}

/**
 * Carrega dados de subsídios para a interface
 */
async function getSubsidyData(userId: string, contractId: string) {
  try {
    logger.debug('subsidyDatabaseService.getSubsidyData', { userId, contractId });
    
    // Carregar configurações de subsídios
    const configs = await getSubsidyConfigs(userId, contractId);
    
    // Carregar configuração de subsídio de refeição
    const { data: mealAllowanceData, error: mealError } = await supabase
      .from('payroll_meal_allowance_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('contract_id', contractId)
      .single();
    
    if (mealError && mealError.code !== 'PGRST116') {
      logger.error('Erro ao carregar configuração de subsídio de refeição:', mealError);
    }
    
    const vacationConfig = configs.find(c => c.type === 'vacation');
    const christmasConfig = configs.find(c => c.type === 'christmas');
    
    return {
      mealAllowance: {
        dailyAmount: mealAllowanceData ? (mealAllowanceData.daily_amount_cents / 100) : 0,
        monthlyEstimate: mealAllowanceData ? (mealAllowanceData.daily_amount_cents * 22 / 100) : 0,
        isActive: !!mealAllowanceData
      },
      vacationBonus: {
        amount: 950, // TODO: Calcular baseado no salário real
        percentage: 100,
        isActive: !!vacationConfig
      },
      christmasBonus: {
        amount: 950, // TODO: Calcular baseado no salário real
        percentage: 100,
        isActive: !!christmasConfig
      }
    };
    
  } catch (error) {
    logger.error('Erro ao carregar dados de subsídios:', error);
    throw error;
  }
}

// Exportar serviço de subsídios da base de dados
export const subsidyDatabaseService = {
  // Configurações
  getSubsidyConfigs,
  getSubsidyConfig,
  saveSubsidyConfig,
  deleteSubsidyConfig,
  
  // Cálculos
  calculateSubsidies,
  calculateVacationSubsidy,
  calculateChristmasSubsidy,
  
  // Validação
  validateSubsidyCalculationInput,
  
  // Dados para interface
  getSubsidyData
};

export default subsidyDatabaseService;