// Serviço de cálculo de folha de pagamento
// Funções puras para cálculos de horários, horas extras, subsídios e quilometragem

import { 
  PayrollContract, 
  PayrollOTPolicy, 
  PayrollHoliday, 
  PayrollTimeEntry, 
  PayrollMileageTrip,
  TimeSegment, 
  PlannedSchedule, 
  PayrollCalculation 
} from '../types';

/**
 * Constrói o cronograma planejado para um período específico
 * @param contract Contrato do funcionário
 * @param holidays Lista de feriados
 * @param startDate Data de início do período
 * @param endDate Data de fim do período
 * @returns Array de cronogramas planejados por dia
 */
export function buildPlannedSchedule(
  contract: PayrollContract,
  holidays: PayrollHoliday[],
  startDate: Date,
  endDate: Date
): PlannedSchedule[] {
  const schedule: PlannedSchedule[] = [];
  const current = new Date(startDate);
  const dailyHours = contract.weekly_hours / 7; // Distribuição uniforme

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const holiday = holidays.find(h => h.date === dateStr);
    
    schedule.push({
      date: dateStr,
      plannedHours: holiday ? 0 : dailyHours,
      isHoliday: !!holiday,
      holidayName: holiday?.name
    });

    current.setDate(current.getDate() + 1);
  }

  return schedule;
}

/**
 * Segmenta uma entrada de tempo em períodos regulares e de horas extras
 * @param entry Entrada de tempo
 * @param otPolicy Política de horas extras
 * @param dailyThreshold Limite diário de horas (padrão: 8h)
 * @returns Array de segmentos de tempo
 */
export function segmentEntry(
  entry: PayrollTimeEntry,
  otPolicy: PayrollOTPolicy,
  dailyThreshold: number = 8
): TimeSegment[] {
  const startTime = new Date(`${entry.date}T${entry.start_time}`);
  let endTime = new Date(`${entry.date}T${entry.end_time}`);
  
  // Se o horário de fim é menor que o de início, é um turno noturno (atravessa meia-noite)
  if (endTime <= startTime) {
    endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000); // Adiciona 1 dia
  }
  
  // Calcular total de horas trabalhadas (descontando pausa)
  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) - entry.break_minutes;
  const totalHours = totalMinutes / 60;

  const segments: TimeSegment[] = [];

  if (totalHours <= dailyThreshold) {
    // Todas as horas são regulares
    segments.push({
      start: startTime,
      end: endTime,
      isOvertime: false,
      hours: totalHours
    });
  } else {
    // Dividir em horas regulares e extras
    const regularHours = dailyThreshold;
    const overtimeHours = totalHours - dailyThreshold;

    // Segmento regular
    const regularEndTime = new Date(startTime.getTime() + (regularHours * 60 * 60 * 1000));
    segments.push({
      start: startTime,
      end: regularEndTime,
      isOvertime: false,
      hours: regularHours
    });

    // Segmento de horas extras
    segments.push({
      start: regularEndTime,
      end: endTime,
      isOvertime: true,
      hours: overtimeHours
    });
  }

  return segments;
}

/**
 * Calcula o pagamento por horas trabalhadas
 * @param hours Número de horas
 * @param hourlyRateCents Taxa horária em centavos
 * @param isOvertime Se são horas extras
 * @param otMultiplier Multiplicador de horas extras
 * @returns Valor em centavos
 */
export function calcHourly(
  hours: number,
  hourlyRateCents: number,
  isOvertime: boolean = false,
  otMultiplier: number = 1.5
): number {
  const rate = isOvertime ? hourlyRateCents * otMultiplier : hourlyRateCents;
  return Math.round(hours * rate);
}

/**
 * Calcula subsídio de refeição baseado nas horas trabalhadas
 * @param totalHours Total de horas trabalhadas no dia
 * @param mealAllowanceCents Valor do subsídio de refeição em centavos
 * @param minimumHours Horas mínimas para ter direito ao subsídio (padrão: 6h)
 * @returns Valor do subsídio em centavos
 */
export function calcMeal(
  totalHours: number,
  mealAllowanceCents: number = 600, // €6.00 padrão
  minimumHours: number = 6
): number {
  return totalHours >= minimumHours ? mealAllowanceCents : 0;
}

