// Serviço de inferência automática de percentagens de IRS e Segurança Social
// Lê as condições configuradas e as tabelas legais para calcular as percentagens automaticamente

import { supabase } from '../../../lib/supabaseClient';
import type { PayrollDeductionConditions, LegalTable } from '../types';
import { isValidUUID } from '@/lib/validation';

// Tipos para as estruturas de dados das tabelas legais
interface IRSBracket {
  min: number;
  max?: number;
  rate: number;
}

interface SSRates {
  worker: number;
  employer: number;
}

interface MealAllowanceLimits {
  cashPerDay: number;
  cardPerDay: number;
}

interface OvertimeRules {
  mode: 'half_effective_rate' | 'none';
}

// Interface para o resultado da inferência
export interface DeductionInferenceResult {
  ssWorkerRate: number;
  irsEffectiveRate: number;
  overtimeMode: string;
  mealLimits: MealAllowanceLimits;
  baseIRS: number;
  warnings: string[];
}

// ============================================================================
// CONDIÇÕES DE DEDUÇÃO
// ============================================================================

export async function getDeductionConditions(
  userId: string,
  contractId: string
): Promise<PayrollDeductionConditions | null> {
  // Validar se o contractId é um UUID válido
  if (!isValidUUID(contractId)) {
    throw new Error('ID do contrato deve ser um UUID válido');
  }

  const { data, error } = await supabase
    .from('payroll_deduction_conditions')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function upsertDeductionConditions(
  userId: string,
  contractId: string,
  conditions: Omit<PayrollDeductionConditions, 'id' | 'user_id' | 'contract_id' | 'created_at' | 'updated_at'>
): Promise<PayrollDeductionConditions> {
  const { data, error } = await supabase
    .from('payroll_deduction_conditions')
    .upsert({
      user_id: userId,
      contract_id: contractId,
      ...conditions
    }, {
      onConflict: 'user_id,contract_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeductionConditions(
  userId: string,
  contractId: string,
  conditions: Omit<PayrollDeductionConditions, 'id' | 'user_id' | 'contract_id' | 'created_at' | 'updated_at'>
): Promise<PayrollDeductionConditions> {
  // Alias para upsertDeductionConditions para manter compatibilidade
  return upsertDeductionConditions(userId, contractId, conditions);
}

// ============================================================================
// TABELAS LEGAIS
// ============================================================================

export async function getLegalTable(
  year: number,
  region: string,
  domain: string
): Promise<LegalTable | null> {
  const { data, error } = await supabase
    .from('legal_tables')
    .select('*')
    .eq('year', year)
    .eq('region', region)
    .eq('domain', domain)
    .lte('effective_from', new Date().toISOString())
    .gte('effective_to', new Date().toISOString())
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllLegalTables(
  year: number,
  region: string
): Promise<LegalTable[]> {
  const { data, error } = await supabase
    .from('legal_tables')
    .select('*')
    .eq('year', year)
    .eq('region', region)
    .lte('effective_from', new Date().toISOString())
    .gte('effective_to', new Date().toISOString())
    .order('domain', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// MOTOR DE INFERÊNCIA
// ============================================================================

export async function inferDeductionRates(
  userId: string,
  contractId: string,
  grossSalary: number // em euros
): Promise<DeductionInferenceResult> {
  // Validar se o contractId é um UUID válido
  if (!isValidUUID(contractId)) {
    throw new Error('ID do contrato deve ser um UUID válido');
  }
  const warnings: string[] = [];
  
  // 1. Obter condições configuradas
  const conditions = await getDeductionConditions(userId, contractId);
  if (!conditions) {
    throw new Error('Condições de dedução não configuradas. Configure primeiro as condições na sub-página "Condições".');
  }

  const { year, region } = conditions;
  
  // 2. Obter todas as tabelas legais para o ano/região
  const legalTables = await getAllLegalTables(year, region);
  const tablesMap = new Map(legalTables.map(t => [t.domain, t]));
  
  // 3. Calcular taxa de Segurança Social
  const ssTable = tablesMap.get('ss_rates');
  let ssWorkerRate = 0.11; // Default
  
  if (ssTable?.payload) {
    const ssRates = ssTable.payload as SSRates;
    ssWorkerRate = ssRates.worker || 0.11;
  } else {
    warnings.push('Tabela de taxas de Segurança Social não encontrada. A usar taxa padrão de 11%.');
  }
  
  // 4. Calcular base de IRS (Bruto - SS trabalhador)
  const ssDeduction = grossSalary * ssWorkerRate;
  const baseIRS = grossSalary - ssDeduction;
  
  // 5. Calcular maritalForTables baseado no estado civil e modo de tributação
  let maritalForTables = conditions.marital_status;
  
  if ((conditions.marital_status === 'married' || conditions.marital_status === 'unido_de_facto') && 
      conditions.taxation_mode === 'conjunta') {
    maritalForTables = 'married';
  } else if (conditions.marital_status === 'unido_de_facto' && conditions.taxation_mode === 'separada') {
    maritalForTables = 'single';
  }
  
  // 6. Calcular taxa efetiva de IRS usando o estado civil resolvido
  const irsTableKey = `irs_withholding_${maritalForTables}`;
  let irsTable = tablesMap.get(irsTableKey);
  
  // Fallback para tabela genérica se não encontrar a específica
  if (!irsTable) {
    irsTable = tablesMap.get('irs_withholding');
  }
  
  let irsEffectiveRate = 0;
  
  if (irsTable?.payload) {
    const irsBrackets = (irsTable.payload as { brackets: IRSBracket[] }).brackets;
    irsEffectiveRate = calculateIRSRate(baseIRS, irsBrackets);
  } else {
    warnings.push('Tabela de retenção de IRS não encontrada. Mantenha o modo manual.');
  }
  
  // 7. Obter regras de horas extras
  const overtimeTable = tablesMap.get('overtime_rules');
  let overtimeMode = 'half_effective_rate';
  
  if (overtimeTable?.payload) {
    const overtimeRules = overtimeTable.payload as OvertimeRules;
    overtimeMode = overtimeRules.mode || 'half_effective_rate';
  }
  
  // 8. Obter limites de subsídio de alimentação
  const mealTable = tablesMap.get('meal_allowance_limits');
  let mealLimits: MealAllowanceLimits = { cashPerDay: 6.00, cardPerDay: 10.20 };
  
  if (mealTable?.payload) {
    mealLimits = mealTable.payload as MealAllowanceLimits;
  }
  
  return {
    ssWorkerRate,
    irsEffectiveRate,
    overtimeMode,
    mealLimits,
    baseIRS,
    warnings
  };
}

// ============================================================================
// CÁLCULO DE IRS
// ============================================================================

function calculateIRSRate(income: number, brackets: IRSBracket[]): number {
  if (!brackets || brackets.length === 0) return 0;
  
  let totalTax = 0;
  let remainingIncome = income;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const bracketMin = bracket.min;
    const bracketMax = bracket.max || Infinity;
    
    if (income <= bracketMin) break;
    
    const taxableInThisBracket = Math.min(
      remainingIncome,
      Math.max(0, Math.min(bracketMax, income) - bracketMin)
    );
    
    totalTax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
  }
  
  return income > 0 ? totalTax / income : 0;
}

// ============================================================================
// FEATURE FLAG E ESTADO AUTOMÁTICO
// ============================================================================

export function isAutoDeductionsEnabled(): boolean {
  // Feature flag para fallback rápido
  return import.meta.env.VITE_PAYROLL_AUTO_DEDUCTIONS === 'true';
}

// Função para obter o estado do modo automático por contrato
export async function getAutoDeductionsState(
  userId: string,
  contractId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('auto_deductions_enabled')
    .eq('user_id', userId)
    .eq('id', contractId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data?.auto_deductions_enabled || false;
}

// Função para definir o estado do modo automático por contrato
export async function setAutoDeductionsEnabled(
  userId: string,
  contractId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('payroll_contracts')
    .update({
      auto_deductions_enabled: enabled
    })
    .eq('user_id', userId)
    .eq('id', contractId);

  if (error) throw error;
}

// ============================================================================
// EXPORTAÇÃO AGREGADA
// ============================================================================

export const deductionInferenceService = {
  getDeductionConditions,
  upsertDeductionConditions,
  updateDeductionConditions,
  getLegalTable,
  getAllLegalTables,
  inferDeductionRates,
  isAutoDeductionsEnabled,
  getAutoDeductionsState,
  setAutoDeductionsEnabled
};