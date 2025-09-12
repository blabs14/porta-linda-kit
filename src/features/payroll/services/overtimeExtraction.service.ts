import { TimesheetEntry, PayrollOTPolicy, PayrollHoliday, PayrollTimeEntry } from '../types';
import { addMinutes, differenceInMinutes, format, isAfter, isBefore, parseISO, startOfDay, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { isValidUUID } from '@/lib/validation';

/**
 * Tipos específicos para cálculo de horas extras
 */
export interface OvertimeBreakdown {
  totalOvertimeHours: number;
  dayOvertimeHours: number; // Horas extras em dias úteis
  nightOvertimeHours: number; // Horas extras noturnas
  weekendOvertimeHours: number; // Horas extras fins de semana
  holidayOvertimeHours: number; // Horas extras feriados
  totalOvertimeValue: number; // Valor total das horas extras
  dayOvertimePay: number;
  nightOvertimePay: number;
  weekendOvertimePay: number;
  holidayOvertimePay: number;
  dailyBreakdown: DailyOvertimeCalculation[];
  warnings: string[];
}

export interface DailyOvertimeCalculation {
  date: string;
  regularHours: number;
  workedHours: number;
  overtimeHours: number;
  dayOvertimeHours: number;
  nightOvertimeHours: number;
  weekendOvertimeHours: number;
  holidayOvertimeHours: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  totalPay: number;
  overtimePay: number;
}

export interface WeeklyOvertimeSummary {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  dailyCalculations: DailyOvertimeCalculation[];
  weeklyLimitExceeded: boolean;
  weeklyLimitHours: number;
}

/**
 * Serviço para extração e cálculo de horas extras da timesheet
 */
export class OvertimeExtractionService {
  private policy: PayrollOTPolicy;
  private holidays: PayrollHoliday[];
  private hourlyRateCents: number;

  constructor(
    policy: PayrollOTPolicy,
    holidays: PayrollHoliday[] = [],
    hourlyRateCents: number
  ) {
    if (hourlyRateCents <= 0) {
      throw new Error('Taxa horária deve ser maior que 0');
    }
    
    if (!policy || policy.threshold_hours <= 0) {
      throw new Error('Política de horas extras inválida: threshold_hours deve ser maior que 0');
    }
    
    this.policy = policy;
    this.holidays = holidays;
    this.hourlyRateCents = hourlyRateCents;
  }

  /**
   * Extrai e calcula horas extras de uma lista de entradas da timesheet
   */
  public extractOvertimeFromTimesheet(
    timesheetEntries: TimesheetEntry[]
  ): OvertimeBreakdown {
    const dailyCalculations = this.calculateDailyOvertime(timesheetEntries);
    
    return this.aggregateOvertimeBreakdown(dailyCalculations, timesheetEntries);
  }

  /**
   * Calcula horas extras por semana
   */
  public calculateWeeklyOvertime(
    timesheetEntries: TimesheetEntry[]
  ): WeeklyOvertimeSummary[] {
    // Agrupar entradas por semana
    const weeklyGroups = this.groupEntriesByWeek(timesheetEntries);
    
    return weeklyGroups.map(week => {
      const dailyCalculations = this.calculateDailyOvertime(week.entries);
      const totalHours = dailyCalculations.reduce((sum, day) => sum + day.regularHours + day.overtimeHours, 0);
      const regularHours = dailyCalculations.reduce((sum, day) => sum + day.regularHours, 0);
      const overtimeHours = dailyCalculations.reduce((sum, day) => sum + day.overtimeHours, 0);
      
      return {
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        totalHours,
        regularHours,
        overtimeHours,
        dailyCalculations,
        weeklyLimitExceeded: totalHours > this.policy.weekly_limit_hours,
        weeklyLimitHours: this.policy.weekly_limit_hours
      };
    });
  }

  /**
   * Converte TimesheetEntry para PayrollTimeEntry com cálculo de horas extras
   */
  public convertToPayrollTimeEntry(
    timesheetEntry: TimesheetEntry,
    contractId: string,
    userId: string
  ): PayrollTimeEntry {
    // Validar se o contractId é um UUID válido
    if (!isValidUUID(contractId)) {
      throw new Error('ID do contrato deve ser um UUID válido');
    }
    const dailyCalc = this.calculateSingleDayOvertime(timesheetEntry);
    
    return {
      id: '', // Será gerado pelo serviço
      user_id: userId,
      contract_id: contractId,
      date: timesheetEntry.date,
      start_time: timesheetEntry.startTime,
      end_time: timesheetEntry.endTime,
      break_minutes: timesheetEntry.breakMinutes,
      description: timesheetEntry.description,
      is_overtime: dailyCalc.overtimeHours > 0,
      is_holiday: timesheetEntry.isHoliday,
      is_sick: timesheetEntry.isSick,
      is_vacation: timesheetEntry.isVacation,
      is_exception: timesheetEntry.isException,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Calcula horas extras para um único dia
   */
  private calculateSingleDayOvertime(entry: TimesheetEntry): DailyOvertimeCalculation {
    if (entry.isSick || entry.isVacation || entry.isLeave) {
      return this.createEmptyDayCalculation(entry.date);
    }

    const totalMinutes = this.calculateWorkingMinutes(entry);
    const totalHours = Math.max(0, totalMinutes / 60); // Garantir que não seja negativo
    
    // Verificar se é fim de semana ou feriado
    const date = parseISO(entry.date);
    const isWeekend = this.isWeekend(date);
    const holiday = this.getHolidayForDate(entry.date);
    const isHoliday = !!holiday;
    
    // Calcular horas regulares e extras
    const thresholdHours = this.policy.threshold_hours;
    
    // Aplicar threshold para todos os dias (incluindo fins de semana e feriados)
    const regularHours = Math.min(totalHours, thresholdHours);
    let overtimeHours = Math.max(0, totalHours - thresholdHours);
    
    // Aplicar arredondamento se definido na política
    if (this.policy.rounding_minutes && overtimeHours > 0) {
      const overtimeMinutes = overtimeHours * 60;
      const roundedMinutes = Math.ceil(overtimeMinutes / this.policy.rounding_minutes) * this.policy.rounding_minutes;
      overtimeHours = roundedMinutes / 60;
    }

    // Aplicar limite diário de horas extras
    const limitedOvertimeHours = Math.min(overtimeHours, this.policy.daily_limit_hours);
    
    // Categorizar horas extras por tipo de dia e horário
    let dayOvertimeHours = 0;
    let nightOvertimeHours = 0;
    let weekendOvertimeHours = 0;
    let holidayOvertimeHours = 0;
    
    if (limitedOvertimeHours > 0) {
      if (isHoliday) {
        holidayOvertimeHours = limitedOvertimeHours; // Feriados têm prioridade sobre fins de semana
      } else if (isWeekend) {
        weekendOvertimeHours = limitedOvertimeHours; // Aplicar multiplicador de fim de semana
      } else {
        // Categorizar entre dia e noite apenas para dias normais
        const timeCategories = this.categorizeOvertimeByTime(entry, limitedOvertimeHours);
        dayOvertimeHours = timeCategories.dayOvertimeHours;
        nightOvertimeHours = timeCategories.nightOvertimeHours;
      }
    }
    
    // Calcular pagamentos (manter em cêntimos)
    const regularPay = regularHours * this.hourlyRateCents;
    const dayOvertimePay = dayOvertimeHours * this.hourlyRateCents * this.policy.day_multiplier;
    const nightOvertimePay = nightOvertimeHours * this.hourlyRateCents * this.policy.night_multiplier;
    const weekendOvertimePay = weekendOvertimeHours * this.hourlyRateCents * this.policy.weekend_multiplier;
    const holidayOvertimePay = holidayOvertimeHours * this.hourlyRateCents * this.policy.holiday_multiplier;
    
    const totalOvertimePay = dayOvertimePay + nightOvertimePay + weekendOvertimePay + holidayOvertimePay;
    const totalPay = regularPay + totalOvertimePay;
    
    return {
      date: entry.date,
      regularHours: Math.round(regularHours * 100) / 100, // Arredondar para 2 casas decimais
      workedHours: Math.round(totalHours * 100) / 100,
      overtimeHours: Math.round(limitedOvertimeHours * 100) / 100,
      dayOvertimeHours: Math.round(dayOvertimeHours * 100) / 100,
      nightOvertimeHours: Math.round(nightOvertimeHours * 100) / 100,
      weekendOvertimeHours: Math.round(weekendOvertimeHours * 100) / 100,
      holidayOvertimeHours: Math.round(holidayOvertimeHours * 100) / 100,
      isWeekend,
      isHoliday,
      holidayName: holiday?.name,
      totalPay: Math.round(totalPay), // Manter em cêntimos
      overtimePay: Math.round(totalOvertimePay) // Manter em cêntimos
    };
  }

  /**
   * Calcula horas extras para múltiplos dias
   */
  private calculateDailyOvertime(entries: TimesheetEntry[]): DailyOvertimeCalculation[] {
    return entries.map(entry => {
      return this.calculateSingleDayOvertime(entry);
    });
  }

  /**
   * Agrega cálculos diários num breakdown total
   */
  private aggregateOvertimeBreakdown(
    dailyCalculations: DailyOvertimeCalculation[],
    timesheetEntries: TimesheetEntry[]
  ): OvertimeBreakdown {
    const totals = dailyCalculations.reduce(
      (acc, day) => {
        return {
          totalOvertimeHours: acc.totalOvertimeHours + day.overtimeHours,
          dayOvertimeHours: acc.dayOvertimeHours + day.dayOvertimeHours,
          nightOvertimeHours: acc.nightOvertimeHours + day.nightOvertimeHours,
          weekendOvertimeHours: acc.weekendOvertimeHours + day.weekendOvertimeHours,
          holidayOvertimeHours: acc.holidayOvertimeHours + day.holidayOvertimeHours,
          totalOvertimePay: acc.totalOvertimePay + day.overtimePay
        };
      },
      {
        totalOvertimeHours: 0,
        dayOvertimeHours: 0,
        nightOvertimeHours: 0,
        weekendOvertimeHours: 0,
        holidayOvertimeHours: 0,
        totalOvertimePay: 0
      }
    );

    // Calcular pagamentos por categoria (manter em cêntimos)
    const dayOvertimePay = totals.dayOvertimeHours * this.hourlyRateCents * this.policy.day_multiplier;
    const nightOvertimePay = totals.nightOvertimeHours * this.hourlyRateCents * this.policy.night_multiplier;
    const weekendOvertimePay = totals.weekendOvertimeHours * this.hourlyRateCents * this.policy.weekend_multiplier;
    const holidayOvertimePay = totals.holidayOvertimeHours * this.hourlyRateCents * this.policy.holiday_multiplier;
    
    const totalOvertimeValue = dayOvertimePay + nightOvertimePay + weekendOvertimePay + holidayOvertimePay;

    // Validações e avisos
    const warnings = this.generateValidationWarnings(totals, dailyCalculations, timesheetEntries);

    return {
      totalOvertimeHours: totals.totalOvertimeHours,
      dayOvertimeHours: totals.dayOvertimeHours,
      nightOvertimeHours: totals.nightOvertimeHours,
      weekendOvertimeHours: totals.weekendOvertimeHours,
      holidayOvertimeHours: totals.holidayOvertimeHours,
      totalOvertimeValue,
      dayOvertimePay,
      nightOvertimePay,
      weekendOvertimePay,
      holidayOvertimePay,
      dailyBreakdown: dailyCalculations,
      warnings
    };
  }

  /**
   * Categoriza horas extras por período (diurno/noturno)
   */
  private categorizeOvertimeByTime(
    entry: TimesheetEntry,
    overtimeHours: number
  ): { dayOvertimeHours: number; nightOvertimeHours: number } {
    if (overtimeHours === 0) {
      return { dayOvertimeHours: 0, nightOvertimeHours: 0 };
    }

    const startTime = parseISO(`${entry.date}T${entry.startTime}`);
    let endTime = parseISO(`${entry.date}T${entry.endTime}`);
    
    // Se o horário de fim é menor que o de início, significa que cruza a meia-noite
    if (isBefore(endTime, startTime)) {
      endTime = addDays(endTime, 1);
    }
    
    const nightStart = parseISO(`${entry.date}T${this.policy.night_start_time}`);
    let nightEnd = parseISO(`${entry.date}T${this.policy.night_end_time}`);
    
    // Se night_end_time é menor que night_start_time, significa que o período noturno cruza a meia-noite
    if (isBefore(nightEnd, nightStart)) {
      nightEnd = addDays(nightEnd, 1);
    }

    // Simplificação: assumir que horas extras são sempre no final do turno
    const thresholdMinutes = this.policy.threshold_hours * 60;
    const totalMinutes = this.calculateWorkingMinutes(entry);
    const overtimeStartMinutes = thresholdMinutes;
    const overtimeEndMinutes = totalMinutes;
    
    const overtimeStartTime = addMinutes(startTime, overtimeStartMinutes);
    const overtimeEndTime = addMinutes(startTime, overtimeEndMinutes);

    // Calcular interseção com período noturno
    const nightOvertimeMinutes = this.calculateTimeIntersection(
      overtimeStartTime,
      overtimeEndTime,
      nightStart,
      nightEnd
    );

    const nightOvertimeHours = nightOvertimeMinutes / 60;
    const dayOvertimeHours = overtimeHours - nightOvertimeHours;

    return {
      dayOvertimeHours: Math.max(0, dayOvertimeHours),
      nightOvertimeHours: Math.max(0, nightOvertimeHours)
    };
  }

  /**
   * Calcula minutos de trabalho efetivos (excluindo pausas)
   */
  private calculateWorkingMinutes(entry: TimesheetEntry): number {
    // Validar se startTime e endTime existem
    if (!entry.startTime || !entry.endTime) {
      return 0;
    }
    
    const startTime = parseISO(`${entry.date}T${entry.startTime}`);
    let endTime = parseISO(`${entry.date}T${entry.endTime}`);
    
    // Se o horário de fim é menor que o de início, significa que cruza a meia-noite
    if (isBefore(endTime, startTime)) {
      endTime = addDays(endTime, 1);
    }
    
    const totalMinutes = differenceInMinutes(endTime, startTime);
    const breakMinutes = Math.max(0, entry.breakMinutes || 0); // Garantir que pausas não sejam negativas
    
    // Garantir que o resultado não seja negativo
    const workingMinutes = Math.max(0, totalMinutes - breakMinutes);
    
    return workingMinutes;
  }

  /**
   * Calcula interseção entre dois períodos de tempo
   */
  private calculateTimeIntersection(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): number {
    const intersectionStart = isAfter(start1, start2) ? start1 : start2;
    const intersectionEnd = isBefore(end1, end2) ? end1 : end2;
    
    if (isAfter(intersectionStart, intersectionEnd)) {
      return 0; // Sem interseção
    }
    
    return differenceInMinutes(intersectionEnd, intersectionStart);
  }

  /**
   * Verifica se uma data é fim de semana
   */
  private isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
  }

  /**
   * Obtém feriado para uma data específica
   */
  private getHolidayForDate(date: string): PayrollHoliday | undefined {
    return this.holidays.find(holiday => holiday.date === date && holiday.affects_overtime);
  }

  /**
   * Agrupa entradas por semana (segunda a domingo)
   */
  private groupEntriesByWeek(entries: TimesheetEntry[]): Array<{
    weekStart: string;
    weekEnd: string;
    entries: TimesheetEntry[];
  }> {
    const weeks = new Map<string, TimesheetEntry[]>();
    
    entries.forEach(entry => {
      const date = parseISO(entry.date);
      // Encontra a segunda-feira da semana
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Domingo = 0, então -6 dias
      const weekStart = addDays(date, daysToMonday);
      const weekEnd = addDays(weekStart, 6); // Domingo
      
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(entry);
    });
    
    return Array.from(weeks.entries()).map(([weekStartKey, entries]) => {
      const weekStart = parseISO(weekStartKey);
      const weekEnd = addDays(weekStart, 6);
      
      return {
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        entries: entries.sort((a, b) => a.date.localeCompare(b.date))
      };
    });
  }

  /**
   * Cria cálculo vazio para um dia
   */
  private createEmptyDayCalculation(date: string): DailyOvertimeCalculation {
    return {
      date,
      regularHours: 0,
      workedHours: 0,
      overtimeHours: 0,
      dayOvertimeHours: 0,
      nightOvertimeHours: 0,
      weekendOvertimeHours: 0,
      holidayOvertimeHours: 0,
      isWeekend: false,
      isHoliday: false,
      totalPay: 0,
      overtimePay: 0
    };
  }

  /**
   * Gera avisos de validação
   */
  private generateValidationWarnings(
    totals: OvertimeTotals,
    dailyCalculations: DailyOvertimeCalculation[],
    timesheetEntries: TimesheetEntry[]
  ): string[] {
    const warnings: string[] = [];

    // Verificar registros de horas em dias de férias ou licença
    if (timesheetEntries && timesheetEntries.length > 0) {
      timesheetEntries.forEach(entry => {
        // Verificar horários em falta
        if (!entry.startTime) {
          warnings.push(
            `Entrada em ${entry.date} tem horário de início em falta`
          );
        }
        if (!entry.endTime) {
          warnings.push(
            `Entrada em ${entry.date} tem horário de fim em falta`
          );
        }
        
        if (entry.isVacation) {
          warnings.push(
            `Entrada em ${entry.date} é dia de férias mas tem registo de horas`
          );
        }
        if (entry.isLeave) {
          warnings.push(
            `Entrada em ${entry.date} é dia de licença mas tem registo de horas`
          );
        }
      });
    }

    // Verificar limite anual
    if (totals.totalOvertimeHours > this.policy.annual_limit_hours) {
      warnings.push(
        `Limite anual de horas extras excedido: ${totals.totalOvertimeHours.toFixed(1)}h / ${this.policy.annual_limit_hours}h`
      );
    }

    // Verificar limite diário
    const daysExceedingDaily = dailyCalculations.filter(
      day => day.overtimeHours > this.policy.daily_limit_hours
    );
    if (daysExceedingDaily.length > 0) {
      warnings.push(
        `${daysExceedingDaily.length} dia(s) excedem o limite diário de ${this.policy.daily_limit_hours}h de horas extras`
      );
    }

    return warnings;
  }
}

/**
 * Factory function para criar instância do serviço
 */
export function createOvertimeExtractionService(
  hourlyRateCents: number,
  policy: PayrollOTPolicy,
  holidays: PayrollHoliday[] = []
): OvertimeExtractionService {
  if (hourlyRateCents <= 0) {
    throw new Error('Taxa horária deve ser maior que 0');
  }
  
  if (!policy || policy.threshold_hours <= 0) {
    throw new Error('Política de horas extras inválida: threshold_hours deve ser maior que 0');
  }
  
  return new OvertimeExtractionService(policy, holidays, hourlyRateCents);
}