/**
 * Calcula bónus baseado em critérios específicos
 * @param baseAmount Valor base em centavos
 * @param multiplier Multiplicador do bónus
 * @param conditions Condições para aplicar o bónus
 * @returns Valor do bónus em centavos
 */
export function calcBonuses(
  baseAmount: number,
  multiplier: number = 1,
  conditions: { [key: string]: boolean } = {}
): number {
  // Verificar se todas as condições são atendidas
  const allConditionsMet = Object.values(conditions).every(condition => condition);
  
  return allConditionsMet ? Math.round(baseAmount * multiplier) : 0;
}

/**
 * Calcula reembolso de quilometragem
 * @param trips Lista de viagens
 * @param ratePerKmCents Taxa por quilómetro em centavos
 * @returns Valor total do reembolso em centavos
 */
export function calcMileage(
  trips: PayrollMileageTrip[],
  ratePerKmCents: number
): number {
  return trips.reduce((total, trip) => {
    return total + Math.round(trip.distance_km * ratePerKmCents);
  }, 0);
}

/**
 * Calcula o total mensal de um funcionário
 * @param contract Contrato do funcionário
 * @param timeEntries Entradas de tempo do mês
 * @param otPolicy Política de horas extras
 * @param holidays Feriados do mês
 * @param mileageTrips Viagens do mês
 * @param mileageRateCents Taxa de quilometragem em centavos
 * @returns Cálculo completo da folha de pagamento
 */
export function calcMonth(
  contract: PayrollContract,
  timeEntries: PayrollTimeEntry[],
  otPolicy: PayrollOTPolicy,
  holidays: PayrollHoliday[],
  mileageTrips: PayrollMileageTrip[] = [],
  mileageRateCents: number = 36 // €0.36 por km padrão
): PayrollCalculation {
  let regularHours = 0;
  let overtimeHours = 0;

  // Processar todas as entradas de tempo
  timeEntries.forEach(entry => {
    const segments = segmentEntry(entry, otPolicy);
    
    segments.forEach(segment => {
      if (segment.isOvertime) {
        overtimeHours += segment.hours;
      } else {
        regularHours += segment.hours;
      }
    });
  });

  // Calcular pagamentos
  const regularPay = calcHourly(regularHours, contract.hourly_rate_cents);
  const overtimePay = calcHourly(overtimeHours, contract.hourly_rate_cents, true, otPolicy.multiplier);
  
  // Calcular subsídios de refeição (assumindo 1 por dia trabalhado)
  const workingDays = new Set(timeEntries.map(entry => entry.date)).size;
  const mealAllowance = workingDays * calcMeal(8, contract.meal_allowance_cents); // Assumindo 8h por dia para subsídio
  
  // Calcular quilometragem
  const mileageReimbursement = calcMileage(mileageTrips, mileageRateCents);
  
  // Calcular bónus (exemplo: bónus de pontualidade)
  const punctualityBonus = calcBonuses(
    regularPay * 0.05, // 5% do salário base
    1,
    { punctual: timeEntries.length >= 20 } // Exemplo: trabalhou pelo menos 20 dias
  );

  const grossPay = regularPay + overtimePay + mealAllowance + mileageReimbursement + punctualityBonus;
  
  // Deduções (exemplo: 11% para Segurança Social)
  const socialSecurityDeduction = Math.round(grossPay * 0.11);
  const deductions = socialSecurityDeduction;
  
  const netPay = grossPay - deductions;

  return {
    regularHours,
    overtimeHours,
    regularPay,
    overtimePay,
    mealAllowance,
    mileageReimbursement,
    bonuses: punctualityBonus,
    grossPay,
    deductions,
    netPay
  };
}

/**
 * Converte valor de euros para centavos
 * @param euros Valor em euros
 * @returns Valor em centavos
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Converte valor de centavos para euros
 * @param cents Valor em centavos
 * @returns Valor em euros
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Formata valor em centavos para string monetária
 * @param cents Valor em centavos
 * @param locale Localização (padrão: pt-PT)
 * @param currency Moeda (padrão: EUR)
 * @returns String formatada
 */
