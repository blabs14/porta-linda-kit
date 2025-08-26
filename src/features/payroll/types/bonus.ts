// Tipos para configuração de bónus e prémios conforme legislação portuguesa

export type BonusType = 'vacation' | 'christmas' | 'performance';

export type PaymentMode = 'monthly' | 'specific_month' | 'proportional';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'annually';

// Configuração para subsídios obrigatórios (férias e Natal)
export interface MandatoryBonusConfig {
  id?: string;
  type: 'vacation' | 'christmas';
  enabled: boolean;
  paymentMode: PaymentMode;
  specificMonth?: number; // 1-12, usado quando paymentMode é 'specific_month'
  includeFixedAllowances: boolean; // Diuturnidades, isenção de horário, etc.
  excludeVariableAllowances: boolean; // Refeição, transporte, ajudas de custo
  createdAt?: Date;
  updatedAt?: Date;
}

// Configuração para prémios de produtividade
export interface PerformanceBonusConfig {
  id?: string;
  enabled: boolean;
  maxPercentageOfBaseSalary: number; // Máximo 6% por lei portuguesa 2025
  maxAnnualAmount: number; // Máximo €4.350 (5x salário mínimo 2025)
  requiresPerformanceEvaluation: boolean;
  paymentFrequency: PaymentFrequency;
  taxExempt: boolean; // Isenção de IRS e Segurança Social
  createdAt?: Date;
  updatedAt?: Date;
}

// União de todos os tipos de configuração de bónus
export type BonusConfig = MandatoryBonusConfig | PerformanceBonusConfig;

// Informações legais para cada tipo de bónus
export interface BonusLegalInfo {
  title: string;
  description: string;
  legalInfo: string;
  paymentDeadline: string;
  isMandatory: boolean;
  taxImplications: string;
}

// Limites legais para 2025
export const BONUS_LEGAL_LIMITS = {
  // Prémios de produtividade
  PERFORMANCE_MAX_PERCENTAGE: 6, // 6% da retribuição base anual
  PERFORMANCE_MAX_ANNUAL_AMOUNT: 4350, // €4.350 (5x salário mínimo 2025)
  
  // Subsídios obrigatórios
  VACATION_BONUS_MANDATORY: true,
  CHRISTMAS_BONUS_MANDATORY: true,
  
  // Meses padrão
  VACATION_DEFAULT_MONTH: 6, // Junho
  CHRISTMAS_DEFAULT_MONTH: 12, // Dezembro
  CHRISTMAS_PAYMENT_DEADLINE: '15 de dezembro',
  
  // Componentes incluídos/excluídos
  INCLUDED_COMPONENTS: [
    'Salário base',
    'Diuturnidades',
    'Isenção de horário de trabalho',
    'Trabalho noturno',
    'Trabalho por turnos'
  ],
  EXCLUDED_COMPONENTS: [
    'Subsídio de refeição',
    'Subsídio de transporte',
    'Subsídio de representação',
    'Ajudas de custo',
    'Abonos de viagem'
  ]
} as const;

// Informações legais por tipo de bónus
export const BONUS_LEGAL_INFO: Record<BonusType, BonusLegalInfo> = {
  vacation: {
    title: 'Subsídio de Férias (14º Mês)',
    description: 'Subsídio obrigatório por lei portuguesa, correspondente ao 14º mês',
    legalInfo: 'Inclui salário base e retribuições fixas (diuturnidades, isenção de horário). Exclui subsídios de refeição, transporte e ajudas de custo.',
    paymentDeadline: 'Antes do início do período de férias',
    isMandatory: true,
    taxImplications: 'Sujeito a retenção de IRS e contribuições para a Segurança Social'
  },
  christmas: {
    title: 'Subsídio de Natal (13º Mês)',
    description: 'Subsídio obrigatório por lei portuguesa, correspondente ao 13º mês',
    legalInfo: 'Corresponde a um mês de retribuição (salário base e diuturnidades). Sujeito a retenção de IRS e Segurança Social.',
    paymentDeadline: 'Até 15 de dezembro',
    isMandatory: true,
    taxImplications: 'Sujeito a retenção de IRS e contribuições para a Segurança Social'
  },
  performance: {
    title: 'Prémios de Produtividade e Desempenho',
    description: 'Prémios voluntários com benefícios fiscais quando dentro dos limites legais',
    legalInfo: 'Isenção de IRS e exclusão de contribuições para Segurança Social até 6% da retribuição base anual (máximo €4.350 em 2025).',
    paymentDeadline: 'Sem prazo legal específico',
    isMandatory: false,
    taxImplications: 'Isenção de IRS e Segurança Social dentro dos limites legais (6% da retribuição base anual, máximo €4.350)'
  }
};

// Validações para formulários
export interface BonusValidationRules {
  maxPercentage?: number;
  maxAmount?: number;
  requiredFields: string[];
  conditionalFields?: Record<string, string[]>;
}

export const BONUS_VALIDATION_RULES: Record<BonusType, BonusValidationRules> = {
  vacation: {
    requiredFields: ['enabled', 'paymentMode'],
    conditionalFields: {
      'paymentMode=specific_month': ['specificMonth']
    }
  },
  christmas: {
    requiredFields: ['enabled', 'paymentMode'],
    conditionalFields: {
      'paymentMode=specific_month': ['specificMonth']
    }
  },
  performance: {
    maxPercentage: BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_PERCENTAGE,
    maxAmount: BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_ANNUAL_AMOUNT,
    requiredFields: ['enabled'],
    conditionalFields: {
      'enabled=true': ['maxPercentageOfBaseSalary', 'maxAnnualAmount', 'paymentFrequency']
    }
  }
};

// Tipos para cálculos de bónus
export interface BonusCalculation {
  bonusType: BonusType;
  baseSalary: number;
  fixedAllowances: number;
  calculatedAmount: number;
  taxableAmount: number;
  exemptAmount: number;
  irsRetention: number;
  socialSecurityContribution: number;
  netAmount: number;
  calculationDate: Date;
}

// Histórico de pagamentos de bónus
export interface BonusPayment {
  id: string;
  employeeId: string;
  bonusType: BonusType;
  paymentDate: Date;
  grossAmount: number;
  netAmount: number;
  irsRetention: number;
  socialSecurityContribution: number;
  paymentMethod: 'transfer' | 'cash' | 'check';
  payrollPeriodId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}