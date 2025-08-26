// Serviço de API para o módulo de folha de pagamento
// Operações CRUD e RPC para todas as entidades do payroll

import { supabase } from '../../../lib/supabaseClient';
import {
  PayrollContract,
  PayrollOTPolicy,
  PayrollHoliday,
  PayrollVacation,
  PayrollMealAllowanceConfig,
  PayrollTimeEntry,
  PayrollMileagePolicy,
  PayrollMileageTrip,
  PayrollPeriod,
  PayrollItem,
  PayrollPayslip,
  PayrollLeave,
  ContractFormData,
  OTPolicyFormData,
  HolidayFormData,
  PayrollHolidayFormData,
  PayrollVacationFormData,
  PayrollMealAllowanceConfigFormData,
  PayrollDeductionConfig,
  PayrollDeductionConfigFormData,
  PayrollLeaveFormData,
  MileagePolicyFormData,
  PayrollCalculation
} from '../types';
import { eurosToCents, centsToEuros, calculateHourlyRate } from '../lib/calc';

// ============================================================================
// CONTRATOS
// ============================================================================

export async function getContracts(userId: string): Promise<PayrollContract[]> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((c: any) => ({
    ...c,
    weekly_hours: c?.weekly_hours === null || c?.weekly_hours === undefined
      ? c?.weekly_hours
      : (typeof c.weekly_hours === 'number' ? c.weekly_hours : parseFloat(c.weekly_hours))
  }));
}

export async function getActiveContract(userId: string): Promise<PayrollContract | null> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return data;
  // Normalizar weekly_hours para número
  return {
    ...data,
    weekly_hours: (data as any)?.weekly_hours === null || (data as any)?.weekly_hours === undefined
      ? (data as any)?.weekly_hours
      : (typeof (data as any).weekly_hours === 'number' ? (data as any).weekly_hours : parseFloat((data as any).weekly_hours))
  } as PayrollContract;
}

export async function createContract(
  userId: string,
  contractData: ContractFormData,
  familyId?: string
): Promise<PayrollContract> {
  // Calcular hourly_rate_cents automaticamente
  const hourlyRateCents = calculateHourlyRate(
    contractData.base_salary_cents,
    contractData.schedule_json
  );

  const insertData = {
    user_id: userId,
    family_id: familyId || null,
    name: contractData.name,
    base_salary_cents: contractData.base_salary_cents,
    hourly_rate_cents: hourlyRateCents,
    currency: contractData.currency,
    // Garantir número para weekly_hours
    weekly_hours: (contractData as any).weekly_hours !== undefined && (contractData as any).weekly_hours !== null
      ? (typeof (contractData as any).weekly_hours === 'string' 
        ? parseFloat((contractData as any).weekly_hours)
        : (contractData as any).weekly_hours)
      : null,
    schedule_json: contractData.schedule_json,
    meal_allowance_cents_per_day: contractData.meal_allowance_cents_per_day,
    meal_on_worked_days: contractData.meal_on_worked_days,
    vacation_bonus_mode: contractData.vacation_bonus_mode,
    christmas_bonus_mode: contractData.christmas_bonus_mode,
    is_active: contractData.is_active
  };
  
  const { data, error } = await supabase
    .from('payroll_contracts')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as PayrollContract;
}

export async function updateContract(
  id: string,
  contractData: Partial<ContractFormData>
): Promise<PayrollContract> {
  // Verificar utilizador autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // Verificar se o contrato existe e pertence ao utilizador
  const { data: existingContract, error: fetchError } = await supabase
    .from('payroll_contracts')
    .select('id, user_id, name')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    throw new Error(`Erro ao buscar contrato: ${fetchError.message}`);
  }
  
  if (!existingContract) {
    throw new Error('Contrato não encontrado');
  }
  
  if (existingContract.user_id !== user?.id) {
    throw new Error('Não autorizado a editar este contrato');
  }
  
  // Preparar dados com conversões de tipo adequadas
  const updateData: any = {
    ...contractData,
    updated_at: new Date().toISOString()
  };
  
  // Garantir que weekly_hours é um número
  if (updateData.weekly_hours !== undefined) {
    updateData.weekly_hours = typeof updateData.weekly_hours === 'string' 
      ? parseFloat(updateData.weekly_hours) 
      : updateData.weekly_hours;
  }
  
  // Calcular hourly_rate_cents se base_salary_cents ou weekly_hours foram alterados
  if (updateData.base_salary_cents !== undefined || updateData.weekly_hours !== undefined) {
    // Obter valores atuais do contrato se não foram fornecidos
    const baseSalaryCents = updateData.base_salary_cents ?? existingContract.base_salary_cents;
    const weeklyHours = updateData.weekly_hours ?? existingContract.weekly_hours;
    
    if (baseSalaryCents && existingContract.schedule_json) {
      updateData.hourly_rate_cents = calculateHourlyRate(baseSalaryCents, existingContract.schedule_json);
    }
  }
  
  const { data, error } = await supabase
    .from('payroll_contracts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  
  return data;
}

