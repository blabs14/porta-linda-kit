// Utilitários para cálculo de bónus conforme legislação portuguesa 2025

import { BonusType, BonusCalculation, BONUS_LEGAL_LIMITS } from '../types/bonus';

export interface EmployeeSalaryData {
  baseSalary: number;
  fixedAllowances: number; // Diuturnidades, isenção de horário, etc.
  variableAllowances: number; // Refeição, transporte, etc.
  annualBaseSalary: number;
}

export interface TaxRates {
  irsRate: number; // Taxa de IRS aplicável
  socialSecurityRate: number; // Taxa de Segurança Social (11%)
}

/**
 * Calcula o valor do subsídio de férias ou Natal
 * @param salaryData Dados salariais do funcionário
 * @param bonusType Tipo de bónus (vacation ou christmas)
 * @param includeFixedAllowances Se deve incluir retribuições fixas
 * @param excludeVariableAllowances Se deve excluir subsídios variáveis
 * @returns Valor calculado do subsídio
 */
export function calculateMandatoryBonus(
  salaryData: EmployeeSalaryData,
  bonusType: 'vacation' | 'christmas',
  includeFixedAllowances: boolean = true,
  excludeVariableAllowances: boolean = true
): number {
  let calculatedAmount = salaryData.baseSalary;
  
  // Incluir retribuições fixas se configurado
  if (includeFixedAllowances) {
    calculatedAmount += salaryData.fixedAllowances;
  }
  
  // Os subsídios variáveis são sempre excluídos por lei
  // (não incluímos variableAllowances no cálculo)
  
  return calculatedAmount;
}

/**
 * Calcula o valor do prémio de produtividade
 * @param salaryData Dados salariais do funcionário
 * @param percentage Percentagem do salário base (máximo 6%)
 * @param maxAnnualAmount Valor máximo anual (máximo €4.350)
 * @returns Valor calculado do prémio
 */
export function calculatePerformanceBonus(
  salaryData: EmployeeSalaryData,
  percentage: number,
  maxAnnualAmount: number
): number {
  // Validar limites legais
  const validPercentage = Math.min(percentage, BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_PERCENTAGE);
  const validMaxAmount = Math.min(maxAnnualAmount, BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_ANNUAL_AMOUNT);
  
  // Calcular com base na percentagem do salário base anual
  const percentageAmount = (salaryData.annualBaseSalary * validPercentage) / 100;
  
  // Aplicar o limite máximo
  return Math.min(percentageAmount, validMaxAmount);
}

/**
 * Calcula as retenções fiscais para bónus
 * @param grossAmount Valor bruto do bónus
 * @param bonusType Tipo de bónus
 * @param taxRates Taxas de IRS e Segurança Social
 * @param isPerformanceBonusExempt Se o prémio de produtividade está isento
 * @returns Cálculo completo com retenções
 */
export function calculateBonusTaxes(
  grossAmount: number,
  bonusType: BonusType,
  taxRates: TaxRates,
  isPerformanceBonusExempt: boolean = true
): {
  grossAmount: number;
  exemptAmount: number;
  taxableAmount: number;
  irsRetention: number;
  socialSecurityContribution: number;
  netAmount: number;
} {
  let exemptAmount = 0;
  let taxableAmount = grossAmount;
  
  // Para prémios de produtividade, aplicar isenção se dentro dos limites
  if (bonusType === 'performance' && isPerformanceBonusExempt) {
    // Todo o valor é isento se estiver dentro dos limites legais
    exemptAmount = grossAmount;
    taxableAmount = 0;
  }
  
  // Calcular retenções sobre o valor tributável
  const irsRetention = taxableAmount * (taxRates.irsRate / 100);
  const socialSecurityContribution = taxableAmount * (taxRates.socialSecurityRate / 100);
  
  const netAmount = grossAmount - irsRetention - socialSecurityContribution;
  
  return {
    grossAmount,
    exemptAmount,
    taxableAmount,
    irsRetention,
    socialSecurityContribution,
    netAmount
  };
}