export function formatCurrency(
  cents: number, 
  locale: string = 'pt-PT', 
  currency: string = 'EUR'
): string {
  const euros = centsToEuros(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(euros);
}

/**
 * Calcula o número de horas entre duas datas/horas
 * @param start Data/hora de início
 * @param end Data/hora de fim
 * @param breakMinutes Minutos de pausa a descontar
 * @returns Número de horas
 */
export function calculateHours(
  start: string | Date,
  end: string | Date,
  breakMinutes: number = 0
): number {
  let startTime: Date;
  let endTime: Date;
  
  if (typeof start === 'string') {
    // Se é uma string de tempo (HH:MM), criar uma data com data atual
    if (start.includes(':') && start.length <= 5) {
      startTime = new Date(`1970-01-01T${start}:00`);
    } else {
      startTime = new Date(start);
    }
  } else {
    startTime = start;
  }
  
  if (typeof end === 'string') {
    // Se é uma string de tempo (HH:MM), criar uma data com data atual
    if (end.includes(':') && end.length <= 5) {
      endTime = new Date(`1970-01-01T${end}:00`);
      // Se o horário de fim é menor que o de início, é um turno noturno
      if (endTime <= startTime) {
        endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      endTime = new Date(end);
    }
  } else {
    endTime = end;
  }
  
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = diffMs / (1000 * 60) - breakMinutes;
  
  return Math.max(0, diffMinutes / 60);
}

/**
 * Calcula a taxa horária baseada no salário base e horas efetivas de trabalho
 * @param baseSalaryCents Salário base em centavos
 * @param scheduleJson Horário de trabalho semanal
 * @returns Taxa horária em centavos
 */
export function calculateHourlyRate(
  baseSalaryCents: number,
  scheduleJson: Record<string, any>
): number {
  // Calcular total de horas efetivas por semana
  let totalWeeklyMinutes = 0;
  
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of daysOfWeek) {
    const daySchedule = scheduleJson[day];
    if (daySchedule && daySchedule.enabled) {
      const startTime = daySchedule.start || '09:00';
      const endTime = daySchedule.end || '18:00';
      const breakMinutes = daySchedule.break_minutes || 0;
      
      // Calcular minutos trabalhados no dia
      const dayMinutes = calculateHours(startTime, endTime, breakMinutes) * 60;
      totalWeeklyMinutes += dayMinutes;
    }
  }
  
  // Converter para horas
  const totalWeeklyHours = totalWeeklyMinutes / 60;
  
  if (totalWeeklyHours === 0) {
    return 0;
  }
  
  // Calcular salário semanal (assumindo 4.33 semanas por mês)
  const weeklySalaryCents = baseSalaryCents / 4.33;
  
  // Calcular taxa horária
  const hourlyRateCents = Math.round(weeklySalaryCents / totalWeeklyHours);
  
  return hourlyRateCents;
}

/**
 * Valida se uma entrada de tempo é válida
 * @param entry Entrada de tempo
 * @returns Objeto com resultado da validação e mensagens de erro
 */
export function validateTimeEntry(entry: Partial<PayrollTimeEntry>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!entry.date) {
    errors.push('Data é obrigatória');
  }

  if (!entry.start_time) {
    errors.push('Hora de início é obrigatória');
  }

  if (!entry.end_time) {
    errors.push('Hora de fim é obrigatória');
  }

  if (entry.start_time && entry.end_time) {
    const start = new Date(`${entry.date}T${entry.start_time}`);
    const end = new Date(`${entry.date}T${entry.end_time}`);
    
    if (end <= start) {
      errors.push('Hora de fim deve ser posterior à hora de início');
    }

    const totalHours = calculateHours(start, end, entry.break_minutes || 0);
    if (totalHours > 16) {
      errors.push('Não é possível trabalhar mais de 16 horas por dia');
    }
  }

  if (entry.break_minutes !== undefined) {
    if (entry.break_minutes < 0) {
      errors.push('Minutos de pausa não podem ser negativos');
    }
    
    // Verificar se os minutos de pausa não excedem o tempo total de trabalho
    if (entry.start_time && entry.end_time && entry.break_minutes > 0) {
      const start = new Date(`${entry.date}T${entry.start_time}`);
      const end = new Date(`${entry.date}T${entry.end_time}`);
      const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      
      if (entry.break_minutes >= totalMinutes) {
        errors.push('Minutos de pausa não podem ser iguais ou superiores ao tempo total de trabalho');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}