export async function deactivateContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_contracts')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_contracts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// POLÍTICAS DE HORAS EXTRAS
// ============================================================================

export async function getOTPolicies(userId: string): Promise<PayrollOTPolicy[]> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveOTPolicy(userId: string): Promise<PayrollOTPolicy | null> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createOTPolicy(
  userId: string,
  policyData: OTPolicyFormData
): Promise<PayrollOTPolicy> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .insert({
      user_id: userId,
      name: policyData.name,
      day_multiplier: policyData.firstHourMultiplier,
      night_multiplier: policyData.subsequentHoursMultiplier,
      weekend_multiplier: policyData.weekendMultiplier,
      holiday_multiplier: policyData.holidayMultiplier,
      night_start: policyData.nightStartTime,
      night_end: policyData.nightEndTime,
      rounding_minutes: policyData.roundingMinutes,
      daily_limit_hours: policyData.dailyLimitHours,
      annual_limit_hours: policyData.annualLimitHours,
      weekly_limit_hours: policyData.weeklyLimitHours,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOTPolicy(
  id: string,
  policyData: Partial<OTPolicyFormData>
): Promise<PayrollOTPolicy> {
  const updateData: any = {};
  
  if (policyData.name !== undefined) updateData.name = policyData.name;
  if (policyData.firstHourMultiplier !== undefined) updateData.day_multiplier = policyData.firstHourMultiplier;
  if (policyData.subsequentHoursMultiplier !== undefined) updateData.night_multiplier = policyData.subsequentHoursMultiplier;
  if (policyData.weekendMultiplier !== undefined) updateData.weekend_multiplier = policyData.weekendMultiplier;
  if (policyData.holidayMultiplier !== undefined) updateData.holiday_multiplier = policyData.holidayMultiplier;
  if (policyData.nightStartTime !== undefined) updateData.night_start = policyData.nightStartTime;
  if (policyData.nightEndTime !== undefined) updateData.night_end = policyData.nightEndTime;
  if (policyData.roundingMinutes !== undefined) updateData.rounding_minutes = policyData.roundingMinutes;
  if (policyData.dailyLimitHours !== undefined) updateData.daily_limit_hours = policyData.dailyLimitHours;
  if (policyData.annualLimitHours !== undefined) updateData.annual_limit_hours = policyData.annualLimitHours;
  if (policyData.weeklyLimitHours !== undefined) updateData.weekly_limit_hours = policyData.weeklyLimitHours;

  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertOTPolicy(
  userId: string,
  policyData: OTPolicyFormData
): Promise<PayrollOTPolicy> {
  const insertData: any = {
    user_id: userId,
    name: policyData.name,
    description: policyData.description,
    is_active: policyData.isActive,
    overtime_rate: policyData.overtimeRate,
    double_overtime_rate: policyData.doubleOvertimeRate,
    daily_limit_hours: policyData.dailyLimitHours,
    weekly_limit_hours: policyData.weeklyLimitHours,
    annual_limit_hours: policyData.annualLimitHours
  };

  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .upsert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// FERIADOS
// ============================================================================

export async function getHolidays(
  userId: string,
  year?: number
): Promise<PayrollHoliday[]> {
  let query = supabase
    .from('payroll_holidays')
    .select('*')
    .eq('user_id', userId);

  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);
  }

  const { data, error } = await query.order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHoliday(
  userId: string,
  holidayData: PayrollHolidayFormData
): Promise<PayrollHoliday> {
  const { data, error } = await supabase
    .from('payroll_holidays')
    .insert({
      user_id: userId,
      ...holidayData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHoliday(
  id: string,
  holidayData: Partial<PayrollHolidayFormData>
): Promise<PayrollHoliday> {
  const { data, error } = await supabase
    .from('payroll_holidays')
    .update(holidayData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_holidays')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// FÉRIAS
// ============================================================================

export async function getVacations(
  userId: string,
  contractId?: string,
  year?: number
): Promise<PayrollVacation[]> {
  let query = supabase
    .from('payroll_vacations')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte('start_date', startDate).lte('end_date', endDate);
  }

  const { data, error } = await query.order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createVacation(
  userId: string,
  contractId: string,
  vacationData: PayrollVacationFormData
): Promise<PayrollVacation> {
  const { data, error } = await supabase
    .from('payroll_vacations')
    .insert({
      user_id: userId,
      contract_id: contractId,
      ...vacationData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVacation(
  id: string,
  vacationData: Partial<PayrollVacationFormData>
): Promise<PayrollVacation> {
  const { data, error } = await supabase
    .from('payroll_vacations')
    .update(vacationData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVacation(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_vacations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Funções para períodos de férias
export async function upsertVacationPeriods(
  userId: string,
  periods: any[]
): Promise<any[]> {
  // Primeiro, remover todos os períodos existentes do utilizador
  await supabase
    .from('payroll_vacation_periods')
    .delete()
    .eq('user_id', userId);

  // Depois, inserir os novos períodos com mapeamento correto dos campos
  const periodsWithUserId = periods.map(period => ({
    user_id: userId,
    start_date: period.startDate,
    end_date: period.endDate,
    description: period.description,
    contract_id: period.contract_id // Este será adicionado pelo contexto
  }));

  const { data, error } = await supabase
    .from('payroll_vacation_periods')
    .insert(periodsWithUserId)
    .select();

  if (error) throw error;
  return data || [];
}

export async function deleteVacationPeriods(userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_vacation_periods')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================================================
// CONFIGURAÇÃO DE SUBSÍDIO DE ALIMENTAÇÃO
// ============================================================================

export async function getMealAllowanceConfig(
  userId: string,
  contractId: string
): Promise<PayrollMealAllowanceConfig | null> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createMealAllowanceConfig(
  userId: string,
  contractId: string,
  configData: PayrollMealAllowanceConfigFormData
): Promise<PayrollMealAllowanceConfig> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .insert({
      user_id: userId,
      contract_id: contractId,
      daily_amount_cents: eurosToCents(configData.dailyAmount),
      excluded_months: configData.excluded_months,
      payment_method: configData.paymentMethod,
      duodecimos_enabled: configData.duodecimosEnabled
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMealAllowanceConfig(
  id: string,
  configData: Partial<PayrollMealAllowanceConfigFormData>
): Promise<PayrollMealAllowanceConfig> {
  const updateData: any = {};
  
  if (configData.dailyAmount !== undefined) {
    updateData.daily_amount_cents = eurosToCents(configData.dailyAmount);
  }
  if (configData.excluded_months !== undefined) {
    updateData.excluded_months = configData.excluded_months;
  }
  if (configData.paymentMethod !== undefined) {
    updateData.payment_method = configData.paymentMethod;
  }
  if (configData.duodecimosEnabled !== undefined) {
    updateData.duodecimos_enabled = configData.duodecimosEnabled;
  }
  
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertMealAllowanceConfig(
  userId: string,
  contractId: string,
  configData: PayrollMealAllowanceConfigFormData
): Promise<PayrollMealAllowanceConfig> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .upsert({
      user_id: userId,
      contract_id: contractId,
      daily_amount_cents: eurosToCents(configData.dailyAmount),
      excluded_months: configData.excluded_months,
      payment_method: configData.paymentMethod
    }, {
      onConflict: 'user_id,contract_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// CONFIGURAÇÃO DE DESCONTOS
// ============================================================================

export async function getDeductionConfig(
  userId: string,
  contractId: string
): Promise<PayrollDeductionConfig | null> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createDeductionConfig(
  userId: string,
  contractId: string,
  configData: PayrollDeductionConfigFormData
): Promise<PayrollDeductionConfig> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .insert({
      user_id: userId,
      contract_id: contractId,
      irs_percentage: configData.irsPercentage,
      social_security_percentage: configData.socialSecurityPercentage,
      irs_surcharge_percentage: configData.irsSurchargePercentage || 0,
      solidarity_contribution_percentage: configData.solidarityContributionPercentage || 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeductionConfig(
  id: string,
  configData: Partial<PayrollDeductionConfigFormData>
): Promise<PayrollDeductionConfig> {
  const updateData: any = {};
  
  if (configData.irsPercentage !== undefined) {
    updateData.irs_percentage = configData.irsPercentage;
  }
  if (configData.socialSecurityPercentage !== undefined) {
    updateData.social_security_percentage = configData.socialSecurityPercentage;
  }
  if (configData.irsSurchargePercentage !== undefined) {
    updateData.irs_surcharge_percentage = configData.irsSurchargePercentage;
  }
  if (configData.solidarityContributionPercentage !== undefined) {
    updateData.solidarity_contribution_percentage = configData.solidarityContributionPercentage;
  }
  
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertDeductionConfig(
  userId: string,
  contractId: string,
  configData: PayrollDeductionConfigFormData
): Promise<PayrollDeductionConfig> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .upsert({
      user_id: userId,
      contract_id: contractId,
      irs_percentage: configData.irsPercentage,
      social_security_percentage: configData.socialSecurityPercentage,
      irs_surcharge_percentage: configData.irsSurchargePercentage || 0,
      solidarity_contribution_percentage: configData.solidarityContributionPercentage || 0
    }, {
      onConflict: 'user_id,contract_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// ENTRADAS DE TEMPO
// ============================================================================

export async function getTimeEntries(
  userId: string,
  startDate?: string,
  endDate?: string,
  contractId?: string
): Promise<PayrollTimeEntry[]> {
  let query = supabase
    .from('payroll_time_entries')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTimeEntriesByContract(
  userId: string,
  contractId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollTimeEntry[]> {
  return getTimeEntries(userId, startDate, endDate, contractId);
}

export async function createTimeEntry(
  userId: string,
  contractId: string,
  entryData: Omit<PayrollTimeEntry, 'id' | 'user_id' | 'contract_id' | 'created_at' | 'updated_at'>
): Promise<PayrollTimeEntry> {
  const { data, error } = await supabase
    .from('payroll_time_entries')
    .insert({
      user_id: userId,
      contract_id: contractId,
      ...entryData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTimeEntry(
  id: string,
  entryData: Partial<PayrollTimeEntry>
): Promise<PayrollTimeEntry> {
  const { data, error } = await supabase
    .from('payroll_time_entries')
    .update(entryData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_time_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// POLÍTICAS DE QUILOMETRAGEM
// ============================================================================

export async function getMileagePolicies(userId: string): Promise<PayrollMileagePolicy[]> {
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllMileagePolicies(userId: string): Promise<PayrollMileagePolicy[]> {
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveMileagePolicy(userId: string): Promise<PayrollMileagePolicy | null> {
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createMileagePolicy(
  userId: string,
  policyData: MileagePolicyFormData
): Promise<PayrollMileagePolicy> {
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .insert({
      user_id: userId,
      name: policyData.name,
      rate_per_km_cents: eurosToCents(policyData.rate_per_km),
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertMileagePolicy(
  userId: string,
  policyData: any
): Promise<PayrollMileagePolicy> {
  // Verificar se há dados obrigatórios antes de tentar guardar
  if (!policyData.rate_per_km || policyData.rate_per_km <= 0) {
    throw new Error('Taxa por quilómetro é obrigatória e deve ser maior que 0');
  }

  // Mapear campos do formulário para campos da base de dados
  const dbData = {
    user_id: userId,
    name: policyData.name || 'Política de Quilometragem',
    rate_per_km_cents: eurosToCents(policyData.rate_per_km),
    monthly_cap_cents: policyData.monthly_cap ? eurosToCents(policyData.monthly_cap) : null,
    requires_origin_destination: policyData.requires_origin_destination || false,
    requires_purpose: policyData.requires_purpose || false,
    is_active: policyData.is_active !== undefined ? policyData.is_active : true
  };

  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .upsert(dbData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateMileagePolicy(userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_mileage_policies')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function updateMileagePolicy(
  id: string,
  policyData: Partial<MileagePolicyFormData>
): Promise<PayrollMileagePolicy> {
  const updateData: any = {};
  
  if (policyData.name !== undefined) {
    updateData.name = policyData.name;
  }
  if (policyData.rate_per_km !== undefined) {
    updateData.rate_per_km_cents = eurosToCents(policyData.rate_per_km);
  }

  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMileagePolicy(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_mileage_policies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// VIAGENS DE QUILOMETRAGEM
// ============================================================================

export async function getMileageTrips(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollMileageTrip[]> {
  let query = supabase
    .from('payroll_mileage_trips')
    .select(`
      *,
      payroll_mileage_policies!inner(
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('payroll_mileage_policies.is_active', true);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMileageTrip(
  userId: string,
  policyId: string,
  tripData: Omit<PayrollMileageTrip, 'id' | 'user_id' | 'policy_id' | 'created_at' | 'updated_at'>
): Promise<PayrollMileageTrip> {
  const { data, error } = await supabase
    .from('payroll_mileage_trips')
    .insert({
      user_id: userId,
      policy_id: policyId,
      ...tripData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMileageTrip(
  id: string,
  tripData: Partial<PayrollMileageTrip>
): Promise<PayrollMileageTrip> {
  const { data, error } = await supabase
    .from('payroll_mileage_trips')
    .update(tripData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMileageTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_mileage_trips')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// PERÍODOS DE FOLHA DE PAGAMENTO
// ============================================================================

export async function getPayrollPeriods(
  userId: string,
  contractId?: string
): Promise<PayrollPeriod[]> {
  let query = supabase
    .from('payroll_periods')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPayrollPeriod(
  userId: string,
  contractId: string,
  year: number,
  month: number
): Promise<PayrollPeriod | null> {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createPayrollPeriod(
  userId: string,
  contractId: string,
  year: number,
  month: number
): Promise<PayrollPeriod> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      user_id: userId,
      contract_id: contractId,
      year,
      month,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'draft',
      total_hours: 0,
      overtime_hours: 0,
      total_amount_cents: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// RPC - RECÁLCULO DE FOLHA DE PAGAMENTO
// ============================================================================

export async function recalculatePayroll(
  userId: string,
  contractId: string,
  year: number,
  month: number
): Promise<PayrollCalculation> {
  // Esta função seria implementada como uma RPC no Supabase
  // Por agora, implementamos a lógica no cliente
  
  try {
    // Buscar dados necessários
    const [contract, otPolicy, holidays, timeEntries, mileageTrips, mileagePolicy, deductionConfig, mealAllowanceConfig] = await Promise.all([
      getContract(userId, contractId),
      getOTPolicy(userId),
      getHolidays(userId, year),
      getTimeEntries(userId, `${year}-${month.toString().padStart(2, '0')}-01`, `${year}-${month.toString().padStart(2, '0')}-31`, contractId),
      getMileageTrips(userId, `${year}-${month.toString().padStart(2, '0')}-01`, `${year}-${month.toString().padStart(2, '0')}-31`),
      getActiveMileagePolicy(userId),
      getDeductionConfig(userId, contractId),
      getMealAllowanceConfig(userId, contractId).catch(() => null)
    ]);

    if (!contract) throw new Error('Contrato não encontrado');
    if (!otPolicy) throw new Error('Política de horas extras não encontrada');

    // Importar função de cálculo
    const { calcMonth } = await import('../lib/calc');
    
    const mileageRate = mileagePolicy?.rate_per_km_cents || 36; // €0.36 padrão
    
    const calculation = calcMonth(
      contract,
      timeEntries,
      otPolicy,
      holidays,
      mileageTrips,
      mileageRate,
      mealAllowanceConfig ? { 
        excluded_months: mealAllowanceConfig.excluded_months, 
        daily_amount_cents: mealAllowanceConfig.daily_amount_cents,
        payment_method: mealAllowanceConfig.payment_method,
        duodecimos_enabled: mealAllowanceConfig.duodecimos_enabled
      } : undefined,
      [], // vacations
      undefined, // weeklyHours
      undefined, // annualOvertimeHours
      deductionConfig ? { irs_percentage: deductionConfig.irs_percentage, social_security_percentage: deductionConfig.social_security_percentage } : undefined
    );

    // Atualizar período com os novos valores
    const period = await getPayrollPeriod(userId, contractId, year, month);
    if (period) {
      await supabase
        .from('payroll_periods')
        .update({
          total_hours: calculation.regularHours + calculation.overtimeHours,
          overtime_hours: calculation.overtimeHours,
          total_amount_cents: calculation.netPay,
          status: 'calculated'
        })
        .eq('id', period.id);
    }

    return calculation;
  } catch (error) {
    console.error('Erro ao recalcular folha de pagamento:', error);
    throw error;
  }
}

// ============================================================================
// IMPORTAÇÃO CSV
// ============================================================================

export async function importTimeEntriesFromCSV(
  userId: string,
  contractId: string,
  csvData: string
): Promise<{ success: number; errors: string[] }> {
  const lines = csvData.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const results = {
    success: 0,
    errors: [] as string[]
  };

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim());
      const entry: any = {};
      
      headers.forEach((header, index) => {
        entry[header] = values[index];
      });

      // Validar campos obrigatórios
      if (!entry.date || !entry.start_time || !entry.end_time) {
        results.errors.push(`Linha ${i + 1}: Campos obrigatórios em falta`);
        continue;
      }

      await createTimeEntry(userId, contractId, {
        date: entry.date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        break_minutes: parseInt(entry.break_minutes || '0'),
        description: entry.description || '',
        is_overtime: entry.is_overtime === 'true' || entry.is_overtime === '1'
      });

      results.success++;
    } catch (error) {
      results.errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  return results;
}

// Objeto agregador para facilitar os testes e importações
export const payrollService = {
  // Contratos
  getContracts,
  getPayrollContracts: getContracts, // Alias para compatibilidade com testes
  getActiveContract,
  createContract,
  createPayrollContract: createContract, // Alias para compatibilidade com testes
  updateContract,
  updatePayrollContract: updateContract, // Alias para compatibilidade com testes
  deactivateContract,
  deleteContract,
  deletePayrollContract: deleteContract, // Alias para compatibilidade com testes
  
  // Políticas OT
  getOTPolicies,
  getPayrollOTPolicies: getOTPolicies, // Alias para compatibilidade com testes
  getActiveOTPolicy,
  createOTPolicy,
  createPayrollOTPolicy: createOTPolicy, // Alias para compatibilidade com testes
  updateOTPolicy,
  upsertOTPolicy,
  
  // Feriados
  getHolidays,
  getPayrollHolidays: getHolidays, // Alias para compatibilidade com testes
  createHoliday,
  createPayrollHoliday: createHoliday, // Alias para compatibilidade com testes
  updateHoliday,
  deleteHoliday,
  
  // Férias
  getVacations,
  createVacation,
  updateVacation,
  deleteVacation,
  upsertVacationPeriods,
  deleteVacationPeriods,
  
  // Configuração de subsídio de alimentação
  getMealAllowanceConfig,
  createMealAllowanceConfig,
  updateMealAllowanceConfig,
  upsertMealAllowanceConfig,
  
  // Configuração de descontos
  getDeductionConfig,
  createDeductionConfig,
  updateDeductionConfig,
  upsertDeductionConfig,
  
  // Entradas de tempo
  getTimeEntries,
  getTimeEntriesByContract,
  getPayrollTimeEntries: getTimeEntries, // Alias para compatibilidade com testes
  createTimeEntry,
  createPayrollTimeEntry: createTimeEntry, // Alias para compatibilidade com testes
  bulkCreatePayrollTimeEntries: async (entries: Omit<PayrollTimeEntry, 'id' | 'created_at' | 'updated_at'>[]) => {
    const results = [];
    for (const entry of entries) {
      const result = await createTimeEntry(entry.user_id, entry.contract_id, {
        date: entry.date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        break_minutes: entry.break_minutes,
        description: entry.description,
        is_overtime: entry.is_overtime,
        is_holiday: entry.is_holiday,
        is_sick: entry.is_sick,
        is_vacation: entry.is_vacation,
        is_exception: entry.is_exception
      });
      results.push(result);
    }
    return results;
  },
  updateTimeEntry,
  deleteTimeEntry,
  
  // Políticas de quilometragem
  getMileagePolicies,
  getAllMileagePolicies,
  getPayrollMileagePolicies: getMileagePolicies, // Alias para compatibilidade com testes
  getActiveMileagePolicy,
  createMileagePolicy,
  createPayrollMileagePolicy: createMileagePolicy, // Alias para compatibilidade com testes
  upsertMileagePolicy,
  updateMileagePolicy,
  deactivateMileagePolicy,
  deleteMileagePolicy,
  
  // Viagens
  getMileageTrips,
  getPayrollMileageTrips: getMileageTrips, // Alias para compatibilidade com testes
  createMileageTrip,
  createPayrollMileageTrip: createMileageTrip, // Alias para compatibilidade com testes
  updateMileageTrip,
  deleteMileageTrip,
  
  // Períodos de folha de pagamento
  getPayrollPeriods,
  getPayrollPeriod,
  createPayrollPeriod,
  recalculatePayroll,
  
  // Importação
  importTimeEntriesFromCSV,
  
  // Período experimental
  upsertProbationConfig
};

// ============================================================================
// PERÍODO EXPERIMENTAL
// ============================================================================

export async function upsertProbationConfig(
  contractId: string,
  probationData: {
    hasProbationPeriod: boolean;
    durationDays?: number;
    contractType?: string;
    jobComplexity?: string;
    isFirstJob?: boolean;
    isLongTermUnemployed?: boolean;
    hasWrittenCommunication?: boolean;
    conditions?: string;
  }
): Promise<void> {
  // Verificar utilizador autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Utilizador não autenticado');
  }

  // Verificar se o contrato existe e pertence ao utilizador
  const { data: existingContract, error: fetchError } = await supabase
    .from('payroll_contracts')
    .select('id, user_id')
    .eq('id', contractId)
    .single();

  if (fetchError || !existingContract) {
    throw new Error('Contrato não encontrado');
  }

  if (existingContract.user_id !== user.id) {
    throw new Error('Não autorizado a editar este contrato');
  }

  // Preparar dados para atualização
  const updateData: any = {
    has_probation_period: probationData.hasProbationPeriod,
    updated_at: new Date().toISOString()
  };

  // Adicionar duração se o período experimental estiver ativo
  if (probationData.hasProbationPeriod && probationData.durationDays) {
    updateData.probation_duration_days = probationData.durationDays;
  } else {
    updateData.probation_duration_days = null;
  }

  // Adicionar configurações adicionais como JSON
  if (probationData.hasProbationPeriod) {
    updateData.probation_config = {
      contractType: probationData.contractType,
      jobComplexity: probationData.jobComplexity,
      isFirstJob: probationData.isFirstJob || false,
      isLongTermUnemployed: probationData.isLongTermUnemployed || false,
      hasWrittenCommunication: probationData.hasWrittenCommunication || false,
      conditions: probationData.conditions || ''
    };
  } else {
    updateData.probation_config = null;
  }

  // Atualizar o contrato
  const { error } = await supabase
    .from('payroll_contracts')
    .update(updateData)
    .eq('id', contractId);

  if (error) {
    throw error;
  }
}

// ============================================================================
// LICENÇAS ESPECIAIS E PARENTAIS
// ============================================================================

export async function getLeaves(userId: string): Promise<PayrollLeave[]> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLeave(id: string): Promise<PayrollLeave | null> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createLeave(userId: string, leaveData: PayrollLeaveFormData): Promise<PayrollLeave> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .insert({
      user_id: userId,
      ...leaveData,
      status: 'pending',
      medical_certificate: leaveData.medical_certificate || false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeave(id: string, leaveData: Partial<PayrollLeaveFormData>): Promise<PayrollLeave> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .update({
      ...leaveData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLeave(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_leaves')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function approveLeave(id: string, approvedBy: string): Promise<PayrollLeave> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectLeave(id: string, approvedBy: string): Promise<PayrollLeave> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .update({
      status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Função para verificar sobreposição de licenças
export async function checkLeaveOverlap(
  userId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('payroll_leaves')
    .select('id')
    .eq('user_id', userId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).length > 0;
}