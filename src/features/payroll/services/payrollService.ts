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
  ContractFormData,
  OTPolicyFormData,
  HolidayFormData,
  PayrollHolidayFormData,
  PayrollVacationFormData,
  PayrollMealAllowanceConfigFormData,
  MileagePolicyFormData,
  PayrollCalculation
} from '../types';
import { eurosToCents, centsToEuros } from '../lib/calc';

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
  return data || [];
}

export async function getActiveContract(userId: string): Promise<PayrollContract | null> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createContract(
  userId: string,
  contractData: ContractFormData,
  familyId?: string
): Promise<PayrollContract> {
  const insertData = {
    user_id: userId,
    family_id: familyId || null,
    name: contractData.name,
    base_salary_cents: contractData.base_salary_cents,
    currency: contractData.currency,
    weekly_hours: contractData.weekly_hours,
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
  return data;
}

export async function updateContract(
  id: string,
  contractData: Partial<ContractFormData>
): Promise<PayrollContract> {
  console.log('🔍 DEBUG updateContract: ID:', id);
  console.log('🔍 DEBUG updateContract: contractData:', contractData);
  
  // Verificar utilizador autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('🔍 DEBUG updateContract: Utilizador autenticado:', user?.id);
  console.log('🔍 DEBUG updateContract: Erro de autenticação:', authError);
  
  // Verificar se o contrato existe e pertence ao utilizador
  const { data: existingContract, error: fetchError } = await supabase
    .from('payroll_contracts')
    .select('id, user_id, name')
    .eq('id', id)
    .single();
  
  console.log('🔍 DEBUG updateContract: Contrato existente:', existingContract);
  console.log('🔍 DEBUG updateContract: Erro ao buscar contrato:', fetchError);
  
  if (fetchError) {
    console.error('❌ DEBUG updateContract: Erro ao buscar contrato:', fetchError);
    throw new Error(`Erro ao buscar contrato: ${fetchError.message}`);
  }
  
  if (!existingContract) {
    console.error('❌ DEBUG updateContract: Contrato não encontrado');
    throw new Error('Contrato não encontrado');
  }
  
  if (existingContract.user_id !== user?.id) {
    console.error('❌ DEBUG updateContract: Utilizador não autorizado');
    console.error('❌ DEBUG updateContract: Contract user_id:', existingContract.user_id);
    console.error('❌ DEBUG updateContract: Auth user_id:', user?.id);
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
  
  console.log('🔍 DEBUG updateContract: updateData com timestamp e conversões:', updateData);
  console.log('🔍 DEBUG updateContract: weekly_hours tipo:', typeof updateData.weekly_hours, 'valor:', updateData.weekly_hours);
  
  const { data, error } = await supabase
    .from('payroll_contracts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  console.log('🔍 DEBUG updateContract: Supabase response data:', data);
  console.log('🔍 DEBUG updateContract: Supabase response error:', error);

  if (error) {
    console.error('❌ DEBUG updateContract: Erro do Supabase:', error);
    throw error;
  }
  
  console.log('✅ DEBUG updateContract: Sucesso, retornando:', data);
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
      ...policyData,
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
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .update(policyData)
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
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .upsert({
      user_id: userId,
      ...policyData
    })
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
  year?: number
): Promise<PayrollVacation[]> {
  let query = supabase
    .from('payroll_vacations')
    .select('*')
    .eq('user_id', userId);

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
  vacationData: PayrollVacationFormData
): Promise<PayrollVacation> {
  const { data, error } = await supabase
    .from('payroll_vacations')
    .insert({
      user_id: userId,
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

  // Depois, inserir os novos períodos
  const periodsWithUserId = periods.map(period => ({
    user_id: userId,
    ...period
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
  userId: string
): Promise<PayrollMealAllowanceConfig | null> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createMealAllowanceConfig(
  userId: string,
  configData: PayrollMealAllowanceConfigFormData
): Promise<PayrollMealAllowanceConfig> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .insert({
      user_id: userId,
      ...configData
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
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .update(configData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertMealAllowanceConfig(
  userId: string,
  configData: PayrollMealAllowanceConfigFormData
): Promise<PayrollMealAllowanceConfig> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .upsert({
      user_id: userId,
      ...configData
    }, {
      onConflict: 'user_id'
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
  endDate?: string
): Promise<PayrollTimeEntry[]> {
  let query = supabase
    .from('payroll_time_entries')
    .select('*')
    .eq('user_id', userId);

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
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .upsert({
      user_id: userId,
      ...policyData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
    .select('*')
    .eq('user_id', userId);

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
    const [contract, otPolicy, holidays, timeEntries, mileageTrips, mileagePolicy] = await Promise.all([
      getActiveContract(userId),
      getActiveOTPolicy(userId),
      getHolidays(userId, year),
      getTimeEntries(userId, `${year}-${month.toString().padStart(2, '0')}-01`, `${year}-${month.toString().padStart(2, '0')}-31`),
      getMileageTrips(userId, `${year}-${month.toString().padStart(2, '0')}-01`, `${year}-${month.toString().padStart(2, '0')}-31`),
      getActiveMileagePolicy(userId)
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
      mileageRate
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
  
  // Entradas de tempo
  getTimeEntries,
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
        overtime_multiplier: entry.overtime_multiplier
      });
      results.push(result);
    }
    return results;
  },
  updateTimeEntry,
  deleteTimeEntry,
  
  // Políticas de quilometragem
  getMileagePolicies,
  getPayrollMileagePolicies: getMileagePolicies, // Alias para compatibilidade com testes
  getActiveMileagePolicy,
  createMileagePolicy,
  createPayrollMileagePolicy: createMileagePolicy, // Alias para compatibilidade com testes
  upsertMileagePolicy,
  
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
  importTimeEntriesFromCSV
};