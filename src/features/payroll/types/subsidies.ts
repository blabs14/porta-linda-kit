// Tipos para subsídios obrigatórios (férias e Natal)

// Tipos de subsídios obrigatórios
export type SubsidyType = 'vacation' | 'christmas';

// Status do subsídio
export type SubsidyStatus = 'pending' | 'calculated' | 'paid' | 'cancelled';

// Método de pagamento do subsídio
export type SubsidyPaymentMethod = 'with_salary' | 'separate_payment' | 'advance';

// Interface base para configuração de subsídios
export interface SubsidyConfig {
  id: string;
  user_id: string;
  contract_id: string;
  type: SubsidyType;
  enabled: boolean;
  payment_method: SubsidyPaymentMethod;
  payment_month?: number; // Mês de pagamento (1-12), se aplicável
  advance_percentage?: number; // Percentagem de adiantamento (0-100)
  created_at: string;
  updated_at: string;
}

// Interface para subsídio de férias
export interface VacationSubsidyConfig extends SubsidyConfig {
  type: 'vacation';
  vacation_days_entitled: number; // Dias de férias a que tem direito
  vacation_days_taken: number; // Dias de férias já gozados
  proportional_calculation: boolean; // Se deve calcular proporcionalmente
}

// Interface para subsídio de Natal
export interface ChristmasSubsidyConfig extends SubsidyConfig {
  type: 'christmas';
  proportional_calculation: boolean; // Se deve calcular proporcionalmente
  reference_salary_months: number; // Número de meses de salário de referência (normalmente 12)
}

// Interface para cálculo de subsídio
export interface SubsidyCalculation {
  id: string;
  user_id: string;
  contract_id: string;
  type: SubsidyType;
  reference_year: number;
  reference_month?: number; // Para subsídios mensais ou específicos
  base_salary_cents: number; // Salário base para cálculo
  worked_months: number; // Meses trabalhados no ano
  entitled_amount_cents: number; // Valor a que tem direito
  proportional_amount_cents: number; // Valor proporcional calculado
  advance_paid_cents: number; // Valor já pago em adiantamento
  final_amount_cents: number; // Valor final a pagar
  calculation_date: string;
  payment_date?: string;
  status: SubsidyStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Interface para resultado de cálculo de subsídios
export interface SubsidyCalculationResult {
  vacation_subsidy?: SubsidyCalculation;
  christmas_subsidy?: SubsidyCalculation;
  total_subsidies_cents: number;
  calculation_errors?: string[];
  calculation_warnings?: string[];
}

// Interface para dados de entrada do cálculo
export interface SubsidyCalculationInput {
  user_id: string;
  contract_id: string;
  reference_year: number;
  calculation_date: string;
  force_recalculation?: boolean;
}

// Interface para histórico de pagamentos de subsídios
export interface SubsidyPaymentHistory {
  id: string;
  user_id: string;
  contract_id: string;
  subsidy_calculation_id: string;
  type: SubsidyType;
  payment_date: string;
  amount_cents: number;
  payment_method: 'bank_transfer' | 'cash' | 'check';
  reference: string; // Referência do pagamento
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Interface para relatório de subsídios
export interface SubsidyReport {
  user_id: string;
  year: number;
  vacation_subsidy: {
    entitled_cents: number;
    paid_cents: number;
    pending_cents: number;
    payment_dates: string[];
  };
  christmas_subsidy: {
    entitled_cents: number;
    paid_cents: number;
    pending_cents: number;
    payment_dates: string[];
  };
  total_subsidies_cents: number;
  generated_at: string;
}

// Interface para validação de subsídios
export interface SubsidyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Interface para dados mock de subsídios (para desenvolvimento)
export interface MockSubsidyData {
  vacation: {
    days_entitled: number;
    days_taken: number;
    amount_cents: number;
    payment_date?: string;
  };
  christmas: {
    amount_cents: number;
    payment_date?: string;
    advance_paid_cents?: number;
  };
  meal_allowance: {
    daily_amount_cents: number;
    working_days: number;
    total_amount_cents: number;
  };
}

// Constantes para cálculos de subsídios
export const SUBSIDY_CONSTANTS = {
  VACATION_DAYS_PER_YEAR: 22, // Dias de férias por ano em Portugal
  CHRISTMAS_SUBSIDY_MONTHS: 12, // Meses de referência para subsídio de Natal
  MIN_WORKING_MONTHS_FOR_FULL_SUBSIDY: 12, // Meses mínimos para subsídio completo
  PROPORTIONAL_CALCULATION_THRESHOLD: 6, // Meses mínimos para cálculo proporcional
} as const;

// Utilitários de tipo
export type SubsidyConfigUnion = VacationSubsidyConfig | ChristmasSubsidyConfig;
export type SubsidyTypeConfig<T extends SubsidyType> = T extends 'vacation'
  ? VacationSubsidyConfig
  : T extends 'christmas'
  ? ChristmasSubsidyConfig
  : never;