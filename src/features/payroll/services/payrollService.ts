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
import { holidayAutoService } from './holidayAutoService';

/**
 * Calcula o último dia do mês corretamente
 * @param year Ano
 * @param month Mês (1-12)
 * @returns String no formato YYYY-MM-DD do último dia do mês
 */
function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
}

// ============================================================================
// CONTRATOS
// ============================================================================

export async function getContracts(userId: string): Promise<PayrollContract[]> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  
  const result = (data || []).map((c: any) => ({
    ...c,
    weekly_hours: c?.weekly_hours === null || c?.weekly_hours === undefined
      ? c?.weekly_hours
      : (typeof c.weekly_hours === 'number' ? c.weekly_hours : parseFloat(c.weekly_hours))
  }));
  
  return result;
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

export async function getContract(userId: string, contractId: string): Promise<PayrollContract | null> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', contractId)
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
  // Verificar se o utilizador está autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    throw new Error(`Erro de autenticação: ${authError.message}`);
  }
  
  if (!user) {
    throw new Error('Utilizador não autenticado');
  }
  
  if (user.id !== userId) {
    throw new Error('ID do utilizador não corresponde ao utilizador autenticado');
  }
  
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
    vacation_bonus_mode: contractData.vacation_bonus_mode,
    christmas_bonus_mode: contractData.christmas_bonus_mode,
    is_active: contractData.is_active,
    // Novos campos
    job_category: contractData.job_category || null,
    workplace_location: contractData.workplace_location || null,
    duration: contractData.duration || null,
    has_probation_period: contractData.has_probation_period || false,
    probation_duration_days: contractData.probation_duration_days || null
  };
  
  const { data, error } = await supabase
    .from('payroll_contracts')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw error;
  }
  
  const contract = data as PayrollContract;
  
  // Sincronizar feriados nacionais automaticamente na criação do contrato
  try {
    const currentYear = new Date().getFullYear();
    await holidayAutoService.syncNationalHolidays(
      userId,
      contract.id,
      currentYear
    );
    console.log('Feriados nacionais sincronizados com sucesso na criação do contrato');
  } catch (holidayError) {
    console.warn('Erro ao sincronizar feriados nacionais no createContract:', holidayError);
    // Não bloquear a criação do contrato por erro nos feriados
  }
  
  return contract;
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
    .select('*')
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
  
  // Calcular hourly_rate_cents se base_salary_cents ou schedule_json foram alterados
  if (updateData.base_salary_cents !== undefined || updateData.schedule_json !== undefined) {
    // Obter valores atuais do contrato se não foram fornecidos
    const baseSalaryCents = updateData.base_salary_cents ?? existingContract.base_salary_cents;
    const scheduleJson = updateData.schedule_json ?? existingContract.schedule_json;
    
    if (baseSalaryCents && scheduleJson) {
      updateData.hourly_rate_cents = calculateHourlyRate(baseSalaryCents, scheduleJson);
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
  
  const updatedContract = data;
  
  // Sincronizar feriados regionais/municipais se workplace_location foi definido ou atualizado
  if (contractData.workplace_location && contractData.workplace_location.trim() !== '' && 
      contractData.workplace_location !== existingContract.workplace_location) {
    try {
      const isSupported = holidayAutoService.isLocationSupported(contractData.workplace_location);
      if (isSupported) {
        const currentYear = new Date().getFullYear();
        await holidayAutoService.syncRegionalHolidays(
          existingContract.user_id,
          id,
          currentYear,
          contractData.workplace_location
        );
        console.log('Feriados regionais/municipais sincronizados com sucesso na atualização do contrato');
      } else {
        console.warn('Localização não suportada para sincronização de feriados regionais:', contractData.workplace_location);
      }
    } catch (holidayError) {
      console.warn('Erro ao sincronizar feriados regionais/municipais no updateContract:', holidayError);
      // Não bloquear a atualização do contrato por erro nos feriados
    }
  }
  
  return updatedContract;
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

export async function getOTPolicies(userId: string, contractId?: string): Promise<PayrollOTPolicy[]> {
  let query = supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveOTPolicy(userId: string, contractId?: string): Promise<PayrollOTPolicy | null> {
  let query = supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createOTPolicy(
  userId: string,
  policyData: OTPolicyFormData,
  contractId?: string
): Promise<PayrollOTPolicy> {
  // Se não foi fornecido contractId, buscar o contrato ativo do utilizador
  let finalContractId = contractId;
  if (!finalContractId) {
    const activeContract = await getActiveContract(userId);
    if (!activeContract) {
      throw new Error('Nenhum contrato ativo encontrado. É necessário ter um contrato ativo para criar políticas de horas extras.');
    }
    finalContractId = activeContract.id;
  }

  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .insert({
      user_id: userId,
      contract_id: finalContractId,
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
  policyData: Partial<OTPolicyFormData>,
  userId?: string,
  contractId?: string
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

  let query = supabase
    .from('payroll_ot_policies')
    .update(updateData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteOTPolicy(
  id: string,
  userId?: string,
  contractId?: string
): Promise<void> {
  let query = supabase
    .from('payroll_ot_policies')
    .delete()
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

  if (error) throw error;
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
  year?: number,
  contractId?: string
): Promise<PayrollHoliday[]> {
  let query = supabase
    .from('payroll_holidays')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

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
  holidayData: PayrollHolidayFormData,
  contractId?: string
): Promise<PayrollHoliday> {
  // Se contractId for fornecido, usar esse; caso contrário, usar o do holidayData ou buscar contrato ativo
  let finalContractId = contractId || holidayData.contract_id;
  if (!finalContractId) {
    const activeContract = await getActiveContract(userId);
    if (!activeContract) {
      throw new Error('Nenhum contrato ativo encontrado. É necessário ter um contrato ativo para criar feriados.');
    }
    finalContractId = activeContract.id;
  }

  const { data, error } = await supabase
    .from('payroll_holidays')
    .insert({
      user_id: userId,
      contract_id: finalContractId,
      name: holidayData.name,
      date: holidayData.date,
      holiday_type: holidayData.holiday_type,
      is_paid: holidayData.is_paid,
      affects_overtime: holidayData.affects_overtime,
      description: holidayData.description
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHoliday(
  id: string,
  holidayData: Partial<PayrollHolidayFormData>,
  userId?: string,
  contractId?: string
): Promise<PayrollHoliday> {
  let query = supabase
    .from('payroll_holidays')
    .update(holidayData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteHoliday(
  id: string,
  userId?: string,
  contractId?: string
): Promise<void> {
  let query = supabase
    .from('payroll_holidays')
    .delete()
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

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
  console.log('🔍 DEBUG getVacations called with:', { userId, contractId, year });
  
  let query = supabase
    .from('payroll_vacations')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    console.log('🔍 DEBUG: Adding contractId filter:', contractId);
    query = query.eq('contract_id', contractId);
  }

  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    console.log('🔍 DEBUG: Adding year filter:', { startDate, endDate });
    query = query.gte('start_date', startDate).lte('end_date', endDate);
  }

  const { data, error } = await query.order('start_date', { ascending: true });

  console.log('🔍 DEBUG getVacations result:', { data, error, dataLength: data?.length });
  
  if (error) {
    console.error('🔍 DEBUG getVacations error:', error);
    throw error;
  }
  return data || [];
}

export async function createVacation(
  userId: string,
  contractId: string,
  vacationData: PayrollVacationFormData
): Promise<PayrollVacation> {
  console.log('🔍 DEBUG payrollService.createVacation called with:', {
    userId,
    contractId,
    vacationData
  });
  
  const insertData = {
    user_id: userId,
    contract_id: contractId,
    ...vacationData
  };
  
  console.log('🔍 DEBUG Insert data:', insertData);
  
  const { data, error } = await supabase
    .from('payroll_vacations')
    .insert(insertData)
    .select()
    .single();

  console.log('🔍 DEBUG Supabase response:', { data, error });
  
  if (error) {
    console.error('🔍 DEBUG Supabase error:', error);
    throw error;
  }
  
  console.log('🔍 DEBUG createVacation returning:', data);
  return data;
}

export async function updateVacation(
  id: string,
  vacationData: Partial<PayrollVacationFormData>,
  userId?: string,
  contractId?: string
): Promise<PayrollVacation> {
  console.log('🔍 DEBUG payrollService.updateVacation called with:', {
    id,
    vacationData,
    userId,
    contractId
  });
  
  let query = supabase
    .from('payroll_vacations')
    .update(vacationData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  console.log('🔍 DEBUG Supabase response:', { data, error });
  
  if (error) {
    console.error('🔍 DEBUG Supabase error:', error);
    throw error;
  }
  
  console.log('🔍 DEBUG updateVacation returning:', data);
  return data;
}

export async function deleteVacation(
  id: string,
  userId?: string,
  contractId?: string
): Promise<void> {
  let query = supabase
    .from('payroll_vacations')
    .delete()
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

  if (error) throw error;
}



// ============================================================================
// CONFIGURAÇÃO DE SUBSÍDIO DE ALIMENTAÇÃO
// ============================================================================

export async function getMealAllowanceConfig(
  userId: string,
  contractId: string
): Promise<PayrollMealAllowanceConfig | null> {
  console.log('🔍 getMealAllowanceConfig - Procurando configuração para:', { userId, contractId });
  
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ getMealAllowanceConfig - Erro na consulta:', error);
    throw error;
  }
  
  console.log('🔍 getMealAllowanceConfig - Resultado:', data);
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
  configData: Partial<PayrollMealAllowanceConfigFormData>,
  userId?: string,
  contractId?: string
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
  
  let query = supabase
    .from('payroll_meal_allowance_configs')
    .update(updateData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function upsertMealAllowanceConfig(
  userId: string,
  contractId: string,
  configData: PayrollMealAllowanceConfigFormData
): Promise<PayrollMealAllowanceConfig> {
  console.log('🔍 upsertMealAllowanceConfig - Iniciando com:', { userId, contractId, configData });
  
  // Primeiro, verificar se já existe uma configuração
  const existingConfig = await getMealAllowanceConfig(userId, contractId);
  console.log('🔍 upsertMealAllowanceConfig - Configuração existente:', existingConfig);
  
  const configPayload = {
    user_id: userId,
    contract_id: contractId,
    daily_amount_cents: eurosToCents(configData.dailyAmount),
    excluded_months: configData.excluded_months,
    payment_method: configData.paymentMethod,
    duodecimos_enabled: configData.duodecimosEnabled
  };
  console.log('🔍 upsertMealAllowanceConfig - Payload preparado:', configPayload);
  
  if (existingConfig) {
    // Atualizar configuração existente
    console.log('🔄 upsertMealAllowanceConfig - Atualizando configuração existente com ID:', existingConfig.id);
    const { data, error } = await supabase
      .from('payroll_meal_allowance_configs')
      .update({
        daily_amount_cents: eurosToCents(configData.dailyAmount),
        excluded_months: configData.excluded_months,
        payment_method: configData.paymentMethod,
        duodecimos_enabled: configData.duodecimosEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingConfig.id)
      .select()
      .single();

    if (error) {
      console.error('❌ upsertMealAllowanceConfig - Erro ao atualizar:', error);
      throw error;
    }
    console.log('✅ upsertMealAllowanceConfig - Configuração atualizada com sucesso:', data);
    return data;
  } else {
    // Criar nova configuração
    console.log('➕ upsertMealAllowanceConfig - Criando nova configuração');
    const { data, error } = await supabase
      .from('payroll_meal_allowance_configs')
      .insert(configPayload)
      .select()
      .single();

    if (error) {
      console.error('❌ upsertMealAllowanceConfig - Erro ao criar:', error);
      throw error;
    }
    console.log('✅ upsertMealAllowanceConfig - Nova configuração criada com sucesso:', data);
    return data;
  }
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
  configData: Partial<PayrollDeductionConfigFormData>,
  userId?: string,
  contractId?: string
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
  
  let query = supabase
    .from('payroll_deduction_configs')
    .update(updateData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function getDeductionConfigs(userId: string): Promise<PayrollDeductionConfig[]> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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
// CONFIGURAÇÃO DE BONUS
// ============================================================================

export async function getBonusConfig(
  userId: string,
  contractId: string,
  bonusType: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('payroll_bonus_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('bonus_type', bonusType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function upsertBonusConfig(
  userId: string,
  contractId: string,
  bonusType: string,
  configData: any
): Promise<any> {
  const { data, error } = await supabase
    .from('payroll_bonus_configs')
    .upsert({
      user_id: userId,
      contract_id: contractId,
      bonus_type: bonusType,
      config_data: configData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,contract_id,bonus_type'
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
  // Verificar se já existe uma entrada para esta data e contrato
  const dateStr = entryData.date instanceof Date 
    ? entryData.date.toISOString().split('T')[0]
    : new Date(entryData.date).toISOString().split('T')[0];
    
  const { data: existing } = await supabase
    .from('payroll_time_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('date', dateStr)
    .single();
    
  if (existing) {
    // Se já existe, atualizar em vez de criar
    return updateTimeEntry(existing.id, entryData, userId, contractId);
  }
  
  // Se não existe, criar nova entrada
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
  entryData: Partial<PayrollTimeEntry>,
  userId?: string,
  contractId?: string
): Promise<PayrollTimeEntry> {
  let query = supabase
    .from('payroll_time_entries')
    .update(entryData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteTimeEntry(
  id: string,
  userId?: string,
  contractId?: string
): Promise<void> {
  let query = supabase
    .from('payroll_time_entries')
    .delete()
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

  if (error) throw error;
}

// ============================================================================
// POLÍTICAS DE QUILOMETRAGEM
// ============================================================================

export async function getMileagePolicies(userId: string, contractId?: string): Promise<PayrollMileagePolicy[]> {
  let query = supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

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

export async function getActiveMileagePolicy(userId: string, contractId?: string): Promise<PayrollMileagePolicy | null> {
  let query = supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createMileagePolicy(
  userId: string,
  policyData: MileagePolicyFormData & { contract_id?: string }
): Promise<PayrollMileagePolicy> {
  // Se contractId não for fornecido, usar o contrato ativo
  let contractId = policyData.contract_id;
  if (!contractId) {
    const activeContract = await getActiveContract(userId);
    if (!activeContract) {
      throw new Error('Nenhum contrato ativo encontrado');
    }
    contractId = activeContract.id;
  }

  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .insert({
      user_id: userId,
      contract_id: contractId,
      name: policyData.name,
      rate_cents_per_km: eurosToCents(policyData.rate_per_km),
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertMileagePolicy(
  userId: string,
  policyData: any,
  contractId?: string
): Promise<PayrollMileagePolicy> {
  // Verificar se há dados obrigatórios antes de tentar guardar
  if (!policyData.rate_per_km || policyData.rate_per_km <= 0) {
    throw new Error('Taxa por quilómetro é obrigatória e deve ser maior que 0');
  }

  // Se contractId não for fornecido, usar o contrato ativo
  let finalContractId = contractId;
  if (!finalContractId) {
    const activeContract = await getActiveContract(userId);
    if (!activeContract) {
      throw new Error('Nenhum contrato ativo encontrado');
    }
    finalContractId = activeContract.id;
  }

  // Mapear campos do formulário para campos da base de dados
  const dbData = {
    user_id: userId,
    contract_id: finalContractId,
    name: policyData.name || 'Política de Quilometragem',
    rate_cents_per_km: eurosToCents(policyData.rate_per_km),
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

export async function deactivateMileagePolicy(userId: string, contractId?: string): Promise<void> {
  let query = supabase
    .from('payroll_mileage_policies')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

  if (error) throw error;
}

export async function updateMileagePolicy(
  id: string,
  policyData: Partial<MileagePolicyFormData>,
  userId?: string,
  contractId?: string
): Promise<PayrollMileagePolicy> {
  const updateData: any = {};
  
  if (policyData.name !== undefined) {
    updateData.name = policyData.name;
  }
  if (policyData.rate_per_km !== undefined) {
    updateData.rate_cents_per_km = eurosToCents(policyData.rate_per_km);
  }

  let query = supabase
    .from('payroll_mileage_policies')
    .update(updateData)
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteMileagePolicy(
  id: string,
  userId?: string,
  contractId?: string
): Promise<void> {
  let query = supabase
    .from('payroll_mileage_policies')
    .delete()
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

  if (error) throw error;
}

// ============================================================================
// VIAGENS DE QUILOMETRAGEM
// ============================================================================

export async function getMileageTrips(
  userId: string,
  startDate?: string,
  endDate?: string,
  contractId?: string
): Promise<PayrollMileageTrip[]> {
  let query = supabase
    .from('payroll_mileage_trips')
    .select(`
      *,
      payroll_mileage_policies!inner(
        is_active,
        contract_id
      )
    `)
    .eq('user_id', userId)
    .eq('payroll_mileage_policies.is_active', true);

  if (contractId) {
    query = query.eq('payroll_mileage_policies.contract_id', contractId);
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

/**
 * Obtém o status detalhado das configurações da folha de pagamento
 */
export async function getPayrollConfigurationStatus(
  userId: string,
  contractId: string
): Promise<{
  isValid: boolean;
  missingConfigurations: string[];
  configurationDetails: {
    contract: { isValid: boolean; details: string[] };
    overtimePolicy: { isValid: boolean; details: string[] };
    mealAllowance: { isValid: boolean; details: string[] };
    deductions: { isValid: boolean; details: string[] };
    holidays: { isValid: boolean; details: string[] };
  };
}> {
  const missingConfigurations: string[] = [];
  const configurationDetails = {
    contract: { isValid: true, details: [] as string[] },
    overtimePolicy: { isValid: true, details: [] as string[] },
    mealAllowance: { isValid: true, details: [] as string[] },
    deductions: { isValid: true, details: [] as string[] },
    holidays: { isValid: true, details: [] as string[] }
  };

  try {
    // 1. Verificar se o contrato existe e está ativo
    const { data: contract, error: contractError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (contractError || !contract) {
      const msg = 'Contrato ativo não encontrado';
      missingConfigurations.push(msg);
      configurationDetails.contract.isValid = false;
      configurationDetails.contract.details.push(msg);
      return { isValid: false, missingConfigurations, configurationDetails };
    }

    // 2. Verificar campos obrigatórios do contrato
    if (!contract.job_category) {
      const msg = 'Categoria profissional não definida no contrato';
      missingConfigurations.push(msg);
      configurationDetails.contract.isValid = false;
      configurationDetails.contract.details.push(msg);
    }
    if (!contract.workplace_location) {
      const msg = 'Local de trabalho não definido no contrato';
      missingConfigurations.push(msg);
      configurationDetails.contract.isValid = false;
      configurationDetails.contract.details.push(msg);
    }
    if (!contract.base_salary_cents || contract.base_salary_cents <= 0) {
      const msg = 'Salário base não definido no contrato';
      missingConfigurations.push(msg);
      configurationDetails.contract.isValid = false;
      configurationDetails.contract.details.push(msg);
    }
    if (!contract.schedule_json) {
      const msg = 'Horário de trabalho não definido no contrato';
      missingConfigurations.push(msg);
      configurationDetails.contract.isValid = false;
      configurationDetails.contract.details.push(msg);
    }

    // 3. Verificar política de horas extras ativa
    const { data: otPolicy, error: otError } = await supabase
      .from('payroll_ot_policies')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (otError || !otPolicy) {
      const msg = 'Política de horas extras não configurada';
      missingConfigurations.push(msg);
      configurationDetails.overtimePolicy.isValid = false;
      configurationDetails.overtimePolicy.details.push(msg);
    }

    // 4. Verificar configuração de subsídio de alimentação
    const { data: mealConfig, error: mealError } = await supabase
      .from('payroll_meal_allowance_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('contract_id', contractId)
      .single();

    if (mealError || !mealConfig) {
      const msg = 'Configuração de subsídio de alimentação não definida';
      missingConfigurations.push(msg);
      configurationDetails.mealAllowance.isValid = false;
      configurationDetails.mealAllowance.details.push(msg);
    }

    // 5. Verificar configuração de descontos
    const { data: deductionConfig, error: deductionError } = await supabase
      .from('payroll_deduction_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('contract_id', contractId)
      .single();

    if (deductionError || !deductionConfig) {
      const msg = 'Configuração de descontos não definida';
      missingConfigurations.push(msg);
      configurationDetails.deductions.isValid = false;
      configurationDetails.deductions.details.push(msg);
    }

    // 6. Verificar se há feriados configurados para o ano atual
    const currentYear = new Date().getFullYear();
    const { data: holidays, error: holidaysError } = await supabase
      .from('payroll_holidays')
      .select('*')
      .eq('user_id', userId)
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`);

    if (holidaysError || !holidays || holidays.length === 0) {
      const msg = `Feriados não configurados para o ano ${currentYear}`;
      missingConfigurations.push(msg);
      configurationDetails.holidays.isValid = false;
      configurationDetails.holidays.details.push(msg);
    }

    return {
      isValid: missingConfigurations.length === 0,
      missingConfigurations,
      configurationDetails
    };
  } catch (error) {
    console.error('Erro ao verificar configuração da folha de pagamento:', error);
    return {
      isValid: false,
      missingConfigurations: ['Erro interno ao verificar configurações'],
      configurationDetails
    };
  }
}

/**
 * Valida se todas as configurações necessárias estão completas para criar um período de folha de pagamento
 */
export async function validatePayrollConfiguration(
  userId: string,
  contractId: string
): Promise<{ isValid: boolean; missingConfigurations: string[] }> {
  const status = await getPayrollConfigurationStatus(userId, contractId);
  return {
    isValid: status.isValid,
    missingConfigurations: status.missingConfigurations
  };
}

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
  // Validar configurações antes de criar o período
  const validation = await validatePayrollConfiguration(userId, contractId);
  
  if (!validation.isValid) {
    const missingConfigsText = validation.missingConfigurations.join(', ');
    throw new Error(
      `Não é possível criar o período de folha de pagamento. Configurações em falta: ${missingConfigsText}`
    );
  }

  // Verificar se já existe um período para este mês/ano
  const { data: existingPeriod, error: checkError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (existingPeriod) {
    throw new Error(`Já existe um período de folha de pagamento para ${month}/${year}`);
  }

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
      getTimeEntries(userId, `${year}-${month.toString().padStart(2, '0')}-01`, getLastDayOfMonth(year, month), contractId),
      getMileageTrips(userId, `${year}-${month.toString().padStart(2, '0')}-01`, getLastDayOfMonth(year, month)),
      getActiveMileagePolicy(userId),
      getDeductionConfig(userId, contractId),
      getMealAllowanceConfig(userId, contractId).catch(() => null)
    ]);

    if (!contract) throw new Error('Contrato não encontrado');
    if (!otPolicy) throw new Error('Política de horas extras não encontrada');

    // Importar função de cálculo
    const { calcMonth } = await import('../lib/calc');
    
    const mileageRate = mileagePolicy?.rate_cents_per_km || 36; // €0.36 padrão
    
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
  getContract,
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
  deleteOTPolicy,
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
  
  // Configuração de subsídio de alimentação
  getMealAllowanceConfig,
  createMealAllowanceConfig,
  updateMealAllowanceConfig,
  upsertMealAllowanceConfig,
  
  // Configuração de descontos
  getDeductionConfig,
  getDeductionConfigs,
  createDeductionConfig,
  updateDeductionConfig,
  upsertDeductionConfig,
  
  // Configuração de bonus
  getBonusConfig,
  upsertBonusConfig,
  
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
  validatePayrollConfiguration,
  getPayrollConfigurationStatus,
  
  // Importação
  importTimeEntriesFromCSV,
  
  // Período experimental
  upsertProbationConfig,
  
  // Licenças
  getLeaves,
  getPayrollLeaves: getLeaves, // Alias para compatibilidade com testes
  getLeavesForWeek,
  createLeave,
  createPayrollLeave: createLeave, // Alias para compatibilidade com testes
  updateLeave,
  deleteLeave,
  approveLeave,
  rejectLeave,
  checkLeaveOverlap,
  
  // Descanso compensatório
  createCompensatoryRest,
  processCompensatoryRestForTimeEntries
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

export async function getLeaves(userId: string, contractId?: string): Promise<PayrollLeave[]> {
  let query = supabase
    .from('payroll_leaves')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLeave(
  id: string,
  userId?: string,
  contractId?: string
): Promise<PayrollLeave | null> {
  let query = supabase
    .from('payroll_leaves')
    .select('*')
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createLeave(userId: string, leaveData: PayrollLeaveFormData, contractId?: string): Promise<PayrollLeave> {
  // Se não foi fornecido contractId, buscar o contrato ativo do utilizador
  let finalContractId = contractId;
  if (!finalContractId) {
    const activeContract = await getActiveContract(userId);
    if (!activeContract) {
      throw new Error('Nenhum contrato ativo encontrado. É necessário ter um contrato ativo para criar licenças.');
    }
    finalContractId = activeContract.id;
  }

  // Função para calcular dias entre datas
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Mapear campos do formulário para a estrutura da tabela
  const insertData = {
    contract_id: finalContractId,
    employee_name: 'Funcionário', // Valor temporário - pode ser obtido do contrato
    leave_type: leaveData.leave_type,
    start_date: leaveData.start_date,
    end_date: leaveData.end_date,
    total_days: leaveData.paid_days ? (leaveData.paid_days + (leaveData.unpaid_days || 0)) : calculateDays(leaveData.start_date, leaveData.end_date),
    paid_days: leaveData.paid_days || 0,
    unpaid_days: leaveData.unpaid_days || 0,
    percentage_paid: leaveData.percentage_paid || 100,
    status: 'pending',
    reason: leaveData.reason || null,
    notes: leaveData.notes || null
  };
  
  const { data, error } = await supabase
    .from('payroll_leaves')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeave(
  id: string,
  leaveData: Partial<PayrollLeaveFormData>,
  userId?: string,
  contractId?: string
): Promise<PayrollLeave> {
  let query = supabase
    .from('payroll_leaves')
    .update({
      ...leaveData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteLeave(
  id: string,
  userId?: string,
  contractId?: string
): Promise<void> {
  let query = supabase
    .from('payroll_leaves')
    .delete()
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { error } = await query;

  if (error) throw error;
}

export async function approveLeave(
  id: string,
  approvedBy: string,
  userId?: string,
  contractId?: string
): Promise<PayrollLeave> {
  let query = supabase
    .from('payroll_leaves')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function rejectLeave(
  id: string,
  approvedBy: string,
  userId?: string,
  contractId?: string
): Promise<PayrollLeave> {
  let query = supabase
    .from('payroll_leaves')
    .update({
      status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  // Adicionar validação de acesso se userId for fornecido
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // Adicionar validação de contrato se contractId for fornecido
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

// Função para verificar sobreposição de licenças
export async function checkLeaveOverlap(
  userId: string,
  startDate: string,
  endDate: string,
  contractId?: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('payroll_leaves')
    .select('id')
    .eq('user_id', userId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).length > 0;
}

// Função para carregar períodos de férias que se sobrepõem com uma semana específica
export async function getLeavesForWeek(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
  contractId?: string
): Promise<PayrollLeave[]> {
  let query = supabase
    .from('payroll_leaves')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['approved', 'active'])
    .or(`start_date.lte.${weekEndDate},end_date.gte.${weekStartDate}`);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// DESCANSO COMPENSATÓRIO
// ============================================================================

/**
 * Cria automaticamente descanso compensatório para trabalho ao domingo
 * @param userId ID do utilizador
 * @param contractId ID do contrato
 * @param workDate Data do trabalho (domingo)
 * @param hoursWorked Horas trabalhadas
 * @returns Promise<PayrollLeave | null>
 */
export async function createCompensatoryRest(
  userId: string,
  contractId: string,
  workDate: Date,
  hoursWorked: number
): Promise<PayrollLeave | null> {
  // Verificar se é domingo
  if (workDate.getDay() !== 0) {
    return null; // Não é domingo, não é necessário descanso compensatório
  }

  // Verificar se já existe descanso compensatório para esta data
  const existingLeave = await supabase
    .from('payroll_leaves')
    .select('id')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('leave_type', 'compensatory_rest')
    .eq('notes', `Trabalho ao domingo em ${workDate.toISOString().split('T')[0]}`)
    .single();

  if (existingLeave.data) {
    return null; // Já existe descanso compensatório para esta data
  }

  // Calcular dias de descanso compensatório (1 dia por cada 8 horas trabalhadas, mínimo 1 dia)
  const compensatoryDays = Math.max(1, Math.ceil(hoursWorked / 8));

  // Criar descanso compensatório automaticamente
  const leaveData: PayrollLeaveFormData = {
    leave_type: 'compensatory_rest',
    start_date: workDate.toISOString().split('T')[0], // Data do trabalho como referência
    end_date: workDate.toISOString().split('T')[0], // Mesmo dia como referência
    paid_days: compensatoryDays,
    unpaid_days: 0,
    percentage_paid: 100,
    reason: `Descanso compensatório obrigatório por trabalho ao domingo (${hoursWorked.toFixed(2)}h trabalhadas)`,
    medical_certificate: false,
    notes: `Trabalho ao domingo em ${workDate.toISOString().split('T')[0]}`
  };

  try {
    const { data, error } = await supabase
      .from('payroll_leaves')
      .insert({
        user_id: userId,
        contract_id: contractId,
        ...leaveData,
        status: 'approved', // Aprovado automaticamente por ser obrigatório
        approved_by: 'system',
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar descanso compensatório:', error);
    return null;
  }
}

/**
 * Processa entradas de tempo e cria descanso compensatório automaticamente para trabalho ao domingo
 * @param userId ID do utilizador
 * @param contractId ID do contrato
 * @param timeEntries Array de entradas de tempo
 * @returns Promise<PayrollLeave[]> Array de descansos compensatórios criados
 */
export async function processCompensatoryRestForTimeEntries(
  userId: string,
  contractId: string,
  timeEntries: PayrollTimeEntry[]
): Promise<PayrollLeave[]> {
  const compensatoryLeaves: PayrollLeave[] = [];

  // Agrupar entradas por data
  const entriesByDate = timeEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, PayrollTimeEntry[]>);

  // Processar cada data
  for (const [dateStr, entries] of Object.entries(entriesByDate)) {
    const workDate = new Date(dateStr);
    
    // Verificar se é domingo
    if (workDate.getDay() === 0) {
      // Calcular total de horas trabalhadas no domingo
      let totalHours = 0;
      entries.forEach(entry => {
        const startTime = new Date(`1970-01-01T${entry.start_time}`);
        const endTime = new Date(`1970-01-01T${entry.end_time}`);
        const workMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) - (entry.break_minutes || 0);
        totalHours += workMinutes / 60;
      });

      if (totalHours > 0) {
        const compensatoryLeave = await createCompensatoryRest(
          userId,
          contractId,
          workDate,
          totalHours
        );

        if (compensatoryLeave) {
          compensatoryLeaves.push(compensatoryLeave);
        }
      }
    }
  }

  return compensatoryLeaves;
}