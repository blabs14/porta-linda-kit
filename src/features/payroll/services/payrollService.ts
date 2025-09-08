import { supabase } from '../../../lib/supabaseClient';
import { PayrollContract, PayrollOTPolicy, PayrollHoliday, PayrollVacation, PayrollVacationFormData, PayrollTimeEntry, PayrollLeave, PayrollLeaveFormData, MileagePolicyFormData, PayrollMealAllowanceConfig, PayrollMealAllowanceConfigFormData, PayrollDeductionConfig, PayrollDeductionConfigFormData, PayrollPeriod, PayrollPeriodFormData, PayrollCalculation, PayrollMileageTrip, PayrollMileagePolicy } from '../types';
import { formatDateLocal } from '../../../lib/dateUtils';

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

// Contract functions
export async function getContracts(userId: string): Promise<PayrollContract[]> {
  console.log('🔍 DEBUG getContracts - called with userId:', userId);
  
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log('🔍 DEBUG getContracts - result:', { data: data?.length, error });
  
  if (error) throw new Error(error.message || 'Erro ao obter contratos');
  return data || [];
}

// Alias para compatibilidade com testes
export const getPayrollContracts = getContracts;
export async function getActiveContract(userId: string): Promise<PayrollContract | null> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && (error as any).code !== 'PGRST116') throw error as any;
  return data as any;
}

export async function getContract(contractId: string, userId: string): Promise<PayrollContract | null> {
  const { data, error } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('id', contractId)
    .eq('user_id', userId)
    .single();

  if (error && (error as any).code !== 'PGRST116') throw error as any;
  return data as any;
}