/**
 * Calcula o bónus completo com todas as informações fiscais
 * @param salaryData Dados salariais do funcionário
 * @param bonusType Tipo de bónus
 * @param config Configuração específica do bónus
 * @param taxRates Taxas fiscais aplicáveis
 * @returns Cálculo completo do bónus
 */
export function calculateCompleteBonus(
  salaryData: EmployeeSalaryData,
  bonusType: BonusType,
  config: any, // Configuração específica do tipo de bónus
  taxRates: TaxRates
): BonusCalculation {
  let grossAmount: number;
  
  // Calcular valor bruto baseado no tipo
  if (bonusType === 'vacation' || bonusType === 'christmas') {
    grossAmount = calculateMandatoryBonus(
      salaryData,
      bonusType,
      config.includeFixedAllowances,
      config.excludeVariableAllowances
    );
  } else {
    grossAmount = calculatePerformanceBonus(
      salaryData,
      config.maxPercentageOfBaseSalary,
      config.maxAnnualAmount
    );
  }
  
  // Calcular impostos
  const taxCalculation = calculateBonusTaxes(
    grossAmount,
    bonusType,
    taxRates,
    bonusType === 'performance' ? config.taxExempt : false
  );
  
  return {
    bonusType,
    baseSalary: salaryData.baseSalary,
    fixedAllowances: salaryData.fixedAllowances,
    calculatedAmount: grossAmount,
    taxableAmount: taxCalculation.taxableAmount,
    exemptAmount: taxCalculation.exemptAmount,
    irsRetention: taxCalculation.irsRetention,
    socialSecurityContribution: taxCalculation.socialSecurityContribution,
    netAmount: taxCalculation.netAmount,
    calculationDate: new Date()
  };
}

/**
 * Valida se um prémio de produtividade está dentro dos limites legais
 * @param annualBaseSalary Salário base anual
 * @param percentage Percentagem configurada
 * @param maxAmount Valor máximo configurado
 * @returns Objeto com validação e limites aplicáveis
 */
export function validatePerformanceBonusLimits(
  annualBaseSalary: number,
  percentage: number,
  maxAmount: number
): {
  isValid: boolean;
  appliedPercentage: number;
  appliedMaxAmount: number;
  calculatedAmount: number;
  exceedsPercentageLimit: boolean;
  exceedsAmountLimit: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Verificar limite de percentagem
  const exceedsPercentageLimit = percentage > BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_PERCENTAGE;
  const appliedPercentage = Math.min(percentage, BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_PERCENTAGE);
  
  if (exceedsPercentageLimit) {
    warnings.push(`Percentagem reduzida para ${BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_PERCENTAGE}% (limite legal)`);
  }
  
  // Verificar limite de valor
  const exceedsAmountLimit = maxAmount > BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_ANNUAL_AMOUNT;
  const appliedMaxAmount = Math.min(maxAmount, BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_ANNUAL_AMOUNT);
  
  if (exceedsAmountLimit) {
    warnings.push(`Valor máximo reduzido para €${BONUS_LEGAL_LIMITS.PERFORMANCE_MAX_ANNUAL_AMOUNT} (limite legal)`);
  }
  
  // Calcular valor final
  const percentageAmount = (annualBaseSalary * appliedPercentage) / 100;
  const calculatedAmount = Math.min(percentageAmount, appliedMaxAmount);
  
  return {
    isValid: !exceedsPercentageLimit && !exceedsAmountLimit,
    appliedPercentage,
    appliedMaxAmount,
    calculatedAmount,
    exceedsPercentageLimit,
    exceedsAmountLimit,
    warnings
  };
}

/**
 * Formata valores monetários para exibição
 * @param amount Valor a formatar
 * @returns String formatada em euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formata percentagens para exibição
 * @param percentage Percentagem a formatar
 * @returns String formatada
 */
export function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(percentage / 100);
}