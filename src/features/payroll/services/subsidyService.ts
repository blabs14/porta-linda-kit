import {
  SubsidyType,
  SubsidyConfig,
  VacationSubsidyConfig,
  ChristmasSubsidyConfig,
  SubsidyCalculation,
  SubsidyCalculationResult,
  SubsidyCalculationInput,
  SubsidyValidationResult,
  MockSubsidyData,
  SUBSIDY_CONSTANTS
} from '../types';

// Dados mock para desenvolvimento
const mockSubsidyConfigs: Record<string, SubsidyConfig[]> = {
  'user-1': [
    {
      id: 'vacation-config-1',
      user_id: 'user-1',
      contract_id: 'contract-1',
      type: 'vacation',
      enabled: true,
      payment_method: 'with_salary',
      payment_month: 6, // Junho
      vacation_days_entitled: 22,
      vacation_days_taken: 10,
      proportional_calculation: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    } as VacationSubsidyConfig,
    {
      id: 'christmas-config-1',
      user_id: 'user-1',
      contract_id: 'contract-1',
      type: 'christmas',
      enabled: true,
      payment_method: 'with_salary',
      payment_month: 12, // Dezembro
      proportional_calculation: true,
      reference_salary_months: 12,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    } as ChristmasSubsidyConfig
  ]
};

const mockSubsidyData: Record<string, MockSubsidyData> = {
  'user-1': {
    vacation: {
      days_entitled: 22,
      days_taken: 10,
      amount_cents: 95000, // €950
      payment_date: '2024-06-30'
    },
    christmas: {
      amount_cents: 95000, // €950
      payment_date: '2024-12-15',
      advance_paid_cents: 20000 // €200 adiantamento
    },
    meal_allowance: {
      daily_amount_cents: 700, // €7.00
      working_days: 22,
      total_amount_cents: 15400 // €154
    }
  }
};

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
 * Calcula o subsídio de férias
 */
function calculateVacationSubsidy(
  config: VacationSubsidyConfig,
  baseSalaryCents: number,
  workedMonths: number,
  referenceYear: number
): SubsidyCalculation {
  const entitledAmount = baseSalaryCents; // Subsídio de férias = 1 salário base
  
  let proportionalAmount = entitledAmount;
  if (config.proportional_calculation && workedMonths < SUBSIDY_CONSTANTS.MIN_WORKING_MONTHS_FOR_FULL_SUBSIDY) {
    proportionalAmount = Math.round((entitledAmount * workedMonths) / SUBSIDY_CONSTANTS.MIN_WORKING_MONTHS_FOR_FULL_SUBSIDY);
  }

  return {
    id: `vacation-calc-${config.user_id}-${referenceYear}`,
    user_id: config.user_id,
    contract_id: config.contract_id,
    type: 'vacation',
    reference_year: referenceYear,
    reference_month: config.payment_month,
    base_salary_cents: baseSalaryCents,
    worked_months: workedMonths,
    entitled_amount_cents: entitledAmount,
    proportional_amount_cents: proportionalAmount,
    advance_paid_cents: 0, // TODO: Implementar lógica de adiantamentos
    final_amount_cents: proportionalAmount,
    calculation_date: new Date().toISOString(),
    status: 'calculated',
    notes: config.proportional_calculation && workedMonths < 12 
      ? `Cálculo proporcional: ${workedMonths} meses trabalhados`
      : undefined,
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
  const entitledAmount = baseSalaryCents; // Subsídio de Natal = 1 salário base
  
  let proportionalAmount = entitledAmount;
  if (config.proportional_calculation && workedMonths < SUBSIDY_CONSTANTS.MIN_WORKING_MONTHS_FOR_FULL_SUBSIDY) {
    proportionalAmount = Math.round((entitledAmount * workedMonths) / SUBSIDY_CONSTANTS.MIN_WORKING_MONTHS_FOR_FULL_SUBSIDY);
  }

  return {
    id: `christmas-calc-${config.user_id}-${referenceYear}`,
    user_id: config.user_id,
    contract_id: config.contract_id,
    type: 'christmas',
    reference_year: referenceYear,
    reference_month: config.payment_month,
    base_salary_cents: baseSalaryCents,
    worked_months: workedMonths,
    entitled_amount_cents: entitledAmount,
    proportional_amount_cents: proportionalAmount,
    advance_paid_cents: 0, // TODO: Implementar lógica de adiantamentos
    final_amount_cents: proportionalAmount,
    calculation_date: new Date().toISOString(),
    status: 'calculated',
    notes: config.proportional_calculation && workedMonths < 12 
      ? `Cálculo proporcional: ${workedMonths} meses trabalhados`
      : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Carrega as configurações de subsídios para um utilizador
 */
async function getSubsidyConfigs(userId: string, contractId?: string): Promise<SubsidyConfig[]> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const configs = mockSubsidyConfigs[userId] || [];
  
  if (contractId) {
    return configs.filter(config => config.contract_id === contractId);
  }
  
  return configs;
}

/**
 * Carrega a configuração de um tipo específico de subsídio
 */
async function getSubsidyConfig(userId: string, contractId: string, type: SubsidyType): Promise<SubsidyConfig | null> {
  const configs = await getSubsidyConfigs(userId, contractId);
  return configs.find(config => config.type === type) || null;
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
    const baseSalaryCents = 95000; // €950 - valor mock
    
    // TODO: Calcular meses trabalhados reais
    const workedMonths = 12; // Valor mock

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
    return {
      total_subsidies_cents: 0,
      calculation_errors: [`Erro no cálculo de subsídios: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    };
  }
}

/**
 * Carrega dados mock de subsídios para desenvolvimento
 */
async function getMockSubsidyData(userId: string): Promise<MockSubsidyData | null> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return mockSubsidyData[userId] || null;
}

/**
 * Cria ou atualiza uma configuração de subsídio
 */
async function saveSubsidyConfig(config: SubsidyConfig): Promise<SubsidyConfig> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const userConfigs = mockSubsidyConfigs[config.user_id] || [];
  const existingIndex = userConfigs.findIndex(c => c.id === config.id);
  
  const updatedConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    userConfigs[existingIndex] = updatedConfig;
  } else {
    userConfigs.push(updatedConfig);
  }
  
  mockSubsidyConfigs[config.user_id] = userConfigs;
  
  return updatedConfig;
}

/**
 * Remove uma configuração de subsídio
 */
async function deleteSubsidyConfig(userId: string, configId: string): Promise<boolean> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const userConfigs = mockSubsidyConfigs[userId] || [];
  const initialLength = userConfigs.length;
  
  mockSubsidyConfigs[userId] = userConfigs.filter(config => config.id !== configId);
  
  return mockSubsidyConfigs[userId].length < initialLength;
}

// Exportar serviço de subsídios
export const subsidyService = {
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
  
  // Dados mock
  getMockSubsidyData
};

export default subsidyService;