export async function createContract(contractData: Omit<PayrollContract, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<PayrollContract> {
  // Deactivate other contracts if this one is set as active
  if (contractData.is_active) {
    await supabase
      .from('payroll_contracts')
      .update({ is_active: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('payroll_contracts')
    .insert({ ...contractData, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateContract(contractId: string, contractData: Partial<PayrollContract>, userId: string): Promise<PayrollContract> {
  // Deactivate other contracts if this one is set as active
  if (contractData.is_active) {
    await supabase
      .from('payroll_contracts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', contractId);
  }

  const { data, error } = await supabase
    .from('payroll_contracts')
    .update(contractData)
    .eq('id', contractId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deactivateContract(contractId: string, userId: string): Promise<PayrollContract> {
  return updateContract(contractId, { is_active: false }, userId);
}

export async function deleteContract(contractId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_contracts')
    .delete()
    .eq('id', contractId)
    .eq('user_id', userId);

  if (error) throw error;
}

// OT Policy functions
export async function getOTPolicies(userId: string): Promise<PayrollOTPolicy[]> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// NEW: Get active OT policy for a user (optionally by contract, currently unused)
export async function getActiveOTPolicy(userId: string, _contractId?: string): Promise<PayrollOTPolicy | null> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .single();

  if (error && (error as any).code === 'PGRST116') return null;
  if (error) throw error;
  return (data as any) || null;
}
export async function createOTPolicy(policyData: Omit<PayrollOTPolicy, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<PayrollOTPolicy> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .insert({ ...policyData, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateOTPolicy(policyId: string, policyData: Partial<PayrollOTPolicy>, userId: string): Promise<PayrollOTPolicy> {
  const { data, error } = await supabase
    .from('payroll_ot_policies')
    .update(policyData)
    .eq('id', policyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteOTPolicy(policyId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_ot_policies')
    .delete()
    .eq('id', policyId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Holiday functions
export async function getHolidays(
  userId: string,
  yearOrStart?: number | string,
  endOrContractId?: string
): Promise<PayrollHoliday[]> {
  let query = supabase
    .from('payroll_holidays')
    .select(`
      *,
      payroll_contracts!inner(
        id,
        name,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('payroll_contracts.is_active', true);

  // Suporte retrocompatível: (userId, 'YYYY-MM-DD', 'YYYY-MM-DD')
  if (typeof yearOrStart === 'string') {
    const start = yearOrStart;
    const end = typeof endOrContractId === 'string' ? endOrContractId : undefined;
    if (start && end) {
      query = query.gte('date', start).lte('date', end);
    }
  } else if (typeof yearOrStart === 'number' && !isNaN(yearOrStart)) {
    // Assinatura nova: (userId, year, contractId?)
    const start = `${yearOrStart}-01-01`;
    const end = `${yearOrStart}-12-31`;
    query = query.gte('date', start).lte('date', end);
    
    // Se contractId foi fornecido, filtrar por ele
    if (typeof endOrContractId === 'string' && endOrContractId) {
      query = query.eq('contract_id', endOrContractId);
    }
  }

  const { data, error } = await query.order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createHoliday(holidayData: Omit<PayrollHoliday, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<PayrollHoliday> {
  // Validar que o contract_id pertence ao utilizador
  if (holidayData.contract_id) {
    const { data: contract } = await supabase
      .from('payroll_contracts')
      .select('id')
      .eq('id', holidayData.contract_id)
      .eq('user_id', userId)
      .single();
    
    if (!contract) {
      throw new Error('Contrato não encontrado ou não pertence ao utilizador');
    }
  }

  const { data, error } = await supabase
    .from('payroll_holidays')
    .insert({ ...holidayData, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateHoliday(holidayId: string, holidayData: Partial<PayrollHoliday>, userId: string): Promise<PayrollHoliday> {
  const { data, error } = await supabase
    .from('payroll_holidays')
    .update(holidayData)
    .eq('id', holidayId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteHoliday(holidayId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_holidays')
    .delete()
    .eq('id', holidayId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Vacation functions
export async function getVacations(userId: string): Promise<PayrollVacation[]>;
export async function getVacations(userId: string, contractId: string, year: number): Promise<PayrollVacation[]>;
export async function getVacations(userId: string, contractId?: string, year?: number): Promise<PayrollVacation[]> {
  let query = supabase
    .from('payroll_vacations')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  if (year) {
    query = query.eq('year', year);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createVacation(vacationData: PayrollVacationFormData, userId: string): Promise<PayrollVacation> {
  const { data, error } = await supabase
    .from('payroll_vacations')
    .insert({ ...vacationData, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateVacation(vacationId: string, vacationData: Partial<PayrollVacationFormData>, userId: string): Promise<PayrollVacation> {
  const { data, error } = await supabase
    .from('payroll_vacations')
    .update(vacationData)
    .eq('id', vacationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteVacation(vacationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_vacations')
    .delete()
    .eq('id', vacationId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Time entry functions
export async function getTimeEntries(userId: string, contractId: string, start_date?: string, end_date?: string): Promise<PayrollTimeEntry[]> {
  console.log('DEBUG - getTimeEntries chamada com parâmetros:', {
    userId,
    contractId,
    start_date,
    end_date
  });

  let query = supabase
    .from('payroll_time_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId);

  if (start_date) {
    query = query.gte('date', start_date);
  }
  if (end_date) {
    query = query.lte('date', end_date);
  }

  const { data, error } = await query.order('date', { ascending: true });

  console.log('DEBUG - getTimeEntries resultado:', {
    data: data?.length || 0,
    entries: data,
    error: error?.message || null
  });

  if (error) throw error;
  return data || [];
}

export async function getTimeEntriesByContract(userId: string, contractId: string): Promise<PayrollTimeEntry[]> {
  const { data, error } = await supabase
    .from('payroll_time_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTimeEntry(userId: string, contractId: string, entryData: Omit<PayrollTimeEntry, 'id' | 'created_at' | 'updated_at'>): Promise<PayrollTimeEntry> {
  console.log('[DEBUG] createTimeEntry iniciado', { userId, contractId, entryData });
  
  // Format date using local timezone to ensure consistency
  entryData.date = formatDateLocal(new Date(entryData.date));
  console.log('[DEBUG] Data formatada:', entryData.date);

  // Check if an entry already exists for this date and contract
  console.log('[DEBUG] Verificando entrada existente...');
  const { data: existingEntry, error: checkError } = await supabase
    .from('payroll_time_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('date', entryData.date)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[DEBUG] Erro ao verificar entrada existente:', checkError);
    throw checkError;
  }

  if (existingEntry) {
    console.log('[DEBUG] Entrada existente encontrada, atualizando...', existingEntry.id);
    // If entry exists, update it instead
    return updateTimeEntry(existingEntry.id, entryData, userId, contractId);
  }

  console.log('[DEBUG] Nenhuma entrada existente, criando nova...');
  
  // Add work on Sunday notes if applicable
  const entryDate = new Date(entryData.date);
  if (entryDate.getDay() === 0 && (entryData.start_time || entryData.end_time)) { // Sunday
    const currentNote = entryData.description || '';
    const sundayNote = 'Trabalho ao domingo - gera direito a descanso compensatório';
    entryData.description = currentNote ? `${currentNote}. ${sundayNote}` : sundayNote;
    console.log('[DEBUG] Nota de domingo adicionada:', entryData.description);
  }

  const insertData = { ...entryData, user_id: userId, contract_id: contractId };
  console.log('[DEBUG] Dados para inserção:', insertData);

  const { data, error } = await supabase
    .from('payroll_time_entries')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[DEBUG] Erro na inserção:', error);
    console.error('[DEBUG] Dados que causaram erro:', insertData);
    throw error;
  }
  
  console.log('[DEBUG] Entrada criada com sucesso:', data);
  return data as any;
}

export async function updateTimeEntry(entryId: string, entryData: Partial<Omit<PayrollTimeEntry, 'id' | 'created_at' | 'updated_at'>>, userId: string, contractId: string): Promise<PayrollTimeEntry> {
  // Format date using local timezone if provided
  if (entryData.date) {
    entryData.date = formatDateLocal(new Date(entryData.date));
  }

  // Add work on Sunday notes if applicable
  if (entryData.date) {
    const entryDate = new Date(entryData.date);
    if (entryDate.getDay() === 0 && (entryData.start_time || entryData.end_time)) { // Sunday
      const currentNote = entryData.description || '';
      const sundayNote = 'Trabalho ao domingo - gera direito a descanso compensatório';
      if (!currentNote.includes(sundayNote)) {
        entryData.description = currentNote ? `${currentNote}. ${sundayNote}` : sundayNote;
      }
    }
  }

  const { data, error } = await supabase
    .from('payroll_time_entries')
    .update(entryData)
    .eq('id', entryId)
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteTimeEntry(entryId: string, userId: string, contractId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_time_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
    .eq('contract_id', contractId);

  if (error) throw error;
}

// Leave functions
export async function getLeaves(userId: string): Promise<PayrollLeave[]> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createLeave(leaveData: PayrollLeaveFormData, userId: string): Promise<PayrollLeave> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .insert({ ...leaveData, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateLeave(leaveId: string, leaveData: Partial<PayrollLeaveFormData>, userId: string): Promise<PayrollLeave> {
  const { data, error } = await supabase
    .from('payroll_leaves')
    .update(leaveData)
    .eq('id', leaveId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteLeave(leaveId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_leaves')
    .delete()
    .eq('id', leaveId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Additional utility functions for compensatory rest processing
export async function processCompensatoryRestForTimeEntries(userId: string, contractId: string, timeEntries: PayrollTimeEntry[]): Promise<PayrollLeave[]> {
  const sundayEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getDay() === 0 && (entry.start_time || entry.end_time);
  });

  const compensatoryLeaves: PayrollLeave[] = [];
  
  for (const sundayEntry of sundayEntries) {
    // Check if compensatory leave already exists for this date
    const { data: existingLeave } = await supabase
      .from('payroll_leaves')
      .select('id')
      .eq('user_id', userId)
      .eq('work_date', formatDateLocal(new Date(sundayEntry.date)))
      .eq('leave_type', 'compensatory')
      .single();

    if (!existingLeave) {
      const leaveData: PayrollLeaveFormData = {
        contract_id: contractId,
        leave_type: 'compensatory',
        start_date: formatDateLocal(new Date(sundayEntry.date)),
        end_date: formatDateLocal(new Date(sundayEntry.date)),
        days_taken: 1,
        description: `Descanso compensatório por trabalho no domingo (${formatDateLocal(new Date(sundayEntry.date))})`,
        work_date: formatDateLocal(new Date(sundayEntry.date))
      };

      const compensatoryLeave = await createLeave(leaveData, userId);
      compensatoryLeaves.push(compensatoryLeave);
    }
  }

  return compensatoryLeaves;
}

// Payroll configuration status
export async function getPayrollConfigurationStatus(userId: string, contractId: string): Promise<{ isValid: boolean; missingConfigurations: string[]; configurationDetails: { contract: { isValid: boolean }; overtimePolicy: { isValid: boolean }; mealAllowance: { isValid: boolean }; deductions: { isValid: boolean }; holidays: { isValid: boolean } } }> {
  const currentYear = new Date().getFullYear();
  const missing: string[] = [];

  // Contract
  const { data: contract, error: contractError } = await supabase
    .from('payroll_contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', contractId)
    .single();

  let contractValid = true;
  if (!contract || contractError) {
    contractValid = false;
    missing.push('Contrato ativo não encontrado');
  } else {
    // Validar campos obrigatórios do contrato conforme expectativas dos testes
    if (!contract.job_category) {
      contractValid = false;
      missing.push('Categoria profissional não definida no contrato');
    }
    if (!contract.workplace_location) {
      contractValid = false;
      missing.push('Local de trabalho não definido no contrato');
    }
  }

  // OT Policy (active)
  const { data: otPolicy } = await supabase
    .from('payroll_ot_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  const otValid = !!otPolicy;
  if (!otValid) missing.push('Política de horas extras não configurada');

  // Meal allowance config (optional for validity, but tracked)
  const { data: mealConfig } = await supabase
    .from('payroll_meal_allowance_configs')
    .select('*')
    .eq('user_id', userId)
    .single();
  const mealValid = !!mealConfig;

  // Deduction config (optional for validity, but tracked)
  const { data: deductionConfig } = await supabase
    .from('payroll_deduction_configs')
    .select('*')
    .eq('user_id', userId)
    .single();
  const deductionsValid = !!deductionConfig;

  // Holidays for current year (only for active contracts)
  const start = `${currentYear}-01-01`;
  const end = `${currentYear}-12-31`;
  const { data: holidays } = await supabase
    .from('payroll_holidays')
    .select(`
      id,
      payroll_contracts!inner(
        id,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('payroll_contracts.is_active', true)
    .gte('date', start)
    .lte('date', end);
  const holidaysValid = Array.isArray(holidays) && holidays.length > 0;
  if (!holidaysValid) missing.push(`Feriados não configurados para o ano ${currentYear}`);

  const isValid = missing.length === 0;

  return {
    isValid,
    missingConfigurations: missing,
    configurationDetails: {
      contract: { isValid: contractValid },
      overtimePolicy: { isValid: otValid },
      mealAllowance: { isValid: mealValid },
      deductions: { isValid: deductionsValid },
      holidays: { isValid: holidaysValid }
    }
  };
}

// Validation helper used by period creation and tests
export async function validatePayrollConfiguration(userId: string, contractId: string, year: number = new Date().getFullYear()): Promise<{ isValid: boolean; missingConfigurations: string[] }> {
  const missing: string[] = [];

  const { data: contract } = await supabase
    .from('payroll_contracts')
    .select('id')
    .eq('user_id', userId)
    .eq('id', contractId)
    .single();
  if (!contract) missing.push('Contrato ativo não encontrado');

  const { data: otPolicy } = await supabase
    .from('payroll_ot_policies')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  if (!otPolicy) missing.push('Política de horas extras não configurada');

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { data: holidays } = await supabase
    .from('payroll_holidays')
    .select(`
      id,
      payroll_contracts!inner(
        id,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('payroll_contracts.is_active', true)
    .gte('date', start)
    .lte('date', end);
  if (!Array.isArray(holidays) || holidays.length === 0) missing.push(`Feriados não configurados para o ano ${year}`);

  return { isValid: missing.length === 0, missingConfigurations: missing };
}

// Payroll period creation
export async function createPayrollPeriod(userId: string, contractId: string, year: number, month: number): Promise<PayrollPeriod> {
  // 1) Validate configuration for the given year
  const validation = await validatePayrollConfiguration(userId, contractId);
  if (!validation.isValid) {
    throw new Error(`Não é possível criar o período de folha de pagamento. Configurações em falta: ${validation.missingConfigurations.join(', ')}`);
  }

  // 2) Ensure period does not already exist
  const { data: existing, error: existingErr } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (existing) {
    throw new Error(`Já existe um período de folha de pagamento para ${month}/${year}`);
  }
  if (existingErr && (existingErr as any).code && (existingErr as any).code !== 'PGRST116') {
    throw existingErr as any;
  }

  // 3) Insert new period with initial draft status
  const monthStr = month.toString().padStart(2, '0');
  const start_date = `${year}-${monthStr}-01`;
  const end_date = getLastDayOfMonth(year, month);

  const insertPayload: any = {
    user_id: userId,
    contract_id: contractId,
    year,
    month,
    period_key: `${year}-${monthStr}`,
    start_date,
    end_date,
    status: 'draft',
    planned_minutes: 0,
    worked_minutes: 0,
    gross_cents: 0,
    net_expected_cents: 0
  };

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

// Export all as payrollService object
export const payrollService = {
  getContracts,
  getPayrollContracts,
  getActiveContract,
  getContract,
  createContract,
  updateContract,
  deactivateContract,
  deleteContract,
  getOTPolicies,
  getActiveOTPolicy,
  createOTPolicy,
  updateOTPolicy,
  deleteOTPolicy,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getVacations,
  createVacation,
  updateVacation,
  deleteVacation,
  getTimeEntries,
  getTimeEntriesByContract,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getLeaves,
  createLeave,
  updateLeave,
  deleteLeave,
  processCompensatoryRestForTimeEntries,
  getPayrollConfigurationStatus,
  validatePayrollConfiguration,
  createPayrollPeriod,
  // Adicionado: permitir uso via payrollService.getLeavesForWeek
  getLeavesForWeek,
  // Mileage Trip methods
  getMileageTrips,
  createMileageTrip,
  updateMileageTrip,
  deleteMileageTrip,
  // Mileage policies
  getActiveMileagePolicy,
  getMileagePolicies,
  createMileagePolicy,
  updateMileagePolicy,
  deleteMileagePolicy,
  // Meal allowance config
  getMealAllowanceConfig,
  upsertMealAllowanceConfig,
  deleteMealAllowanceConfig,
  // Deduction config
  getDeductionConfig,
  getDeductionConfigs,
  upsertDeductionConfig,
  deleteDeductionConfig,
  // Payroll calculation
  recalculatePayroll,
};

// NEW: Get leaves overlapping a given week window
export async function getLeavesForWeek(
  userId: string,
  start_date: string,
  end_date: string,
  contractId?: string
): Promise<PayrollLeave[]> {
  let query = supabase
    .from('payroll_leaves')
    .select('*')
    .eq('user_id', userId)
    // overlap: leave.start_date <= end_date AND leave.end_date >= start_date
    .lte('start_date', end_date)
    .gte('end_date', start_date)
    .order('start_date', { ascending: true });

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Mileage Trip functions
export async function getMileageTrips(
  userId: string,
  startDate?: string,
  endDate?: string,
  contractId?: string
): Promise<PayrollMileageTrip[]> {
  let query = supabase
    .from('payroll_mileage_trips')
    .select('*')
    .eq('user_id', userId)
    .order('trip_date', { ascending: false });

  if (startDate) {
    query = query.gte('trip_date', startDate);
  }
  if (endDate) {
    query = query.lte('trip_date', endDate);
  }
  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createMileageTrip(
  userId: string,
  policyId: string,
  tripData: Omit<PayrollMileageTrip, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'policy_id'>
): Promise<PayrollMileageTrip> {
  const { data, error } = await supabase
    .from('payroll_mileage_trips')
    .insert({
      ...tripData,
      user_id: userId,
      policy_id: policyId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMileageTrip(
  tripId: string,
  tripData: Partial<Omit<PayrollMileageTrip, 'id' | 'created_at' | 'updated_at'>>
): Promise<PayrollMileageTrip> {
  const { data, error } = await supabase
    .from('payroll_mileage_trips')
    .update(tripData)
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMileageTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_mileage_trips')
    .delete()
    .eq('id', tripId);

  if (error) throw error;
}

// NEW: Get active mileage policy for a user and contract
export async function getActiveMileagePolicy(userId: string, contractId: string): Promise<PayrollMileagePolicy | null> {
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .single();

  if (error && (error as any).code === 'PGRST116') return null;
  if (error) throw error;
  return (data as any) || null;
}

export async function getMileagePolicies(userId: string, contractId?: string): Promise<PayrollMileagePolicy[]> {
  let query = supabase
    .from('payroll_mileage_policies')
    .select('*')
    .eq('user_id', userId);

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export async function createMileagePolicy(userId: string, policyData: MileagePolicyFormData & { contract_id: string }): Promise<PayrollMileagePolicy> {
  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .insert({
      user_id: userId,
      name: policyData.name,
      rate_cents_per_km: Math.round(policyData.rate_per_km * 100),
      contract_id: policyData.contract_id,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateMileagePolicy(policyId: string, policyData: Partial<MileagePolicyFormData>, userId: string, contractId: string): Promise<PayrollMileagePolicy> {
  const updateData: any = {};
  
  if (policyData.name !== undefined) updateData.name = policyData.name;
  if (policyData.rate_per_km !== undefined) updateData.rate_cents_per_km = Math.round(policyData.rate_per_km * 100);

  const { data, error } = await supabase
    .from('payroll_mileage_policies')
    .update(updateData)
    .eq('id', policyId)
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteMileagePolicy(policyId: string, userId: string, contractId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_mileage_policies')
    .delete()
    .eq('id', policyId)
    .eq('user_id', userId)
    .eq('contract_id', contractId);

  if (error) throw error;
}

// NEW: Meal Allowance Config methods
export async function getMealAllowanceConfig(userId: string, contractId: string): Promise<PayrollMealAllowanceConfig | null> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .single();

  if (error && (error as any).code === 'PGRST116') return null;
  if (error) throw error;
  return (data as any) || null;
}

export async function upsertMealAllowanceConfig(userId: string, contractId: string, configData: PayrollMealAllowanceConfigFormData): Promise<PayrollMealAllowanceConfig> {
  const { data, error } = await supabase
    .from('payroll_meal_allowance_configs')
    .upsert({
      user_id: userId,
      contract_id: contractId,
      daily_amount_cents: Math.round(configData.daily_amount * 100),
      excluded_months: configData.excluded_months || [],
      payment_method: configData.payment_method,
      duodecimos_enabled: configData.duodecimos_enabled || false
    }, {
      onConflict: 'user_id,contract_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteMealAllowanceConfig(userId: string, contractId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_meal_allowance_configs')
    .delete()
    .eq('user_id', userId)
    .eq('contract_id', contractId);

  if (error) throw error;
}

// NEW: Deduction Config methods
export async function getDeductionConfig(userId: string, contractId: string): Promise<PayrollDeductionConfig | null> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .single();

  if (error && (error as any).code === 'PGRST116') return null;
  if (error) throw error;
  return (data as any) || null;
}

export async function getDeductionConfigs(userId: string): Promise<PayrollDeductionConfig[]> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export async function upsertDeductionConfig(userId: string, contractId: string, configData: PayrollDeductionConfigFormData): Promise<PayrollDeductionConfig> {
  const { data, error } = await supabase
    .from('payroll_deduction_configs')
    .upsert({
      user_id: userId,
      contract_id: contractId,
      irs_percentage: configData.irs_percentage,
      social_security_percentage: configData.social_security_percentage,
      irs_surcharge_percentage: configData.irs_surcharge_percentage || 0,
      solidarity_contribution_percentage: configData.solidarity_contribution_percentage || 0
    }, {
      onConflict: 'user_id,contract_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteDeductionConfig(userId: string, contractId: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_deduction_configs')
    .delete()
    .eq('user_id', userId)
    .eq('contract_id', contractId);

  if (error) throw error;
}

// Payroll calculation function
export async function recalculatePayroll(
  userId: string,
  contractId: string,
  year: number,
  month: number
): Promise<PayrollCalculation> {
  // Import calculation service dynamically to avoid circular dependencies
  const { calculatePayroll } = await import('./calculation.service');
  
  return calculatePayroll(userId, contractId, year, month);
}